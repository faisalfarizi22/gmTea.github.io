import { useState, useEffect } from 'react';

let isDBMode = true; 

export function useDBMode() {
  const [dbMode, setDBMode] = useState<boolean>(isDBMode);

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


export function isUsingDBMode(): boolean {
  return isDBMode;
}

export default useDBMode;