import { useState, useEffect, useRef, useCallback } from "react";

export default function useCountdown(initialSeconds, onComplete) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const reset = useCallback((newInitial) => {
    startedRef.current = newInitial > 0;
    completedRef.current = false;
    setSeconds(newInitial);
  }, []);

  const stop = useCallback(() => {
    completedRef.current = true;
    setSeconds(0);
  }, []);

  useEffect(() => {
    if (seconds <= 0) {
      if (startedRef.current && !completedRef.current) {
        completedRef.current = true;
        if (onCompleteRef.current) onCompleteRef.current();
      }
      return;
    }

    startedRef.current = true;

    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [seconds]);

  const formatTime = useCallback((s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  return {
    seconds,
    isExpired: seconds <= 0,
    reset,
    stop,
    formatTime: formatTime(seconds),
  };
}
