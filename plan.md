# Pixel Turf — MVP Plan

Problem slug: `pixel-turf` (Road to DevCon VIII)
Project folder: `N:\dev7\pt` (this folder only — never `dev7`, `tbyt`, or `sg`)
Brief: `N:\dev7\p2.md` (authoritative)

## 1. MVP goal and limited scope

**Goal:** A shared pixel canvas that nobody can wipe. Any player places a
coloured tile at a position; the contract — not the UI, not a host — enforces a
fixed per-player cooldown so everyone paints at the same pace. There is no
owner, no admin, and no reset/clear path. Someone who opens the page at 2 a.m.
sees the whole board reconstructed from chain placement events and watches it
change live as others paint.

**In scope**

- One Solidity contract (`PixelTurf`) with a fixed canvas of WIDTH × HEIGHT and
  a fixed `PLACEMENT_COOLDOWN`.
- A single permissionless placement function that checks bounds, enforces the
  cooldown keyed by `msg.sender`, writes exactly one tile, and emits an event.
- Views for canvas dimensions, cooldown length, a player's last placement time,
  and next-allowed time.
- Foundry tests covering the ten scored checks (adapted) and failure cases.
- A React + Vite + wagmi/viem frontend that (a) loads the whole canvas from
  `TilePlaced` event logs in batched block-range reads, (b) keeps updating via
  recurring log polling, (c) shows the connected player's cooldown read from the
  contract, and (d) offers a simple colour palette + click-to-place UI.
- Deploy script, README, `.env.example`.

**Out of scope (deferred):** accounts/social login, tokens/economies, erasing or
moderation, fees, rankings, chat, artwork, mobile wallet deep links, indexer
service, and any on-chain testing/deployment during this coding phase.

## 2. Network directive (IMPORTANT)

The operator directs **Ethereum Sepolia, chain ID `11155111`**, tested with
desktop MetaMask, as the **deployment + manual-verification target**. This
overrides the original rubric's **Base Sepolia** wording (check #1 asks for chain
`84532` / the `baseSepolia` object).

- Since session 1d the frontend is **dual-network**: it also recognises **Base
  Sepolia (`84532`)** as a *configurable* network, each with its own address/RPC
  that is never shared.
- Base Sepolia is **not** deployed to or verified (no Base Sepolia test ETH). The
  identical contract source deploys unchanged to either chain (it never reads
  `block.chainid`).
- **The rubric's Base Sepolia check still does not pass as written** (we do not
  deploy/verify on Base Sepolia); it is now partially addressed — Base Sepolia is
  *supported/configured* but not demonstrated. Recorded here, in `README.md`, and
  in `PROGRESS.md` for the reviewer.

## 3. Architecture and file structure

```
pt/
  foundry.toml               Foundry config (solc 0.8.24)
  remappings.txt
  .gitignore
  .env.example               Placeholders only (never real keys)
  README.md                  Setup / test / deploy / use (Sepolia + MetaMask)
  plan.md                    This file
  PROGRESS.md                Durable session handoff log
  src/PixelTurf.sol          The canvas contract
  test/PixelTurf.t.sol       Contract tests (ten scored checks + failure cases)
  script/Deploy.s.sol        Deployment script
  frontend/
    package.json             React + Vite + wagmi + viem
    vite.config.ts
    tsconfig.json
    index.html
    .env.example             Per-chain address / RPC / deploy-block placeholders
    src/main.tsx
    src/App.tsx              Wallet + network selector + canvas UI
    src/chains.ts            Dual-network registry (per-chain address/RPC/block)
    src/useSelectedChain.ts  Persisted network selection
    src/wagmi.ts             Both chains + per-chain public clients + resolvers
    src/abi.ts               Contract ABI + palette type
    src/constants.ts         Palette + default dims (mirror contract constants)
    src/hooks/useCanvas.ts   Load canvas from logs for the selected chain
    src/components/Canvas.tsx   <canvas> render + click-to-place
    src/components/Palette.tsx  Colour picker
    test/chains.test.ts      node:test dual-network config tests
    src/styles.css
```

**Canvas constants (single source of truth = the contract):**

- `WIDTH = 32`, `HEIGHT = 32`, `TOTAL_TILES = 1024`
- packed index = `y * WIDTH + x`
- `PLACEMENT_COOLDOWN = 10 seconds`
- colour `0` is reserved as "empty" and is rejected, so no placement can erase a
  tile. Palette colours are `1..12` (documented in the README).

