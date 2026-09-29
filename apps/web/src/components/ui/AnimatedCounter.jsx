import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function AnimatedCounter({
  value,
  duration = 1.5,
  format = (v) => v
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const endValue =
      typeof value === 'number'
        ? value
        : parseFloat(value) || 0;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      setDisplayValue(endValue);
      return;
    }

    let startTime = null;
    let animationFrame = null;

    const startValue = displayValue;

    const animate = (timestamp) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const progress = Math.min(
        elapsed / (duration * 1000),
        1
      );

      // Ease-out cubic: começa mais rápido e desacelera suavemente.
      const easedProgress =
        1 - Math.pow(1 - progress, 3);

      const currentValue =
        startValue +
        (endValue - startValue) * easedProgress;

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);

  return (
    <motion.span
      aria-live="polite"
      aria-atomic="true"
    >
      {format(displayValue)}
    </motion.span>
  );
}
