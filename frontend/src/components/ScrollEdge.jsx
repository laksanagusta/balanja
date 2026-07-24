import React from "react";
import { getScrollEdgeState } from "./scroll-edge.js";

const INITIAL_EDGES = { inlineStart: false, inlineEnd: false };

export function ScrollEdge({ children, className = "" }) {
  const viewportRef = React.useRef(null);
  const [edges, setEdges] = React.useState(INITIAL_EDGES);

  const measure = React.useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const next = getScrollEdgeState(viewport);
    setEdges((current) => (
      current.inlineStart === next.inlineStart && current.inlineEnd === next.inlineEnd
        ? current
        : next
    ));
  }, []);

  React.useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    measure();
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(measure);
    observer?.observe(viewport);
    if (viewport.firstElementChild) observer?.observe(viewport.firstElementChild);
    window.addEventListener("resize", measure);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  return (
    <div className={`scroll-edge relative min-w-0 ${className}`}>
      <div
        ref={viewportRef}
        className="scroll-edge-viewport w-full overflow-x-auto"
        onScroll={measure}
      >
        {children}
      </div>
      <span
        aria-hidden="true"
        data-scroll-edge="inline-start"
        data-visible={edges.inlineStart ? "true" : "false"}
        className="scroll-edge-overlay scroll-edge-overlay-start"
      />
      <span
        aria-hidden="true"
        data-scroll-edge="inline-end"
        data-visible={edges.inlineEnd ? "true" : "false"}
        className="scroll-edge-overlay scroll-edge-overlay-end"
      />
    </div>
  );
}
