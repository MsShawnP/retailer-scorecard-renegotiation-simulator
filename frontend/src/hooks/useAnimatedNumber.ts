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

    // Respect prefers-reduced-motion: snap immediately
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayed(target);
      return;
    }

    // If no change, skip animation
    if (from === target) {
      setDisplayed(target);
      return;
    }

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // Linear interpolation
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