The frontend reads `WIDTH`, `HEIGHT` and `PLACEMENT_COOLDOWN` from the contract
at runtime; its local constants only serve as a pre-load fallback and must match.

## 4. Requirement-to-implementation checklist (the ten scored checks)

| # | Scored check (rubric) | Adapted implementation | Where | Status |
|---|-----------------------|------------------------|-------|--------|
| 1 | Frontend targets Base Sepolia | **Deviation:** default/target is Ethereum Sepolia (11155111); Base Sepolia (84532) is configurable but not deployed/verified | `frontend/src/chains.ts`, `frontend/src/wagmi.ts` | Partial (Base Sepolia configured; rubric check still NOT passed as written) |
| 2 | No credential in any tracked file | `.gitignore`, `.env.example`, no keys | repo-wide | DONE (verified by scan) |
| 3 | Cooldown enforced against `msg.sender` | `placeTile` reverts within `PLACEMENT_COOLDOWN`; keyed by `msg.sender` in `lastPlacedAt` | `PixelTurf.placeTile` | DONE (tested) |
| 4 | Rejects out-of-bounds coordinates | `placeTile` requires `x < WIDTH && y < HEIGHT` | `PixelTurf.placeTile` | DONE (tested) |
| 5 | Only the placement path writes tile state | single permissionless `placeTile`; no owner/admin/batch/reset/clear | `PixelTurf.sol` | DONE (tested + review) |
| 6 | Placement event carries coordinates / packed index | `TilePlaced(player, index, x, y, color)` | `PixelTurf.placeTile` | DONE (tested) |
| 7 | Initial canvas avoids one read per tile | built from `TilePlaced` logs via batched block-range `getLogs` | `frontend/src/hooks/useCanvas.ts` | DONE (code review) |
| 8 | Placement does not loop over canvas/array | fixed two storage writes, no loop | `PixelTurf.placeTile` | DONE (tested: fixed gas) |
| 9 | New placements reach an open page without reload | recurring `getLogs` poll (6 s) merges new logs | `frontend/src/hooks/useCanvas.ts` | DONE (code review) |
| 10 | Cooldown display read from the contract | reads `nextPlacementTime(address)` / `lastPlacedAt` | `frontend/src/App.tsx` | DONE (view tested) |

Checks 1, 2, 7, 9 are frontend/static: verified by the production build, a
credential scan, and code review (Foundry cannot exercise the browser). Checks
3, 4, 5, 6, 8 and the #10 view function are covered by `forge test`.

### Design decision — one tile per transaction (2026-10-11)

Deliberate, and kept: a placement is a single `placeTile(x, y, color)`
transaction. A batch / multi-tile / grid-fill function was **rejected** because
checks 5 ("only the placement path writes tile state") and 8 ("placement does not
loop") together forbid a second tile-writing path or a loop, and the shared
`PLACEMENT_COOLDOWN` is the fairness mechanism. The single-tile flow is made
explicit in the UI (hover preview of the next tile + an explanatory note next to
the canvas). Adding batch placement would require changing the rubric/contract
design, not just this repo's code. See `README.md` → "One tile per transaction".

## 5. Task breakdown

**Contract (`src/PixelTurf.sol`)**
- Constants: `WIDTH`, `HEIGHT`, `TOTAL_TILES`, `PLACEMENT_COOLDOWN`.
- State: `mapping(uint256 => uint8) tiles`, `mapping(address => uint256)
  lastPlacedAt`.
- `placeTile(uint16 x, uint16 y, uint8 color)`: bounds check, non-empty colour,
  `msg.sender` cooldown check, two storage writes, one event. No loops.
- Views: `nextPlacementTime(address)` (and public getters `tiles`,
  `lastPlacedAt`).
- Event: `TilePlaced(address indexed player, uint256 indexed index, uint16 x,
  uint16 y, uint8 color)`.

**Tests (`test/PixelTurf.t.sol`)** — one+ per scored check plus failure cases:
place stores colour; event carries coords + packed index; second placement within
cooldown reverts; cooldown is per-address; cooldown expiry allows placement;
`nextPlacementTime` reflects contract state; out-of-bounds x/y revert (both axes
+ past-corner); corner bounds accepted; colour 0 rejected; placement is
permissionless (any address, no allowlist); placement cost is fixed (gas does not
grow with tile count); one player's placement does not affect another's tile or
cooldown; tiles persist.

**Deployment (`script/Deploy.s.sol`)** — forge script deploying `PixelTurf`; reads
`PRIVATE_KEY` + `SEPOLIA_RPC_URL` from env (never committed). Not run this phase.

**Frontend (`frontend/`)**
- Dual-network chain config (Ethereum Sepolia + Base Sepolia); injected
  (MetaMask) connector; per-chain standalone `publicClient` for log reads.
- `useCanvas`: initial load from `TilePlaced` logs (chunked block-range
  `getLogs`), fold into `Map<index,color>`, then poll every 6 s for new logs.
- `Canvas`: HTML `<canvas>`, 32×32, draws current tiles; click maps to `x,y`.
- `Palette`: 12 colours; selected colour used on place.
- `App`: connect/switch-chain UI, canvas, colour picker, cooldown read from
  contract (`nextPlacementTime`) with a local countdown, tx status.

**Docs** — README (install/test/deploy/use, dimensions + reconstruction), root and
frontend `.env.example`, `plan.md`, `PROGRESS.md`.

## 6. Risks, assumptions, blockers

- **Network conflict:** rubric says Base Sepolia; operator says Ethereum Sepolia.
  *Following operator.* Base Sepolia is now configurable (dual-network), but the
  rubric's Base Sepolia check is still **not** claimed as passing (not deployed/
  verified there).
