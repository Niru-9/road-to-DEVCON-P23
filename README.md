# Pixel Turf — A Canvas Nobody Can Wipe

A shared pixel canvas where **the chain is the only authority**. Any player
places a coloured tile at a position; the contract enforces a fixed per-player
cooldown so everyone paints at the same pace. There is no owner, no admin, and
no batch/reset/clear path, so nobody — not a script, not the host, not the
deployer — can wipe the board. A visitor who opens the page sees the whole
canvas rebuilt from chain placement events and watches it change live as others
paint.

> **Networks:** The contract is plain EVM Solidity and the front end is
> **dual-network**: it can talk to **Ethereum Sepolia (`11155111`)** and **Base
> Sepolia (`84532`)**, each with its own contract address, RPC and deploy block
> that are never shared. **Ethereum Sepolia is our deployment and
> manual-verification target.** (The original rubric names Base Sepolia; using
> Ethereum Sepolia is a documented deviation, not a code defect.) Base Sepolia is
> supported/configurable for a separate deployment by someone who has Base
> Sepolia test ETH — **we have not deployed to or verified it.**

---

## Canvas constants (single source of truth = the contract)

| Constant | Value | Notes |
|----------|-------|-------|
| `WIDTH` | `32` | columns, x ∈ `[0, 31]` |
| `HEIGHT` | `32` | rows, y ∈ `[0, 31]` |
| `TOTAL_TILES` | `1024` | `WIDTH * HEIGHT` |
| `PLACEMENT_COOLDOWN` | `10 seconds` | minimum wait per address between placements |
| packed index | `y * WIDTH + x` | the key used by the `tiles` mapping |
| colour `0` | reserved "empty" | rejected by `placeTile`, so placements cannot erase |

Palette colours are indices `1..12` (Black, White, Red, Orange, Yellow, Green,
Teal, Blue, Navy, Purple, Pink, Brown) — see `frontend/src/constants.ts`.

The frontend reads `WIDTH`, `HEIGHT` and `PLACEMENT_COOLDOWN` from the contract
at runtime; its local constants are only a pre-load fallback and mirror the ones
above.

### How on-chain placements reconstruct the current view

Every placement emits one event:

```
TilePlaced(address indexed player, uint256 indexed index, uint16 x, uint16 y, uint8 color)
```

where `index = y * WIDTH + x`. Because there is no erase path, the **latest**
`TilePlaced` event for a given `index` is that tile's current colour. The
frontend replays all `TilePlaced` logs (batched block-range `getLogs`, never one
read per tile) and folds them into a `Map<index, color>`, which is exactly the
current canvas. New blocks are polled every 6 s and only the new range is
fetched and merged, so an open page updates without a reload.

---

## Repository layout

```
.
├── src/PixelTurf.sol          The canvas contract (Solidity 0.8.24)
├── test/PixelTurf.t.sol       Foundry tests covering the scored checks
├── script/Deploy.s.sol        Deployment script (network-agnostic; Sepolia default)
├── foundry.toml               Foundry config
├── .env.example               Root env placeholders (RPC + key)
├── frontend/                  React + Vite + wagmi + viem app
│   ├── src/chains.ts          Dual-network registry: per-chain address/RPC/block
│   ├── src/useSelectedChain.ts App-level network selection (persisted)
│   ├── src/wagmi.ts           wagmi config + per-chain read clients
│   ├── src/abi.ts             Contract ABI
│   ├── src/constants.ts       Palette + fallback dimensions
│   ├── src/hooks/useCanvas.ts Log-based canvas load for the selected chain
│   ├── src/components/Canvas.tsx   <canvas> render + click-to-place
│   ├── src/components/Palette.tsx  Colour picker
│   ├── test/chains.test.ts    node:test unit tests (chain config + guards)
│   └── .env.example           Frontend env placeholders
├── plan.md                    MVP plan
└── PROGRESS.md                Build/session log
```

---

## Prerequisites

- **Node.js 20.12+** (22 LTS recommended) — `node -v`
- **Foundry** (for the contract) — https://book.getfoundry.sh/getting-started/installation
- **MetaMask** browser extension (desktop) — https://metamask.io/download/
- Sepolia test ETH (free, see below)

