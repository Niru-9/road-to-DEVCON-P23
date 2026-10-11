import { useEffect, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import Canvas from "./components/Canvas";
import Palette from "./components/Palette";
import { pixelTurfAbi } from "./abi";
import { useSelectedChain } from "./useSelectedChain";
import { useCanvas } from "./hooks/useCanvas";
import { contractAddressFor, hasContractAddress } from "./wagmi";
import { SUPPORTED_CHAINS, getChainMeta, isSupportedChain } from "./chains";
import {
  DEFAULT_COOLDOWN_SECONDS,
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  colorName,
} from "./constants";

function shortAddr(a?: string): string {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function fmtCountdown(seconds: number): string {
  if (seconds <= 0) return "ready";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function App() {
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const { connect, connectors, isPending: connectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { selectedChainId, setSelectedChainId } = useSelectedChain();

  const selectedMeta = getChainMeta(selectedChainId);
  const canvasAddress = contractAddressFor(selectedChainId);
  const configured = canvasAddress !== undefined;
  const walletOnSelected = walletChainId === selectedChainId;
  const walletUnsupported = walletChainId !== undefined && !isSupportedChain(walletChainId);

  // Canvas dimensions and cooldown come from the contract (single source of
  // truth); local constants are only a pre-load fallback. Reads target the
  // selected chain's contract.
  const widthRead = useReadContract({
    address: canvasAddress,
    abi: pixelTurfAbi,
    functionName: "WIDTH",
    chainId: selectedChainId,
    query: { enabled: configured },
  });
  const heightRead = useReadContract({
    address: canvasAddress,
    abi: pixelTurfAbi,
    functionName: "HEIGHT",
    chainId: selectedChainId,
    query: { enabled: configured },
  });
  const cooldownRead = useReadContract({
    address: canvasAddress,
    abi: pixelTurfAbi,
    functionName: "PLACEMENT_COOLDOWN",
    chainId: selectedChainId,
    query: { enabled: configured },
  });

  const width = widthRead.data !== undefined ? Number(widthRead.data) : DEFAULT_WIDTH;
  const height = heightRead.data !== undefined ? Number(heightRead.data) : DEFAULT_HEIGHT;
  const cooldownSeconds =
    cooldownRead.data !== undefined ? Number(cooldownRead.data) : DEFAULT_COOLDOWN_SECONDS;

  const { tiles, loading, error } = useCanvas(selectedChainId);

  // The player's next-allowed time, read straight from the contract.
  const nextTime = useReadContract({
    address: canvasAddress,
    abi: pixelTurfAbi,
    functionName: "nextPlacementTime",
    args: address ? [address] : undefined,
    chainId: selectedChainId,
    query: { enabled: configured && !!address, refetchInterval: 4000 },
  });

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const nextTs = nextTime.data !== undefined ? Number(nextTime.data) : 0;
  const remaining = Math.max(0, nextTs - now);
  const cooldownReady = nextTs === 0 || remaining === 0;

  const [selectedColor, setSelectedColor] = useState(3); // red

  const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: txConfirming, isSuccess: txSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: selectedChainId,
  });

  useEffect(() => {
    if (txSuccess) nextTime.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txSuccess, txHash]);

  // Writes require a connected wallet on the selected chain AND a configured
  // address for that chain.
  const canPlace =
    isConnected && walletOnSelected && configured && cooldownReady && !isPending && !txConfirming;

  function place(x: number, y: number) {
    if (!canPlace || !canvasAddress) return;
    reset();
    writeContract({
      address: canvasAddress,
      abi: pixelTurfAbi,
      functionName: "placeTile",
      args: [x, y, selectedColor],
      chainId: selectedChainId,
    });
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>Pixel Turf</h1>
        <span className="subtitle">
          A shared canvas nobody can wipe · {selectedMeta ? selectedMeta.name : "Unknown network"}
        </span>
        <div className="wallet">
          {isConnected ? (
            <>
              <span className="pill">{shortAddr(address)}</span>
              <button onClick={() => disconnect()}>Disconnect</button>
            </>
          ) : (
            <button disabled={connectPending} onClick={() => connect({ connector: connectors[0] })}>
              Connect MetaMask
            </button>
          )}
        </div>
      </header>

      <div className="network-picker">
        <span className="muted">Network:</span>
        {SUPPORTED_CHAINS.map((c) => (
          <button
            key={c.id}
            className={c.id === selectedChainId ? "net active" : "net"}
            onClick={() => setSelectedChainId(c.id)}
          >
            {c.name}
            {hasContractAddress(c.id) ? "" : " — not configured"}
          </button>
        ))}
      </div>

      {isConnected && walletUnsupported && (
        <div className="banner warn">
          Your wallet is on an unsupported network (chain {walletChainId}).{" "}
          <button onClick={() => switchChain({ chainId: selectedChainId })}>
            Switch to {selectedMeta ? selectedMeta.name : "the selected network"}
          </button>
        </div>
      )}

      {isConnected && !walletUnsupported && !walletOnSelected && (
        <div className="banner warn">
          Your wallet is on chain {walletChainId}, but the app is set to{" "}
          {selectedMeta ? selectedMeta.name : "another network"} (chain {selectedChainId}).{" "}
          <button onClick={() => switchChain({ chainId: selectedChainId })}>
            Switch wallet to {selectedMeta ? selectedMeta.shortName : "the selected network"}
          </button>
        </div>
      )}

      {!configured && selectedMeta && (
        <div className="banner warn">
          Not deployed/configured on {selectedMeta.name}. Set{" "}
          <code>{selectedMeta.addressEnv}</code> in <code>frontend/.env</code> to a deployed
          PixelTurf address on {selectedMeta.name} (chain {selectedMeta.id}). Addresses are
          per network and are never shared.
        </div>
      )}

      <section className="panel">
        <h2>
          Canvas <span className="muted">{width} × {height} = {width * height} tiles</span>
        </h2>

        <div className="canvas-wrap">
          <Canvas
            width={width}
            height={height}
            tiles={tiles}
            canPlace={canPlace}
            onPlace={place}
            previewColor={selectedColor}
          />
          {!canPlace && (
            <div className="overlay">
              {!isConnected
                ? "Connect MetaMask to paint"
                : walletUnsupported
                  ? "Wallet is on an unsupported network"
                  : !walletOnSelected
                    ? `Switch wallet to ${selectedMeta ? selectedMeta.name : "the selected network"} to paint`
                    : !configured
                      ? `Not configured on ${selectedMeta ? selectedMeta.name : "this network"}`
                      : "On cooldown — wait for the timer"}
            </div>
          )}
        </div>

        <p className="muted paint-note">
          One tile per click — each placement is a single transaction (one wallet
          confirmation). The per-wallet cooldown is what keeps the canvas
          wipe-proof and fair, so there is deliberately no batch / multi-tile
          path: nobody can paint faster than anyone else.
        </p>

        <div className="toolbar">
          <Palette selected={selectedColor} onSelect={setSelectedColor} disabled={!canPlace} />
          <span className="muted">
            Selected: <b>{colorName(selectedColor)}</b> (#{selectedColor})
          </span>
        </div>

        <div className="statusline">
          <span>
            Cooldown (from contract):{" "}
            <b>{configured ? fmtCountdown(remaining) : "—"}</b>
            {configured && cooldownSeconds > 0 ? ` (${cooldownSeconds}s per tile)` : ""}
          </span>
          <span className="muted">
            {loading ? "Loading canvas from chain logs…" : `Tiles on canvas: ${tiles.size}`}
          </span>
        </div>

        {error && <p className="error">Log load failed: {error}</p>}
        {(isPending || txConfirming) && <p className="muted">Submitting placement…</p>}
        {txHash && <p className="muted">Tx: {shortAddr(txHash)}</p>}
        {writeError && <p className="error">{writeError.message.split("\n")[0]}</p>}
      </section>

      <footer className="foot">
        <span>
          Network: {selectedMeta ? `${selectedMeta.name} (${selectedMeta.id})` : "unknown"} ·
          Contract: {configured ? shortAddr(canvasAddress) : "not configured on this network"}
        </span>
      </footer>
    </div>
  );
}