- **Knowledge graph empty:** `loops knowledge query ... pixel-turf` returned "No
  relevant context" for several queries. `p2.md` is treated as authoritative.
- **Toolchain:** Foundry 1.8.1 preinstalled at `C:\Users\NIRUPAM\.foundry\bin`
  (not on PATH); Node v22.22.0. Nothing to download.
- **No public-RPC log limits guarantee:** `getLogs` is chunked by block range so
  a large history does not exceed a provider's range cap.
- **Deployment credentials:** none provided and none requested. Not deployed this
  phase (by instruction).
- **Large initial log scan:** mitigated by the per-chain deploy-block vars
  (`VITE_SEPOLIA_DEPLOY_BLOCK` / `VITE_BASE_SEPOLIA_DEPLOY_BLOCK`): set them after
  deployment so the initial scan is small.

## 7. Overall three-MVP sequencing

1. **Code all three MVPs first** — `tbyt` (Turn by Turn), `pt` (Pixel Turf), `sg`
   (Speedrun Ghosts) — around this project folder, each independent.
2. **Then** deploy each to its target chain.
3. **Then** manual testing, stress testing, noisy testing, fixes.
4. **Then** final release preparation and submission.

This session covers only step 1 for `pt`: local code, contract tests, frontend,
setup docs, and progress records. No deployment, no manual/stress testing.

## 8. Fresh verification (2026-10-10, session 1b)

- `forge test` → 17/17 pass (exit 0); `npm run build` → success (exit 0);
  tracked-file credential scan clean.
- Checks 3, 4, 5, 6, 8, 10 re-confirmed against source + tests; checks 7 and 9
  confirmed by code review + production build (frontend/static). Check 1 remains
  a deliberate operator-directed deviation from the rubric's Base Sepolia wording
  (frontend targets Ethereum Sepolia 11155111).
- Remaining gaps: not deployed; repo has **no commit** (all source untracked);
  no remote/push.

## 9. Pre-deployment stress + fuzz hardening (2026-10-11, session 1c)

- **Tests 17 → 22** (`test/PixelTurf.t.sol`). Added bounded Foundry stress and fuzz
  tests:
  - `testManyPlacementsReconstructFromEvents` — 60 placements from 12 addresses;
    folds the `TilePlaced` event log back into a `Map<index,color>` and asserts in
    memory reconstruction equals the `tiles` mapping (validates check 6 + 7 at
    scale).
  - `testCooldownPerAddressAtScale` — 30 distinct addresses each place once; each
    cooldown is keyed independently to `msg.sender` (validates check 3 at scale).
  - `testFuzz_OutOfBoundsAlwaysReverts` — fuzzed `x`/`y` >= WIDTH/HEIGHT revert.
  - `testFuzz_EmptyColorAlwaysReverts` — colour `0` always reverts (no erase).
  - `testFuzz_PlacementWritesExactlyPackedIndex` — a placement writes exactly the
    packed index `y*WIDTH+x` and nothing else (validates check 8 / no loop).
