import { useEffect, useRef, useState } from 'react';

/**
 * Animate a number from its current displayed value to a new target.
 *
 * Design system mandate: "Number animations: 250ms duration via
 * requestAnimationFrame. Snap to final value when prefers-reduced-motion
 * is set."
 */
export function useAnimatedNumber(target: number, duration = 250): number {
  const [displayed, setDisplayed] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;

    if (from === target) return;

    // Respect prefers-reduced-motion: snap via rAF (async) to avoid synchronous setState
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      rafRef.current = requestAnimationFrame(() => setDisplayed(target));
      return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
    }

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      setDisplayed(from + (target - from) * t);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, duration]);

  return displayed;
}
