import React from "react";
import {
  initialCursorState,
  moveNext,
  movePrevious,
  pageRange,
} from "../lib/cursor-pagination.js";

export function useCursorTable({
  fetchPage,
  filters = {},
  initialSortKey,
  initialSortDir = "desc",
  initialPageSize = 20,
}) {
  const [rows, setRows] = React.useState([]);
  const [cursorState, setCursorState] = React.useState(initialCursorState);
  const [nextCursor, setNextCursor] = React.useState("");
  const [hasNextPage, setHasNextPage] = React.useState(false);
  const [sortKey, setSortKey] = React.useState(initialSortKey);
  const [sortDir, setSortDir] = React.useState(initialSortDir);
  const [pageSize, setPageSizeState] = React.useState(initialPageSize);
  const [loading, setLoading] = React.useState(true);
  const [hasSettled, setHasSettled] = React.useState(false);
  const [error, setError] = React.useState(null);

  const fetchPageRef = React.useRef(fetchPage);
  const filtersRef = React.useRef(filters);
  const queryRef = React.useRef({ sortKey, sortDir, pageSize });
  const cursorStateRef = React.useRef(cursorState);
  const loadingRef = React.useRef(true);
  const requestRef = React.useRef({ id: 0, controller: null });

  fetchPageRef.current = fetchPage;
  filtersRef.current = filters;
  queryRef.current = { sortKey, sortDir, pageSize };
  cursorStateRef.current = cursorState;

  const runRequest = React.useCallback(async (targetState, { fallbackOnEmpty = true, resetInvalidCursor = true } = {}) => {
    requestRef.current.controller?.abort();
    const controller = new AbortController();
    const requestId = requestRef.current.id + 1;
    requestRef.current = { id: requestId, controller };
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const query = queryRef.current;
      const page = await fetchPageRef.current({
        ...filtersRef.current,
        limit: query.pageSize,
        sort: query.sortKey,
        dir: query.sortDir,
        cursor: targetState.cursor,
        signal: controller.signal,
      });
      if (requestRef.current.id !== requestId) return null;

      const items = Array.isArray(page?.items) ? page.items : [];
      if (items.length === 0 && targetState.previous.length > 0 && fallbackOnEmpty) {
        return runRequest(movePrevious(targetState), { fallbackOnEmpty: false, resetInvalidCursor });
      }

      cursorStateRef.current = targetState;
      setCursorState(targetState);
      setRows(items);
      setNextCursor(page?.nextCursor || "");
      setHasNextPage(page?.hasNextPage === true);
      setHasSettled(true);
      return page;
    } catch (requestError) {
      if (requestRef.current.id !== requestId || requestError?.name === "AbortError") return null;
      if (requestError?.code === "INVALID_CURSOR" && targetState.cursor && resetInvalidCursor) {
        return runRequest(initialCursorState(), { fallbackOnEmpty: false, resetInvalidCursor: false });
      }
      setError(requestError);
      return null;
    } finally {
      if (requestRef.current.id === requestId) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, []);

  const queryKey = JSON.stringify({ filters, sortKey, sortDir, pageSize });
  React.useEffect(() => {
    const initial = initialCursorState();
    cursorStateRef.current = initial;
    setCursorState(initial);
    setNextCursor("");
    setHasNextPage(false);
    runRequest(initial, { fallbackOnEmpty: false });
  }, [queryKey, runRequest]);

  React.useEffect(() => () => {
    requestRef.current.id += 1;
    requestRef.current.controller?.abort();
  }, []);

  const next = React.useCallback(() => {
    if (loadingRef.current || !nextCursor) return Promise.resolve(null);
    return runRequest(moveNext(cursorStateRef.current, nextCursor));
  }, [nextCursor, runRequest]);

  const previous = React.useCallback(() => {
    if (loadingRef.current || cursorStateRef.current.previous.length === 0) return Promise.resolve(null);
    return runRequest(movePrevious(cursorStateRef.current), { fallbackOnEmpty: false });
  }, [runRequest]);

  const sortBy = React.useCallback((key) => {
    if (!key) return;
    if (key === sortKey) {
      setSortDir((current) => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }, [sortKey]);

  const setPageSize = React.useCallback((size) => {
    const normalized = Number(size);
    if (normalized > 0) setPageSizeState(normalized);
  }, []);

  const retry = React.useCallback(() => runRequest(cursorStateRef.current), [runRequest]);
  const refresh = React.useCallback(() => runRequest(cursorStateRef.current), [runRequest]);
  const range = React.useMemo(
    () => pageRange(cursorState.previous.length, pageSize, rows.length),
    [cursorState.previous.length, pageSize, rows.length],
  );

  return {
    rows,
    sortKey,
    sortDir,
    pageSize,
    range,
    isInitialLoading: loading && !hasSettled,
    isUpdating: loading && hasSettled,
    loading,
    error,
    canPrevious: !loading && cursorState.previous.length > 0,
    canNext: !loading && hasNextPage && Boolean(nextCursor),
    sortBy,
    next,
    previous,
    setPageSize,
    retry,
    refresh,
  };
}