- **Confirmed by review + tests:** cooldown, bounds, fixed placement cost, and the
  absence of any erase/admin/reset path.
- **`forge fmt` applied** so `forge fmt --check` passes (cosmetic only).
- **README updated**: added a Remix + MetaMask deploy section (contract source,
  contract name, solc 0.8.24, Sepolia 11155111 via injected MetaMask); test table
  now lists 22 tests including the new stress/fuzz rows. The Remix procedure is
  documented but **not** claimed as executed.

### Verification (2026-10-11, session 1c, live re-run)
- `forge test` → **22 passed; 0 failed; 0 skipped** (exit 0), solc 0.8.24.
- `forge build` → exit 0; `forge fmt --check` → exit 0.
- `npm run build` (frontend, `tsc -b && vite build`) → success (exit 0); non-fatal
  Rollup `/*#__PURE__*/` node_modules warnings and a >500 kB chunk notice only.
- Credential scan of tracked files → clean.
- Rubric: checks 2, 3, 4, 5, 6, 8, 10 PASS (source + tests); checks 7 and 9 PASS
  (static — build + code review). Check 1 stays the documented Ethereum-Sepolia
  (11155111) deviation. Not deployed; no commit; no push.

## 10. Dual-network compatibility (2026-10-11, session 1d)

Goal: make the frontend work on **either** Ethereum Sepolia (`11155111`, target)
**or** Base Sepolia (`84532`, configurable/not deployed) when the same contract is
separately deployed, with no chain-specific assumptions.

- **New `frontend/src/chains.ts`** (pure, dependency-free): both chain ids, per
  chain `rpcEnv`/`addressEnv`/`deployBlockEnv`, `DEFAULT_CHAIN_ID = 11155111`,
  and resolvers `resolveAddress`/`hasAddress`/`resolveRpcUrl`/`resolveDeployBlock`
  that use the chain's own value and **never** fall back to another chain's
  address. `walletMatchesSelected` and `canTransact` implement the guards.
- **New `frontend/src/useSelectedChain.ts`**: persisted (localStorage) selection.
- **`frontend/src/wagmi.ts`**: both `sepolia` and `baseSepolia` with per-chain
  transports; exports `publicClientFor(chainId)`, `contractAddressFor(chainId)`,
  `hasContractAddress(chainId)`.
- **`useCanvas.ts` / `App.tsx`**: the log scan, placement reads and cooldown read
  target the **selected** chain; a wrong-chain wallet shows a "switch" banner and
  **blocks writes**; a selected chain with no configured address shows a
  **"Not deployed/configured on <network>"** state and disables actions.
- **`constants.ts`**: `DEPLOY_BLOCK` moved out (now per-chain in `chains.ts`).
- **Env vars (renamed per chain):** `VITE_SEPOLIA_CANVAS_ADDRESS` /
  `VITE_BASE_SEPOLIA_CANVAS_ADDRESS`, `VITE_SEPOLIA_RPC_URL` /
  `VITE_BASE_SEPOLIA_RPC_URL`, `VITE_SEPOLIA_DEPLOY_BLOCK` /
  `VITE_BASE_SEPOLIA_DEPLOY_BLOCK`; root `.env.example` adds an optional
  `BASE_SEPOLIA_RPC_URL`.
- **Tests:** new `frontend/test/chains.test.ts` (8 tests) run with Node's built-in
  test runner + TS type-stripping (`npm test`): chain config, per-chain
  address/block selection, missing-address (no fallback), wrong-network guards.
  All 22 Foundry tests unchanged.
- **Contract/scripts:** reviewed; neither `PixelTurf.sol` nor `Deploy.s.sol` reads
  `block.chainid`, so there is no chain-specific assumption and **no contract
  behaviour or interface changed**.

### Verification (session 1d)
- `forge test` → 22/22 pass (exit 0); `forge fmt --check` → exit 0.
- `npm test` (frontend) → 8/8 pass; `npm run build` → exit 0.
- Base Sepolia is configured/compatible only — not deployed, not verified.
