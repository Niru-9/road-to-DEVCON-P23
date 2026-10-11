// Fallback canvas constants. These MUST match the contract's compiled constants;
// the app reads WIDTH / HEIGHT / PLACEMENT_COOLDOWN from the contract at runtime
// and only uses these before the first chain read resolves.

export const DEFAULT_WIDTH = 32;
export const DEFAULT_HEIGHT = 32;

// Must match the contract's PLACEMENT_COOLDOWN (seconds). Used only as an
// initial display value; the real value is read from the contract.
export const DEFAULT_COOLDOWN_SECONDS = 10;

// The per-chain deploy block (used to bound the initial placement-log scan) is
// resolved from VITE_SEPOLIA_DEPLOY_BLOCK / VITE_BASE_SEPOLIA_DEPLOY_BLOCK by
// resolveDeployBlock() in chains.ts.

// Palette index 0 is reserved for "empty" and is rejected by the contract, so
// the palette starts at 1.
export const PALETTE: { index: number; name: string; hex: string }[] = [
  { index: 1, name: "Black", hex: "#000000" },
  { index: 2, name: "White", hex: "#ffffff" },
  { index: 3, name: "Red", hex: "#ff4136" },
  { index: 4, name: "Orange", hex: "#ff851b" },
  { index: 5, name: "Yellow", hex: "#ffdc00" },
  { index: 6, name: "Green", hex: "#2ecc40" },
  { index: 7, name: "Teal", hex: "#39cccc" },
  { index: 8, name: "Blue", hex: "#0074d9" },
  { index: 9, name: "Navy", hex: "#001f3f" },
  { index: 10, name: "Purple", hex: "#b10dc9" },
  { index: 11, name: "Pink", hex: "#f012be" },
  { index: 12, name: "Brown", hex: "#8b4513" },
];

const BY_INDEX = new Map(PALETTE.map((c) => [c.index, c.hex]));

export function colorHex(index: number): string {
  return BY_INDEX.get(index) ?? "#4b5563";
}

export function colorName(index: number): string {
  return PALETTE.find((c) => c.index === index)?.name ?? `Color ${index}`;
}
