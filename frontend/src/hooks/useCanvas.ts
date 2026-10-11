import { useCallback, useEffect, useRef, useState } from "react";
import { parseAbiItem } from "viem";
import { contractAddressFor, publicClientFor } from "../wagmi";
import { resolveDeployBlock, type EnvRecord } from "../chains";

const env = import.meta.env as unknown as EnvRecord;

const tilePlacedEvent = parseAbiItem(
  "event TilePlaced(address indexed player, uint256 indexed index, uint16 x, uint16 y, uint8 color)",
);

// Recurring poll for new placements, so an open page updates without a reload.
const POLL_MS = 6000;
// Max block span per getLogs call, so a large history does not exceed a
// provider's range limit. This is a batched/region read, never one read per tile.
const BLOCK_RANGE = 10_000n;

export interface CanvasState {
  tiles: Map<number, number>;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Rebuilds the whole canvas for one chain from `TilePlaced` event logs.
 *
 * - Initial load: batched block-range `getLogs` over [deployBlock, latest],
 *   folded into a Map<packedIndex, color>. No per-tile contract reads.
 * - Live updates: every POLL_MS it fetches only the new block range and merges.
 *
 * The address, deploy block and client are all resolved for `chainId` alone, so
 * one network never reads another network's contract.
 */
export function useCanvas(chainId: number): CanvasState {
  const [tiles, setTiles] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  const nextBlock = useRef<bigint>(0n);

  useEffect(() => {
    const address = contractAddressFor(chainId);
    const client = publicClientFor(chainId);
    if (!address || !client) {
      setTiles(new Map());
      return;
    }

    let cancelled = false;
    const deployBlock = resolveDeployBlock(chainId, env);
    nextBlock.current = BigInt(deployBlock);

    const fetchRange = async (from: bigint, to: bigint) => {
      const logs = await client.getLogs({
        address,
        event: tilePlacedEvent,
        fromBlock: from,
        toBlock: to,
      });
      if (cancelled || logs.length === 0) return;
      setTiles((prev) => {
        const next = new Map(prev);
        for (const log of logs) {
          const index = Number(log.args.index);
          const color = Number(log.args.color);
          if (Number.isFinite(index) && Number.isFinite(color)) next.set(index, color);
        }
        return next;
      });
    };

    const initialLoad = async () => {
      setLoading(true);
      setError(null);
      try {
        const latest = await client.getBlockNumber();
        let from = nextBlock.current;
        while (from <= latest) {
          const to = from + BLOCK_RANGE - 1n > latest ? latest : from + BLOCK_RANGE - 1n;
          await fetchRange(from, to);
          from = to + 1n;
        }
        nextBlock.current = latest + 1n;
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const poll = async () => {
      try {
        const latest = await client.getBlockNumber();
        if (latest >= nextBlock.current) {
          await fetchRange(nextBlock.current, latest);
          nextBlock.current = latest + 1n;
        }
      } catch {
        // Transient RPC error; the next tick retries.
      }
    };

    void initialLoad();
    const timer = setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [chainId, reloadCount]);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);

  return { tiles, loading, error, reload };
}