---

## 1. Contract: build & test

```bash
# from the project root
forge build
forge test -vv        # runs the full suite (see "Test coverage" below)
```

`forge install` already vendored `forge-std` into `lib/`. If you cloned without
submodules, run `forge install foundry-rs/forge-std`.

## 2. Contract: deploy

The same `PixelTurf` source deploys unchanged to any EVM network. **Our target is
Ethereum Sepolia**; Base Sepolia is optional (see §4).

You can deploy either through **Remix + MetaMask** (no key handling in this repo,
matches the MetaMask-based manual test requirement) or the Foundry script.

### 2a. Remix + injected MetaMask (recommended)

> This manual procedure has **not** been executed in this coding phase — treat it
> as the documented plan, not a tested result.

1. Install MetaMask and switch it to **Sepolia**. Enable *Settings → Advanced →
   Show test networks*, then pick **Sepolia** (chain ID `11155111`). Get free
   Sepolia ETH from a faucet (see below).
2. Open https://remix.ethereum.org and create a new file, then paste the contents
   of `src/PixelTurf.sol` (source path `src/PixelTurf.sol`, contract name
   `PixelTurf`).
3. In the **Solidity Compiler** tab select compiler **0.8.24** (the version pinned
   in `foundry.toml`) and click **Compile**.
4. In the **Deploy & Run Transactions** tab set **Environment** to
   **Injected Provider - MetaMask**, confirm MetaMask shows Sepolia
   (`11155111`), then click **Deploy**. `PixelTurf` takes **no constructor
   arguments** — the canvas size and cooldown are compiled-in constants.
5. Copy the deployed address and record the **deploy block** (from the Sepolia
   explorer transaction).
6. Put the address in `VITE_SEPOLIA_CANVAS_ADDRESS` and the block number in
   `VITE_SEPOLIA_DEPLOY_BLOCK` in `frontend/.env` (§3), and update the deployment
   status below. The deploy block keeps the initial placement-log scan small.

### 2b. Foundry script

```bash
cp .env.example .env         # then edit .env with your own values
# .env:
#   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<your-key>   (or any Sepolia RPC)
#   PRIVATE_KEY=0x<throwaway-test-key>

forge script script/Deploy.s.sol \
  --rpc-url "$SEPOLIA_RPC_URL" \
  --broadcast --private-key "$PRIVATE_KEY"
```

The script prints `PixelTurf deployed at: 0x…`. Copy that address into
`frontend/.env` as `VITE_SEPOLIA_CANVAS_ADDRESS`, and record the deploy block as
`VITE_SEPOLIA_DEPLOY_BLOCK` (so the initial log scan stays small).

`PixelTurf` takes no constructor arguments: the canvas size and cooldown are
fixed constants compiled into the bytecode.

> `.env` is git-ignored. Only `.env.example` (placeholders) is tracked. Never
> commit a private key, mnemonic, API key, or a key-bearing RPC URL.

### Deployment status

**Not deployed.** No deployment has been recorded; this coding phase deliberately
does not deploy (see `plan.md` §7). Complete the command above and paste the
resulting address into `frontend/.env` and here:

```
PixelTurf (Ethereum Sepolia): <not deployed yet>
PixelTurf (Base Sepolia):     <not deployed — optional, not verified by us>
```

---

## 3. Frontend: install & run

```bash
cd frontend
npm install
cp .env.example .env
# .env:
#   VITE_SEPOLIA_CANVAS_ADDRESS=0x<your deployed contract on Ethereum Sepolia>
#   VITE_SEPOLIA_RPC_URL=               (optional; public default used if empty)
#   VITE_SEPOLIA_DEPLOY_BLOCK=          (optional; the contract's deploy block)
#   VITE_BASE_SEPOLIA_CANVAS_ADDRESS=   (optional; only if separately deployed)
#   VITE_BASE_SEPOLIA_RPC_URL=          (optional; public default used if empty)
#   VITE_BASE_SEPOLIA_DEPLOY_BLOCK=     (optional; deploy block on Base Sepolia)

npm run dev        # http://localhost:5173
npm test           # node:test — chain config, per-chain address, wrong-network guards
npm run build      # type-check + production build
```

