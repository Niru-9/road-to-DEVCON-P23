// Dual-network chain registry for the Pixel Turf front end.
//
// Pure data + pure helpers: no React, no wagmi, no browser APIs, so it can be
// unit-tested directly (see test/chains.test.ts).
//
// The same PixelTurf bytecode works on either network when deployed there.
// Contract addresses (and deploy blocks) are configured PER CHAIN and are never
// shared: resolveAddress() returns "" for a chain with no configured address and
// never falls back to another chain's address.

export const CHAIN_IDS = {
  ethereumSepolia: 11155111,
  baseSepolia: 84532,
} as const;

export type SupportedChainId = (typeof CHAIN_IDS)[keyof typeof CHAIN_IDS];

export type EnvRecord = Record<string, string | undefined>;

export interface ChainMeta {
  id: SupportedChainId;
  /** Full network name shown in the UI. */
  name: string;
  /** Short label used in buttons and banners. */
  shortName: string;
  /** Env var holding this chain's RPC URL. */
  rpcEnv: string;
  /** Env var holding this chain's deployed contract address. */
  addressEnv: string;
  /** Env var holding this chain's contract deploy block (for log scans). */
  deployBlockEnv: string;
  /** Block explorer base URL (no trailing slash). */
  explorer: string;
  /** Public RPC used when the per-chain env var is empty. */
  defaultRpc: string;
}

// Ethereum Sepolia is our only deployment + manual-verification target and the
// default. Base Sepolia is supported/configurable for a separate deployment by
// someone who has Base Sepolia test ETH; we have NOT deployed to or verified it.
export const SUPPORTED_CHAINS: ChainMeta[] = [
  {
    id: CHAIN_IDS.ethereumSepolia,
    name: "Ethereum Sepolia",
    shortName: "Sepolia",
    rpcEnv: "VITE_SEPOLIA_RPC_URL",
    addressEnv: "VITE_SEPOLIA_CANVAS_ADDRESS",
    deployBlockEnv: "VITE_SEPOLIA_DEPLOY_BLOCK",
    explorer: "https://sepolia.etherscan.io",
    defaultRpc: "https://ethereum-sepolia-rpc.publicnode.com",
  },
  {
    id: CHAIN_IDS.baseSepolia,
    name: "Base Sepolia",
    shortName: "Base Sepolia",
    rpcEnv: "VITE_BASE_SEPOLIA_RPC_URL",
    addressEnv: "VITE_BASE_SEPOLIA_CANVAS_ADDRESS",
    deployBlockEnv: "VITE_BASE_SEPOLIA_DEPLOY_BLOCK",
    explorer: "https://sepolia.basescan.org",
    defaultRpc: "https://sepolia.base.org",
  },
];

export const DEFAULT_CHAIN_ID: SupportedChainId = CHAIN_IDS.ethereumSepolia;

export function getChainMeta(id: number): ChainMeta | undefined {
  return SUPPORTED_CHAINS.find((c) => c.id === id);
}

export function isSupportedChain(id: number | undefined | null): id is SupportedChainId {
  return id !== undefined && id !== null && getChainMeta(id) !== undefined;
}

export function isContractAddress(value: string | undefined | null): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test((value ?? "").trim());
}

function envValue(env: EnvRecord, name: string): string {
  const raw = env[name];
  return raw === undefined || raw === null ? "" : String(raw).trim();
}

/**
 * Resolve the deployed contract address for one specific chain.
 * Returns "" when that chain has no configured address. It never falls back to
 * another chain's address, so one network can never silently use another's
 * deployment.
 */
export function resolveAddress(id: number, env: EnvRecord): string {
  const meta = getChainMeta(id);
  if (!meta) return "";
  const value = envValue(env, meta.addressEnv);
  return isContractAddress(value) ? value : "";
}

export function hasAddress(id: number, env: EnvRecord): boolean {
  return resolveAddress(id, env) !== "";
}

/**
 * Resolve the RPC URL for one chain, falling back to that chain's own public
 * default. Never returns another chain's endpoint.
 */
export function resolveRpcUrl(id: number, env: EnvRecord): string {
  const meta = getChainMeta(id);
  if (!meta) return "";
  const value = envValue(env, meta.rpcEnv);
  return value !== "" ? value : meta.defaultRpc;
}

/**
 * Resolve the deploy block for one chain (used to bound the initial log scan).
 * Returns 0 when unset/unparseable, meaning "scan from genesis".
 */
export function resolveDeployBlock(id: number, env: EnvRecord): number {
  const meta = getChainMeta(id);
  if (!meta) return 0;
  const raw = envValue(env, meta.deployBlockEnv);
  if (raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

/** A write is only safe when the wallet's chain equals the app's selected chain. */
export function walletMatchesSelected(
  walletChainId: number | undefined | null,
  selectedChainId: number,
): boolean {
  return walletChainId === selectedChainId;
}

export interface TransactGuards {
  isConnected: boolean;
  walletChainId?: number;
  selectedChainId: number;
  env: EnvRecord;
}

/**
 * True only when a transaction can safely be sent: a wallet is connected, that
 * wallet is on the selected chain, and the selected chain has a configured
 * contract address.
 */
export function canTransact(g: TransactGuards): boolean {
  return (
    g.isConnected &&
    walletMatchesSelected(g.walletChainId, g.selectedChainId) &&
    hasAddress(g.selectedChainId, g.env)
  );
}
