import React from "react";
import { useSwapTransition } from "../../hooks/useSwapTransition.js";

export function SwapText({ value, className = "" }) {
  const { displayedValue, phase } = useSwapTransition(value, value);

  return (
    <span
      className={`inline-block transition-[opacity,transform] ease-standard motion-reduce:translate-y-0 motion-reduce:duration-fast ${
        phase === "entered"
          ? "translate-y-0 opacity-100 duration-base"
          : phase === "enter-start"
            ? "translate-y-1 opacity-0 duration-0"
            : "-translate-y-1 opacity-0 duration-fast"
      } ${className}`}
    >
      {displayedValue}
    </span>
  );
}
