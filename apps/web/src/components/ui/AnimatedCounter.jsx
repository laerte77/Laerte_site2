import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';

export default function AnimatedCounter({ value, duration = 1.5, format = (v) => v }) {
  const [displayValue, setDisplayValue] = useState(0);
  const controls = useAnimation();

  useEffect(() => {
    let startTime;
    let animationFrame;
    const startValue = displayValue;
    const endValue = typeof value === 'number' ? value : parseFloat(value) || 0;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / (duration * 1000), 1);
      
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - percentage, 3);
      const currentVal = startValue + (endValue - startValue) * easeOut;
      
      setDisplayValue(currentVal);

      if (percentage < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <motion.span>{format(displayValue)}</motion.span>;
}