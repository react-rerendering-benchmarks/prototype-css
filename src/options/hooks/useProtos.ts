import { useRef } from "react";
import { useEffect, useState } from 'react';
import { CSSProto } from '../../types';
export const useProtos = () => {
  // detect chrome.storage.local change callback

  const protos = useRef<CSSProto[]>([]);
  useEffect(() => {
    // get protos from storage
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName == 'local' && changes['css-protos']) {
        protos.current = changes.protos.newValue;
      }
    });
  }, []);
  return protos.current;
};