'use client';

import { useEffect } from 'react';

/** Public pages start the model transfer while the visitor explores the site. */
export default function GloireWarmup() {
  useEffect(() => {
    void import('./gloire-preload').then(module => module.warmGloire()).catch(() => {});
  }, []);
  return null;
}
