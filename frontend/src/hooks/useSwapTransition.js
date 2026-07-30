import React from "react";

export function useSwapTransition(value, key, exitDuration = 120) {
  const [displayedValue, setDisplayedValue] = React.useState(value);
  const [phase, setPhase] = React.useState("entered");
  const displayedKeyRef = React.useRef(key);
  const frameRef = React.useRef(0);

  React.useEffect(() => {
    if (key === displayedKeyRef.current) return undefined;

    window.cancelAnimationFrame(frameRef.current);
    setPhase("exiting");

    const timeout = window.setTimeout(() => {
      setDisplayedValue(value);
      displayedKeyRef.current = key;
      setPhase("enter-start");
      frameRef.current = window.requestAnimationFrame(() => setPhase("entered"));
    }, exitDuration);

    return () => {
      window.clearTimeout(timeout);
      window.cancelAnimationFrame(frameRef.current);
    };
  }, [exitDuration, key, value]);

  React.useEffect(
    () => () => window.cancelAnimationFrame(frameRef.current),
    [],
  );

  return { displayedValue, phase };
}
