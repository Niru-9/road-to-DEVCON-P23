import { useCallback, useState } from "react";
import { DEFAULT_CHAIN_ID, isSupportedChain, type SupportedChainId } from "./chains";

// The app-level network selection, persisted across reloads. Ethereum Sepolia
// is the default; Base Sepolia is selectable for a deployment someone else may
// have made there.
const STORAGE_KEY = "pt.selectedChainId";

function readStored(): SupportedChainId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw === null ? NaN : Number(raw);
    return isSupportedChain(parsed) ? parsed : DEFAULT_CHAIN_ID;
  } catch {
    return DEFAULT_CHAIN_ID;
  }
}

export function useSelectedChain() {
  const [selectedChainId, setState] = useState<SupportedChainId>(readStored);

  const setSelectedChainId = useCallback((id: number) => {
    if (!isSupportedChain(id)) return;
    setState(id);
    try {
      localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      /* ignore unavailable storage */
    }
  }, []);

  return { selectedChainId, setSelectedChainId };
}