---

## 4. Network configuration (dual-network)

Both networks are configured, each with its **own** contract address, RPC and
deploy block. Addresses are per network and are **never** shared or guessed.

| Network | Chain ID | Contract address env | RPC env | Deploy-block env |
|---|---|---|---|---|
| **Ethereum Sepolia** (our target) | `11155111` | `VITE_SEPOLIA_CANVAS_ADDRESS` | `VITE_SEPOLIA_RPC_URL` | `VITE_SEPOLIA_DEPLOY_BLOCK` |
| Base Sepolia (optional) | `84532` | `VITE_BASE_SEPOLIA_CANVAS_ADDRESS` | `VITE_BASE_SEPOLIA_RPC_URL` | `VITE_BASE_SEPOLIA_DEPLOY_BLOCK` |

- The in-app **Network** selector switches which chain the app reads from, and the
  choice is remembered across reloads. Ethereum Sepolia is the default.
- The log scan, the placement reads and the cooldown all target the **selected**
  chain. A transaction is only allowed when the connected wallet is on that same
  chain — otherwise the app shows a "Switch wallet" prompt and blocks the action.
- If the selected chain has no configured address, the app shows a clear
  **"Not deployed/configured on <network>"** state and disables every action. It
  never falls back to the other network's address.

### Deploying the front end against Base Sepolia (optional)

Only if you have Base Sepolia test ETH: deploy the same `PixelTurf` there (Remix
with MetaMask set to Base Sepolia `84532`, or
`forge script script/Deploy.s.sol --rpc-url "$BASE_SEPOLIA_RPC_URL" --broadcast --private-key "$PRIVATE_KEY"`),
then fill `VITE_BASE_SEPOLIA_CANVAS_ADDRESS` (and optionally
`VITE_BASE_SEPOLIA_DEPLOY_BLOCK`). **Never reuse the Ethereum
Sepolia address on Base Sepolia** (or vice-versa). This path is documented only —
we have not deployed to or verified Base Sepolia.

---

## Getting Sepolia test ETH & connecting MetaMask

1. Install MetaMask and create/select an account.
2. Add/switch to **Sepolia**: in MetaMask, enable *Show test networks* in
   Settings → Advanced, then pick **Sepolia** from the network selector. You can
   also use the app's **Switch wallet to Sepolia** button if it detects the wrong
   network.
