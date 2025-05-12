// src/hooks/useDBMode.ts
import { useState, useEffect } from 'react';

let isDBMode = true; 

/**
 * Hook untuk mengatur dan mendapatkan status Database Mode
 */
export function useDBMode() {
  const [dbMode, setDBMode] = useState<boolean>(isDBMode);

  // Update global flag saat state berubah
  useEffect(() => {
    isDBMode = dbMode;
  }, [dbMode]);

  const enableDBMode = () => setDBMode(true);
  const disableDBMode = () => setDBMode(false);
  const toggleDBMode = () => setDBMode(!dbMode);

  return {
    dbMode,
    enableDBMode,
    disableDBMode,
    toggleDBMode
  };
}

/**
 * Fungsi untuk memeriksa apakah mode DB aktif
 */
export function isUsingDBMode(): boolean {
  return isDBMode;
}

export default useDBMode;