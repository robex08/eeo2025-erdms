import React, { createContext, useState, useCallback } from 'react';

export const ProgressContext = createContext({
  progress: 0,
  setProgress: () => {},
  start: () => {},
  done: () => {},
  fail: () => {},
  active: false,
  failed: false,
  transitionMs: 250,
  visible: false,
  reset: () => {},
});

export function ProgressProvider({ children }) {
  const [progress, setProgressInternal] = useState(0);
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);
  const failedRef = React.useRef(false);
  const [transitionMs, setTransitionMs] = useState(250);
  const [visible, setVisible] = useState(false);
  const [hiding, setHiding] = useState(false);
  // Refs to keep track of timers so we can cancel on new calls / unmount
  const hideTimerRef = React.useRef(null);
  const finishTimerRef = React.useRef(null);
  const safetyTimerRef = React.useRef(null);

  const clearTimers = useCallback(() => {
    try { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); } catch {}
    try { if (finishTimerRef.current) clearTimeout(finishTimerRef.current); } catch {}
    try { if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current); } catch {}
    hideTimerRef.current = null; finishTimerRef.current = null; safetyTimerRef.current = null;
  }, []);

  const hideBar = useCallback((delay = 0) => {
    clearTimers();

    hideTimerRef.current = setTimeout(() => {
      // start hiding animation
      setHiding(true);

      // After CSS fade (~360ms) fully reset
      finishTimerRef.current = setTimeout(() => {
        setActive(false);
        setVisible(false);
        setHiding(false);
        setProgressInternal(0);
        setFailed(false);
        failedRef.current = false;
        setTransitionMs(250);
        clearTimers();

      }, 360);
    }, delay);
  }, [clearTimers]);

  const setProgress = useCallback((val) => {
    // If we were in a failed state, clear it — a new progress update should restart the normal (green) progress
    if (failedRef.current) {
      failedRef.current = false;
      try { setFailed(false); } catch {}
    }
    setActive(true); setVisible(true); setHiding(false);
    setTransitionMs(250);
    // Coerce to finite number to avoid NaN/invalid widths in the UI
    const num = Number(val);
    setProgressInternal(Number.isFinite(num) ? num : 0);
    if (val >= 100) {
      // success finish
      hideBar(300); // short hold before fade-out
    }
  }, [hideBar]);

  const start = useCallback(() => {
    // If a new operation starts, cancel any pending hide/safety timers and allow progress updates again
    try { clearTimers(); } catch {}
    failedRef.current = false;
    setActive(true);
    setVisible(true);
    setHiding(false);
    setProgressInternal(0);
    setFailed(false);
    setTransitionMs(250);
  }, [clearTimers]);
  const done = useCallback(() => setProgress(100), [setProgress]);
  const fail = useCallback(() => {
    // Start / ensure visible
    setActive(true); setVisible(true); setHiding(false);
    setFailed(true);
    failedRef.current = true;
  // longer red finish and robust hide scheduling
  // slow the finish so the red dojezd is more visible (gentle tempo)
  setTransitionMs(1400);
    // ensure progress moves so animation is visible
    setProgressInternal(prev => {
      if (prev < 10) return 10;
      if (prev > 95) return 95;
      return prev;
    });
    // Push update to 100% in next frame so CSS transition runs
    requestAnimationFrame(() => setProgressInternal(100));
  // Schedule hide after the transition + short hold
    const animDur = 1400; const hold = 400; // slower, more noticeable red dojezd

    hideBar(animDur + hold);
    // Safety fallback: schedule a hard reset after a longer timeout as a last resort
    try { if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current); } catch {}
    safetyTimerRef.current = setTimeout(() => {
      // Force reset if still visible
      setActive(false); setVisible(false); setHiding(false); setProgressInternal(0); setFailed(false); setTransitionMs(250); failedRef.current = false;

    }, animDur + hold + 2000);
  }, [hideBar]);

  const reset = useCallback(() => {
    clearTimers();
    setActive(false);
    setVisible(false);
    setHiding(false);
    setFailed(false);
    failedRef.current = false;
    setProgressInternal(0);
    setTransitionMs(250);
  }, []);

  // cleanup on unmount
  React.useEffect(() => {
    return () => { clearTimers(); };
  }, [clearTimers]);

  return (
    <ProgressContext.Provider value={{ progress, setProgress, start, done, fail, active, failed, transitionMs, visible, hiding, reset }}>
      {children}
    </ProgressContext.Provider>
  );
}