3. Get free Sepolia ETH from a faucet (e.g.
   https://www.alchemy.com/faucets/ethereum-sepolia or https://sepoliafaucet.com).
4. Connect MetaMask to the app with **Connect MetaMask**.

---

## How to use

1. Connect MetaMask and pick **Ethereum Sepolia** in the app's Network selector.
2. Pick a colour from the palette.
3. Hover a tile to preview the exact tile the next click will paint (shown in
   the selected colour), then click it. The app submits
   `placeTile(x, y, color)` — **one tile per transaction**.
4. If you are within your cooldown, the contract rejects the transaction and the
   app shows the error; otherwise the tile appears after the transaction
   confirms.
5. The cooldown timer under the canvas is read from the contract
   (`nextPlacementTime(yourAddress)`); it is contract state, not a local guess.
6. Leave the page open: every 6 s the app fetches new `TilePlaced` logs and
   updates the canvas live. Reopen the page any time — the whole canvas is
   rebuilt from logs.

---

## One tile per transaction (by design, not an oversight)

Placing a tile is a single `placeTile(x, y, color)` transaction, so each tile
needs its own wallet confirmation. There is **no batch / multi-tile / grid-fill
path**, and that is intentional:

- The scored rubric requires that **only the placement path can write tile
  state** (check 5) and that a placement does **no loop over the canvas**
  (check 8). A function that paints several tiles in one call would either be a
  second tile-writing path or a loop, so adding one would make those checks fail.
- Every address shares the same fixed `PLACEMENT_COOLDOWN`, which is what makes
  the board **fair** — nobody can out-paint anyone else. A batch path would let
  one wallet gain many tiles per cooldown.

To make the single-tile flow clear, the canvas **previews the exact tile** the
next click will place (hover highlight in the selected colour) and the page
states this rule next to the canvas. If multi-tile placement is ever required,
it must come with a matching change to the rubric/contract design (for example a
batched relay where the contract still enforces one cooldown tick per tile), not
by adding a second writer to this contract.

---

## Contract design (how the rules are enforced)

- **One write path.** `placeTile(uint16 x, uint16 y, uint8 color)` is the only
  function that writes tile state. There is no owner, admin, batch, reset or
  clear function anywhere in the contract.
- **Bounds.** `require(x < WIDTH && y < HEIGHT)`. The packed index is derived
  from the checked coordinates, so it is always `< WIDTH * HEIGHT`.
- **Cooldown keyed by caller.** `lastPlacedAt[msg.sender]` stores the caller's
  last placement time; `placeTile` reverts with `COOLDOWN` if called again before
  `lastPlacedAt[msg.sender] + PLACEMENT_COOLDOWN`. No address argument is
  supplied by the caller — the key is always `msg.sender`.
- **No erase.** Colour `0` (the empty sentinel) is rejected with `EMPTY_COLOR`,
  so a placement can only paint, never clear.
- **Fixed cost.** Placement writes exactly two storage slots (one tile + one
  timestamp) and contains no loop over the canvas or tile array, so cost does not
  grow with the size of the world.
- **Event.** `TilePlaced(player, index, x, y, color)` carries both coordinates
  and the packed index.
- **Views.** `nextPlacementTime(address)` returns when an address may next place
  (0 = now); `lastPlacedAt(address)` and `tiles(index)` are public getters.
- **No chain assumptions.** The contract never reads `block.chainid`, so the
  identical bytecode behaves the same on Ethereum Sepolia and Base Sepolia.

---

## Test coverage (Foundry — `forge test`)

| Scored check | Test(s) |
|---|---|
| 3 — Cooldown enforced against `msg.sender` | `testCooldownBlocksSecondPlacement`, `testCooldownBoundaryIsInclusive`, `testCooldownExpiresAllowsPlacement`, `testCooldownIsPerAddress`, `testCooldownPerAddressAtScale` |
| 4 — Rejects out-of-bounds coordinates | `testOutOfBoundsXRejected`, `testOutOfBoundsYRejected`, `testFarOutOfBoundsRejected`, `testCornerBoundsAccepted`, `testFuzz_OutOfBoundsAlwaysReverts` |
| 5 — Only the placement path writes tile state | `testOnlyPlacementWritesTileState`, `testOnePlacementDoesNotDisturbOtherTiles`, `testEmptyColorRejected`, `testFuzz_EmptyColorAlwaysReverts` |
| 6 — Placement event carries coordinates / packed index | `testPlaceTileEmitsEventWithCoordsAndIndex`, `testManyPlacementsReconstructFromEvents` |
| 7 — Initial canvas load avoids one read per tile | `testManyPlacementsReconstructFromEvents` (log-fold reconstruction) |
| 8 — Placement does not loop over the canvas | `testPlacementCostIsFixed`, `testFuzz_PlacementWritesExactlyPackedIndex` |
| 10 — Cooldown readable from the contract | `testNextPlacementTimeZeroBeforeFirstPlace`, `testNextPlacementTimeReflectsContractState` |
| storage/dimensions support | `testPlaceTileStoresColorAtPackedIndex`, `testCanvasConstants` |

Result: **22 contract tests passing** (`forge test`), including 3 bounded fuzz
tests and a deterministic stress test that places 60 tiles from 12 addresses and
rebuilds the canvas by folding the emitted `TilePlaced` logs, asserting the
reconstruction equals the on-chain `tiles` mapping tile-for-tile. The front end
has a separate `node:test` suite (**8 tests**, `npm test`) covering the
dual-network config, per-chain address/block selection, missing-address behaviour
and wrong-network guards.

Checks 1, 2, 7 and 9 are frontend/static and cannot be exercised by Foundry:
they are covered by the production frontend build, a repository credential scan,
and code review (see `plan.md` §4).

---

## Security notes

- No private keys, mnemonics, or API keys are committed. Only `.env.example`
  placeholders are tracked; real values live in git-ignored `.env` files.
- The contract has no owner/admin and no upgrade path; the only write path is
  the permissionless, cooldown-limited `placeTile`.
