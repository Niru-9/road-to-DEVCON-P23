import { createPublicClient, http } from "viem";
import { createConfig } from "wagmi";
import { baseSepolia, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { type EnvRecord, resolveAddress, resolveRpcUrl } from "./chains";

const env = import.meta.env as unknown as EnvRecord;

// Both networks are configured, each with its own RPC transport. Ethereum
// Sepolia is listed first, so it is the default chain when no wallet is
// connected.
export const wagmiConfig = createConfig({
  chains: [sepolia, baseSepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(resolveRpcUrl(sepolia.id, env)),
    [baseSepolia.id]: http(resolveRpcUrl(baseSepolia.id, env)),
  },
});

// Standalone read clients, one per chain, so the full canvas can be rebuilt from
// chain logs for the selected chain even before a wallet is connected.
export const sepoliaPublicClient = createPublicClient({
  chain: sepolia,
  transport: http(resolveRpcUrl(sepolia.id, env)),
});

export const baseSepoliaPublicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(resolveRpcUrl(baseSepolia.id, env)),
});

/** The read client for one chain, or undefined for an unsupported chain. */
export function publicClientFor(chainId: number) {
  if (chainId === sepolia.id) return sepoliaPublicClient;
  if (chainId === baseSepolia.id) return baseSepoliaPublicClient;
  return undefined;
}

/**
 * The deployed PixelTurf address for one chain, resolved strictly from that
 * chain's own env var. Returns undefined when that chain has no address, so the
 * UI can show a "not configured on this network" state rather than using a
 * different chain's deployment.
 */
export function contractAddressFor(chainId: number): `0x${string}` | undefined {
  const value = resolveAddress(chainId, env);
  return value === "" ? undefined : (value as `0x${string}`);
}

export function hasContractAddress(chainId: number): boolean {
  return resolveAddress(chainId, env) !== "";
}
