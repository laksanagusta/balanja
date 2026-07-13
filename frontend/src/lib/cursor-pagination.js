export function initialCursorState() {
  return { cursor: "", previous: [] };
}

export function resetCursorState() {
  return initialCursorState();
}

export function moveNext(state, nextCursor) {
  if (!nextCursor) return state;
  return { cursor: nextCursor, previous: [...state.previous, state.cursor] };
}

export function movePrevious(state) {
  if (!state.previous.length) return state;
  return {
    cursor: state.previous[state.previous.length - 1],
    previous: state.previous.slice(0, -1),
  };
}

export function pageRange(previousCount, pageSize, rowCount) {
  if (!rowCount) return { start: 0, end: 0, page: previousCount + 1 };
  const start = previousCount * pageSize + 1;
  return { start, end: start + rowCount - 1, page: previousCount + 1 };
}
