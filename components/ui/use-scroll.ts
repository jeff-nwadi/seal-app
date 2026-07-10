'use client';
import { useEffect, useState } from 'react';

/**
 * Returns true when the page has been scrolled more than `threshold` pixels.
 */
export function useScroll(threshold = 0): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > threshold);
    };

    // Check initial position
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return scrolled;
}
