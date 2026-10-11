# PROGRESS — Pixel Turf (`pixel-turf`)

Project folder: `N:\dev7\pt` (only this folder; never `dev7`, `tbyt`, or `sg`).

## Current session

- **Start:** 2026-10-10 00:35 (session 1 — initial build)
- **Task:** Implement the Pixel Turf MVP locally: contract, contract tests,
  frontend, deploy script, README, plan, and progress record. No deployment and
  no manual/stress/noisy testing this phase (per the three-MVP sequencing in
  `plan.md` §7).
- **Observed state at start:** `N:\dev7\pt` was **empty** (no files). `p2.md` and
  `plan.md` read at `N:\dev7\`. Toolchain observed: Node **v22.22.0**, npm
  **11.6.2**, git **2.51.0**, Foundry **1.8.1** preinstalled at
  `C:\Users\NIRUPAM\.foundry\bin` (not on PATH). `loops` CLI **0.6.0**
  installed and authenticated (`ndkindia09@gmail.com`).
- **Harness:** Road to DevCon VIII skill was **not** present in `pt`; installed
  here with `npx loopshouse add road-to-devcon-viii` → wrote
  `.claude/skills/loops-road-to-devcon-viii/SKILL.md` and
  `.agents/skills/loops-road-to-devcon-viii/SKILL.md`. Knowledge-graph queries
  for `pixel-turf` returned "No relevant context was retrieved" (graph empty);
  `p2.md` treated as authoritative.
- **Operator directive:** target **Ethereum Sepolia (`11155111`)** + desktop
  MetaMask, NOT Base Sepolia. Recorded in `plan.md` §2/§6 and `README.md`; the
  rubric's Base Sepolia check is **not** claimed as passing.

## Status board

- [x] Scored check 1 — frontend targets Ethereum Sepolia (default) and supports Base Sepolia (dual-network); rubric's Base Sepolia check NOT passed as written (not deployed/verified there)
- [x] Scored check 2 — no credential tracked (scan clean)
- [x] Scored check 3 — cooldown enforced against `msg.sender`
- [x] Scored check 4 — out-of-bounds coordinates rejected
- [x] Scored check 5 — only the placement path writes tile state
- [x] Scored check 6 — placement event carries coordinates + packed index
- [x] Scored check 7 — initial canvas loaded from batched event-log reads
- [x] Scored check 8 — placement writes a fixed number of slots (no loop)
- [x] Scored check 9 — open page updates via recurring log polling
- [x] Scored check 10 — cooldown display read from the contract
- [ ] Sepolia deployment recorded (NOT DONE — deferred by instruction)
- [ ] GitHub repo pushed (NOT DONE — no remote/repo provided or requested)

## What changed this session (session 1)

- Created the full Pixel Turf project under `pt/`:
  - `src/PixelTurf.sol` — fixed 32×32 canvas, 10 s per-address cooldown, single
    permissionless `placeTile(x, y, color)`, `TilePlaced` event, `nextPlacementTime`
    view. No owner/admin/batch/reset/clear; colour `0` rejected (no erase).
  - `test/PixelTurf.t.sol` — 17 tests.
  - `script/Deploy.s.sol` — deploy script (not run).
  - `foundry.toml`, `remappings.txt`, `.gitignore`, `.env.example`, `README.md`,
    `plan.md`.
  - `frontend/` — React + Vite + wagmi/viem: Sepolia-only config, injected
    (MetaMask) connector, standalone `publicClient`; `useCanvas` loads the board
    from `TilePlaced` logs (chunked block-range `getLogs`) and polls every 6 s;
    `Canvas`/`Palette` components; cooldown read from the contract.
- `git init` was run in `pt` (Foundry needs a repo for `forge install`); forge-std
  v1.17.0 installed into `lib/forge-std`. **No commit was made** (not requested).

## Checks actually run and results (session 1)

- `forge build` → **Compiler run successful!** (solc 0.8.24). Only non-fatal
  `forge lint` advice (custom-errors / block-timestamp / calls-loop notes) remain;
  no errors.
- `forge test` → **17 passed; 0 failed; 0 skipped** (`test/PixelTurf.t.sol`, ~6 ms).
- `npm install` (frontend) → added 531 packages; npm audit reports 25 advisories
  in transitive dev deps (not addressed this phase).
- `npm run build` (frontend, `tsc -b && vite build`) → **successful**; 4737
  modules transformed, `dist/index-*.js` 506.48 kB (gzip 156.84 kB), built in
  ~23.8 s. Output includes non-fatal Rollup `/*#__PURE__*/` comment warnings from
  `node_modules` (`ox`, `@reown`, `@walletconnect`) and a >500 kB chunk notice;
  neither affects the build.
- Credential scan over all tracked-candidate files (excluding `node_modules`,
  `lib`, `out`, `cache`, `dist`, `broadcast`, lockfiles) → **clean**: no `0x`+64-hex
  key, no mnemonic/seed, no API key, no key-bearing RPC URL. Only `PRIVATE_KEY`
  env-var *names* in `.env.example`, `plan.md`, and `script/Deploy.s.sol`.
- Tool versions observed: `forge` 1.8.1, `node` v22.22.0, `npm` 11.6.2.

## Unfinished / blockers

- **Deployment: NOT DONE (deferred).** No `.env`, no `SEPOLIA_RPC_URL`, no
  funded key; and this phase is explicitly non-deploying. No contract address
  recorded.
- **GitHub push: NOT DONE.** No remote and no repo provided/requested.
- **No git commit made.** Working tree is a fresh `git init` with everything
  untracked/staged; awaiting an explicit request to commit.
- **Rubric check #1** text asks for Base Sepolia; operator directed Ethereum
  Sepolia. Flagged for the reviewer; not counted as passed.
- Checks 1, 2, 7, 9 are frontend/static and were verified by build + scan + code
  review, not by an automated browser test.

## Exact next step (next session)

1. (Only when credentials exist and deployment is authorized per `plan.md` §7):
   set `SEPOLIA_RPC_URL` + `PRIVATE_KEY` in a git-ignored `.env`, then
   `forge script script/Deploy.s.sol --rpc-url $env:SEPOLIA_RPC_URL --broadcast --private-key $env:PRIVATE_KEY`.
2. Put the printed address in `frontend/.env` (`VITE_SEPOLIA_CANVAS_ADDRESS`) and
   the deploy block in `VITE_SEPOLIA_DEPLOY_BLOCK`; update `README.md`
   "Deployment status".
3. Re-run `forge test` and `npm run build`; then begin manual/stress/noisy
   testing (a later phase).
4. If/when a repo is provided and a commit is requested, commit the tree.

## Session log

### 2026-10-10 — session 1 (initial build)

- Built the entire local Pixel Turf MVP and ran its focused verification.
- `forge test` 17/17 pass; `forge build` clean; frontend production build
  succeeds; credential scan clean.
- Harness installed in `pt`. Nothing deployed; no commit made.
- **Session end:** 2026-10-10

## Overall MVP status: IN PROGRESS

Local code, tests, frontend, and docs are complete and verified for this phase.
The MVP is **not** complete: it is not deployed (deferred by instruction) and not
yet manually/stress tested. Per the rule that no MVP is marked `DONE (verified)`
without observed deployment/manual-test evidence, the overall status stays
`IN PROGRESS`.

## Fresh verification — session 1b (2026-10-10, live re-run)

Re-run from scratch in `N:\dev7\pt` (prior report not reused as evidence):
- `forge test` → **17 passed; 0 failed; 0 skipped** (exit 0).
- `npm run build` (frontend, `tsc -b && vite build`) → **success** (exit 0).
- Credential scan of tracked files → **clean** (only `.env.example` placeholders).

Rubric results (source-verified this session):
- Checks 3, 4, 5, 6, 8: PASS — `PixelTurf.placeTile` bounds check, `msg.sender`
  cooldown (`lastPlacedAt`), single write path, `TilePlaced` event with coords +
  packed index, fixed two-slot write (no loop) — all covered by `forge test`.
- Check 10: PASS — `nextPlacementTime`/`lastPlacedAt` views tested; frontend
  `App.tsx` reads `nextPlacementTime`.
- Checks 7 and 9: PASS (static) — `frontend/src/hooks/useCanvas.ts` loads the
  canvas from batched block-range `getLogs` (not one read per tile) and polls
  every 6 s. Confirmed by code review + the production build; no browser run this
  phase (per instructions).
- Check 2: PASS — no credential in any tracked file.
- Check 1: FAIL as written (rubric wants Base Sepolia 84532); frontend is
  intentionally configured for **Ethereum Sepolia 11155111** per operator
  directive (`frontend/src/wagmi.ts`). Operator network requirement met.

Remaining gaps: not deployed (no address); **no commit exists in this repo** (only
`.gitmodules` + `lib/forge-std` tracked; all source untracked); no remote/push.

## Pre-deployment stress + fuzz hardening — session 1c (2026-10-11)

Work in `N:\dev7\pt` only. No deployment, no wallet keys, no GitHub push; target
remains Ethereum Sepolia 11155111.

- **Tests 17 → 22** (`test/PixelTurf.t.sol`). Added bounded Foundry stress and fuzz
  tests:
  - `testManyPlacementsReconstructFromEvents` — 60 placements from 12 addresses;
    the test folds `TilePlaced` logs back into a `Map<index,color>` and asserts the
    reconstruction equals the `tiles` mapping (validates checks 6 + 7 at scale).
  - `testCooldownPerAddressAtScale` — 30 addresses, each placing once; confirms the
    cooldown is keyed independently per `msg.sender` (check 3 at scale).
  - `testFuzz_OutOfBoundsAlwaysReverts` — fuzzed out-of-range `x`/`y` revert.
  - `testFuzz_EmptyColorAlwaysReverts` — colour `0` always reverts (no erase).
  - `testFuzz_PlacementWritesExactlyPackedIndex` — a placement writes exactly the
    packed index `y*WIDTH+x` and nothing else (check 8 — fixed write, no loop).
- Reviewed and re-confirmed: bounds checks, per-address cooldown, fixed placement
  cost, and **no** erase/admin/reset/owner path.
- **`forge fmt` applied** so `forge fmt --check` passes (cosmetic only).
- **README updated**: added a Remix + MetaMask deploy section (contract source
  `src/PixelTurf.sol`, contract name `PixelTurf`, solc 0.8.24, Sepolia 11155111 via
  injected MetaMask); test table now lists 22 tests including the new stress/fuzz
  rows. The Remix procedure is documented but **not** claimed as executed.

### Checks actually run (2026-10-11, session 1c, live re-run)
- `forge test` → **22 passed; 0 failed; 0 skipped** (exit 0), solc 0.8.24.
- `forge build` → exit 0; `forge fmt --check` → exit 0.
- `npm run build` (frontend, `tsc -b && vite build`) → success (exit 0); only
  non-fatal Rollup `/*#__PURE__*/` node_modules warnings and a >500 kB chunk notice.
- Credential scan of tracked files → clean (`.env.example` placeholders only).

### Rubric after the change
Checks 2, 3, 4, 5, 6, 8, 10 PASS (source + tests); checks 7 and 9 PASS (static:
production build + code review). Check 1 remains the documented operator-directed
deviation (Ethereum Sepolia 11155111, not Base Sepolia 84532).

### Still not done (session 1c)
Not deployed (no `.env`, no RPC/key); no commit made; no remote/push; no in-browser
run against a live contract. Ready for the deployment step (plan §7) once
credentials exist and deployment is authorized.

## Dual-network support — session 1d (2026-10-11)

Work in `N:\dev7\pt` only. No deployment, no wallet keys, no GitHub push.

- Added dual-network support so the same frontend can run against **Ethereum
  Sepolia (11155111, our target)** or **Base Sepolia (84532, configurable, not
  deployed/verified)** with the identical contract source.
- **New:** `frontend/src/chains.ts` (pure registry + resolvers + guards),
  `frontend/src/useSelectedChain.ts` (persisted selection),
  `frontend/test/chains.test.ts` (8 `node:test` tests).
- **Changed:** `frontend/src/wagmi.ts` (both chains + per-chain transports +
  `publicClientFor`/`contractAddressFor`/`hasContractAddress`),
  `src/hooks/useCanvas.ts` (now `useCanvas(chainId)`; per-chain address/RPC/
  deploy-block), `src/App.tsx` (network selector; wrong-network banner + blocked
  writes; not-configured state), `src/constants.ts` (`DEPLOY_BLOCK` removed),
  `frontend/.env.example` + root `.env.example` (per-chain vars),
  `frontend/package.json` (`npm test`), `styles.css`, `README.md`.
- Env vars renamed per chain: `VITE_SEPOLIA_CANVAS_ADDRESS` /
  `VITE_BASE_SEPOLIA_CANVAS_ADDRESS`, `VITE_SEPOLIA_RPC_URL` /
  `VITE_BASE_SEPOLIA_RPC_URL`, `VITE_SEPOLIA_DEPLOY_BLOCK` /
  `VITE_BASE_SEPOLIA_DEPLOY_BLOCK`; root `.env.example` adds optional
  `BASE_SEPOLIA_RPC_URL`.
- Contract + deploy script reviewed: no `block.chainid` use, no chain-specific
  assumption; behaviour and interfaces unchanged (still 22 Foundry tests).

### Live re-run (session 1d)
- `forge test` → **22 passed; 0 failed; 0 skipped** (exit 0).
- `forge fmt --check` → exit 0.
- `npm test` (frontend) → **8 passed; 0 failed**.
- `npm run build` (frontend) → success (exit 0); only non-fatal Rollup warnings
  and the >500 kB chunk notice.
- Credential scan of tracked files → clean.

### Not done / unchanged (session 1d)
- No Sepolia or Base Sepolia deployment; Base Sepolia is **configured only**,
  never deployed or verified. No GitHub push. Changes uncommitted.

## Manual-test clarification — session 1e (2026-10-11)

Work in `N:\dev7\pt` only. No deployment, no wallet keys, no GitHub push; target
remains Ethereum Sepolia 11155111.

### Finding
- **"Only one tile per transaction; there is no multi-tile flow."** Placement is
  one tile per click ⇒ one transaction per tile.

### Decision — single-tile placement kept (deliberate)
A batch / multi-tile write was considered and **rejected**, because it would break
the scored checks and the fairness model:
- **Check 5** ("only the placement function writes tile state") fails if any
  additional function can write tiles — a batch entry point is another write path.
- **Check 8** ("placement is a fixed write, no loop") fails if one call loops over
  many tiles.
- The single **per-address cooldown** (`lastPlacedAt`) is the mechanism that makes
  the canvas fair and wipe-proof: nobody can out-paint anyone else. A batch would
  let one wallet write many tiles per cooldown window, defeating that.

Contract (`src/PixelTurf.sol`) is **unchanged**: `placeTile` remains the only
write path.

### UX clarification (no contract change)
- **`frontend/src/components/Canvas.tsx`** — hover now previews the exact single
  tile the next click will paint (colored, alpha-blended with a white outline)
  when placement is allowed. `previewColor` prop added; rendering effect keyed on
  it.
- **`frontend/src/App.tsx`** — passes `previewColor={selectedColor}` and adds a
  short note next to the canvas explaining "one tile per click (one wallet
  confirmation)" and why the cooldown, not a batch path, is the fairness
  mechanism.
- **`frontend/src/styles.css`** — `.paint-note` styling for that note.

### Checks actually run (2026-10-11, session 1e, live re-run)
- `forge test` → **22 passed; 0 failed; 0 skipped** (exit 0), solc 0.8.24.
- `forge fmt --check` → exit 0.
- `npm test` (frontend) → **8 passed; 0 failed**.
- `npm run build` (frontend, `tsc -b && vite build`) → success (exit 0); only
  non-fatal Rollup `/*#__PURE__*/` node_modules warnings and the >500 kB chunk notice.
- **Not verified:** no in-browser run against a live contract; the hover preview
  and note must be confirmed manually after deploy.

### Remaining risks
- Painting a large area still costs one confirmation per tile — inherent to the
  single-tile, cooldown-based design; the UI now makes the one-tile-per-click
  behavior explicit so it reads as intentional, not broken.

### Still not done
- Not deployed (no `.env`, no RPC/key); no commit made; no remote/push; no
  in-browser run. Base Sepolia remains configured-only (not deployed/verified).
