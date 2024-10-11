import { useRef } from "react";
import { useCallback, useEffect, useState } from 'react';
export const useHash = () => {
  const hashId = useRef('');
  const hashNewUrl = useRef<string | undefined>();
  const handler = useCallback(() => {
    const h = window.location.hash.substring(1).split('=');
    hashId.current = h[0];
    hashNewUrl.current = h.slice(1).join('='); // in case the url contains a colon i need to join the rest of the array
  }, []);
  useEffect(() => {
    handler(); // run the handler on mount to set the initial state

    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return {
    hashId: hashId.current,
    hashNewUrl: hashNewUrl.current
  };
};