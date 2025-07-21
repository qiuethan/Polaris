import { useState, useEffect } from 'react';

const STORAGE_KEY = 'simple_stats';

function safeParseStats(raw) {
  try {
    const obj = JSON.parse(raw);
    if (typeof obj !== 'object' || obj === null) throw new Error();
    // Only allow numeric values
    for (const key in obj) {
      if (typeof obj[key] !== 'number') throw new Error();
    }
    return obj;
  } catch {
    // Corrupted or malicious data, reset
    return {};
  }
}

export default function useSimpleStats() {
  const [stats, setStats] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? safeParseStats(raw) : {};
  });

  useEffect(() => {
    const serialized = JSON.stringify(stats);
    localStorage.setItem(STORAGE_KEY, serialized);
  }, [stats]);

  return [stats, setStats];
}