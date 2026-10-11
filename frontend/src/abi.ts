// Minimal hand-written ABI for the PixelTurf contract.
export const pixelTurfAbi = [
  {
    type: "function",
    name: "placeTile",
    stateMutability: "nonpayable",
    inputs: [
      { name: "x", type: "uint16" },
      { name: "y", type: "uint16" },
      { name: "color", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "WIDTH",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }],
  },
  {
    type: "function",
    name: "HEIGHT",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }],
  },
  {
    type: "function",
    name: "TOTAL_TILES",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }],
  },
  {
    type: "function",
    name: "PLACEMENT_COOLDOWN",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "tiles",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "lastPlacedAt",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "nextPlacementTime",
    stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "TilePlaced",
    inputs: [
      { name: "player", type: "address", indexed: true },
      { name: "index", type: "uint256", indexed: true },
      { name: "x", type: "uint16", indexed: false },
      { name: "y", type: "uint16", indexed: false },
      { name: "color", type: "uint8", indexed: false },
    ],
  },
] as const;
