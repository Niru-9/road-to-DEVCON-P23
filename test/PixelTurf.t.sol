// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {PixelTurf} from "../src/PixelTurf.sol";

contract PixelTurfTest is Test {
    PixelTurf turf;

    address p1 = address(0xA11CE);
    address p2 = address(0xB0B);
    address stranger = address(0xC0FFEE);

    // Mirror of the contract event so we can assert it with vm.expectEmit.
    event TilePlaced(
        address indexed player, uint256 indexed index, uint16 x, uint16 y, uint8 color
    );

    function setUp() public {
        turf = new PixelTurf();
        // Start well past 0 so lastPlacedAt sentinel handling is realistic.
        vm.warp(1_700_000_000);
    }

    function _packed(uint16 x, uint16 y) internal pure returns (uint256) {
        return uint256(y) * 32 + uint256(x);
    }

    // ----------------------------------------------------------------
    // Dimensions / constants are the single source of truth
    // ----------------------------------------------------------------

    function testCanvasConstants() public view {
        assertEq(turf.WIDTH(), 32);
        assertEq(turf.HEIGHT(), 32);
        assertEq(turf.TOTAL_TILES(), 1024);
        assertEq(turf.PLACEMENT_COOLDOWN(), 10 seconds);
    }

    // ----------------------------------------------------------------
    // Basic placement (check 6 storage + event, checks 6/7 support)
    // ----------------------------------------------------------------

    function testPlaceTileStoresColorAtPackedIndex() public {
        vm.prank(p1);
        turf.placeTile(3, 5, 7);

        assertEq(turf.tiles(_packed(3, 5)), 7);
        assertEq(turf.tiles(uint256(5) * 32 + 3), 7);
        // Neighbours are untouched.
        assertEq(turf.tiles(_packed(2, 5)), 0);
        assertEq(turf.tiles(_packed(3, 4)), 0);
    }

    // check 6: placement event carries coordinates and packed index
    function testPlaceTileEmitsEventWithCoordsAndIndex() public {
        vm.expectEmit(true, true, false, true, address(turf));
        emit TilePlaced(p1, _packed(3, 5), 3, 5, 7);

        vm.prank(p1);
        turf.placeTile(3, 5, 7);
    }

    // ----------------------------------------------------------------
    // check 3: cooldown enforced against msg.sender
    // ----------------------------------------------------------------

    function testCooldownBlocksSecondPlacement() public {
        vm.prank(p1);
        turf.placeTile(0, 0, 1);
        vm.prank(p1);
        vm.expectRevert(bytes("COOLDOWN"));
        turf.placeTile(1, 0, 1);
    }

    function testCooldownBoundaryIsInclusive() public {
        vm.prank(p1);
        turf.placeTile(0, 0, 1);
        // One second before the cooldown elapses: still blocked.
        vm.warp(block.timestamp + turf.PLACEMENT_COOLDOWN() - 1);
        vm.prank(p1);
        vm.expectRevert(bytes("COOLDOWN"));
        turf.placeTile(1, 0, 1);
        // Exactly at the boundary: allowed.
        vm.warp(block.timestamp + 1);
        vm.prank(p1);
        turf.placeTile(1, 0, 1);
        assertEq(turf.tiles(_packed(1, 0)), 1);
    }

    function testCooldownExpiresAllowsPlacement() public {
        vm.prank(p1);
        turf.placeTile(0, 0, 1);
        vm.warp(block.timestamp + turf.PLACEMENT_COOLDOWN() + 1);
        vm.prank(p1);
        turf.placeTile(0, 1, 2);
        assertEq(turf.tiles(_packed(0, 1)), 2);
    }

    // check 3: cooldown is keyed by the caller, not a supplied address
    function testCooldownIsPerAddress() public {
        vm.prank(p1);
        turf.placeTile(0, 0, 1);
        // p2 has never placed, so p2 may place immediately.
        vm.prank(p2);
        turf.placeTile(0, 1, 2);
        assertEq(turf.tiles(_packed(0, 1)), 2);
        // p1 is still on cooldown and p2's placement did not reset p1's clock.
        vm.prank(p1);
        vm.expectRevert(bytes("COOLDOWN"));
        turf.placeTile(1, 1, 3);
    }

    // ----------------------------------------------------------------
    // check 4: placement rejects out-of-bounds coordinates
    // ----------------------------------------------------------------

    function testOutOfBoundsXRejected() public {
        vm.prank(p1);
        vm.expectRevert(bytes("OUT_OF_BOUNDS"));
        turf.placeTile(32, 0, 1); // WIDTH == 32, valid x is 0..31
    }

    function testOutOfBoundsYRejected() public {
        vm.prank(p1);
        vm.expectRevert(bytes("OUT_OF_BOUNDS"));
        turf.placeTile(0, 32, 1); // HEIGHT == 32, valid y is 0..31
    }

    function testFarOutOfBoundsRejected() public {
        vm.prank(p1);
        vm.expectRevert(bytes("OUT_OF_BOUNDS"));
        turf.placeTile(type(uint16).max, type(uint16).max, 1);
    }

    function testCornerBoundsAccepted() public {
        vm.prank(p1);
        turf.placeTile(31, 31, 12);
        assertEq(turf.tiles(_packed(31, 31)), 12);
        assertEq(turf.tiles(1023), 12); // last packed index
    }

    // ----------------------------------------------------------------
    // check 5: only the player placement path writes tile state
    // ----------------------------------------------------------------

    /// @dev The contract exposes no owner/admin/batch/reset/clear path; the only
    ///      way `tiles` changes is a successful permissionless `placeTile`. This
    ///      test asserts the two observable halves of that invariant: placement
    ///      is permissionless, and a reverted placement never mutates a tile.
    function testOnlyPlacementWritesTileState() public {
        // Permissionless: any address, no allowlist / no owner.
        vm.prank(stranger);
        turf.placeTile(4, 4, 5);
        assertEq(turf.tiles(_packed(4, 4)), 5);

        // A refused placement (cooldown) must not change tile state.
        vm.prank(stranger);
        vm.expectRevert(bytes("COOLDOWN"));
        turf.placeTile(5, 4, 9);
        assertEq(turf.tiles(_packed(5, 4)), 0);
        assertEq(turf.tiles(_packed(4, 4)), 5);

        // A refused placement (out of bounds) must not change tile state.
        vm.warp(block.timestamp + turf.PLACEMENT_COOLDOWN() + 1);
        vm.prank(stranger);
        vm.expectRevert(bytes("OUT_OF_BOUNDS"));
        turf.placeTile(999, 0, 9);
        assertEq(turf.tiles(_packed(4, 4)), 5);
    }

    function testOnePlacementDoesNotDisturbOtherTiles() public {
        vm.prank(p1);
        turf.placeTile(0, 0, 1);
        vm.warp(block.timestamp + turf.PLACEMENT_COOLDOWN() + 1);
        vm.prank(p1);
        turf.placeTile(1, 0, 2);
        // Earlier tile persists.
        assertEq(turf.tiles(_packed(0, 0)), 1);
        assertEq(turf.tiles(_packed(1, 0)), 2);
    }

    function testEmptyColorRejected() public {
        vm.prank(p1);
        vm.expectRevert(bytes("EMPTY_COLOR"));
        turf.placeTile(0, 0, 0);
    }

    // ----------------------------------------------------------------
    // check 8: placement does not loop over the canvas
    // ----------------------------------------------------------------

    /// @dev Placement writes a fixed number of slots regardless of how many
    ///      tiles already exist. Compare the gas of a placement on an empty-ish
    ///      canvas with one after 200 prior placements.
    function testPlacementCostIsFixed() public {
        // Warm up one placement so both measured calls see the same warm
        // lastPlacedAt slot and both write a fresh (zero -> non-zero) tile.
        vm.prank(p1);
        turf.placeTile(0, 0, 1);
        vm.warp(block.timestamp + turf.PLACEMENT_COOLDOWN() + 1);

        uint256 gasBefore = gasleft();
        vm.prank(p1);
        turf.placeTile(1, 0, 1);
        uint256 gasEarly = gasBefore - gasleft();

        for (uint16 yy = 0; yy < 15; yy++) {
            for (uint16 xx = 0; xx < 14; xx++) {
                vm.warp(block.timestamp + turf.PLACEMENT_COOLDOWN() + 1);
                vm.prank(p1);
                turf.placeTile(xx, yy, 1);
            }
        }

        vm.warp(block.timestamp + turf.PLACEMENT_COOLDOWN() + 1);
        uint256 gasBeforeLate = gasleft();
        vm.prank(p1);
        turf.placeTile(30, 30, 1);
        uint256 gasLate = gasBeforeLate - gasleft();

        assertApproxEqAbs(gasEarly, gasLate, 500, "placement gas must not grow with tile count");
        assertLt(gasLate, 120_000, "placement must be a small fixed cost");
    }

    // ----------------------------------------------------------------
    // check 10 support: cooldown readable from the contract
    // ----------------------------------------------------------------

    function testNextPlacementTimeZeroBeforeFirstPlace() public view {
        assertEq(turf.nextPlacementTime(p1), 0);
    }

    function testNextPlacementTimeReflectsContractState() public {
        vm.prank(p1);
        turf.placeTile(0, 0, 1);
        uint256 expected = block.timestamp + turf.PLACEMENT_COOLDOWN();
        assertEq(turf.nextPlacementTime(p1), expected);
        assertEq(turf.lastPlacedAt(p1), block.timestamp);
        // Unaffected by other players.
        assertEq(turf.nextPlacementTime(p2), 0);
    }

    // ----------------------------------------------------------------
    // Stress: many placements, event-log reconstruction, cooldown at scale
    // ----------------------------------------------------------------

    /// @dev Deterministic stress of the write + reconstruction path (checks 5/6/7):
    ///      many players place many tiles, and folding the emitted `TilePlaced`
    ///      logs (latest wins) must reproduce the on-chain `tiles` mapping exactly.
    function testManyPlacementsReconstructFromEvents() public {
        uint256 players = 12;
        uint256 perPlayer = 5;
        uint256 expectedLogs = players * perPlayer;

        vm.recordLogs();
        for (uint256 pp = 0; pp < players; pp++) {
            address who = address(uint160(0x4000 + pp));
            for (uint256 k = 0; k < perPlayer; k++) {
                vm.warp(block.timestamp + turf.PLACEMENT_COOLDOWN() + 1);
                uint16 x = uint16((pp * 7 + k) % 32);
                uint16 y = uint16((pp * 3 + k * 5) % 32);
                uint8 color = uint8(1 + ((pp + k) % 12));
                vm.prank(who);
                turf.placeTile(x, y, color);
            }
        }
        Vm.Log[] memory logs = vm.getRecordedLogs();

        uint8[1024] memory folded;
        bool[1024] memory seen;
        bytes32 sig = keccak256("TilePlaced(address,uint256,uint16,uint16,uint8)");
        uint256 seenLogs = 0;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] != sig) continue;
            seenLogs++;
            uint256 index = uint256(logs[i].topics[2]);
            (,, uint8 color) = abi.decode(logs[i].data, (uint16, uint16, uint8));
            folded[index] = color; // latest placement wins
            seen[index] = true;
        }
        assertEq(seenLogs, expectedLogs, "one TilePlaced per placement");

        // Reconstruction from logs == on-chain state, tile by tile.
        for (uint256 i = 0; i < 1024; i++) {
            if (seen[i]) {
                assertEq(turf.tiles(i), folded[i], "log-reconstructed tile mismatch");
            } else {
                assertEq(turf.tiles(i), 0, "untouched tile must be empty");
            }
        }
    }

    /// @dev Cooldown is enforced per address at scale: N distinct senders may each
    ///      place once in the same block, are all then blocked, and all may place
    ///      again once the cooldown elapses.
    function testCooldownPerAddressAtScale() public {
        uint256 n = 30;
        for (uint256 i = 0; i < n; i++) {
            vm.prank(address(uint160(0x6000 + i)));
            turf.placeTile(uint16(i % 32), uint16(i / 32), uint8(1 + (i % 12)));
        }
        for (uint256 i = 0; i < n; i++) {
            vm.prank(address(uint160(0x6000 + i)));
            vm.expectRevert(bytes("COOLDOWN"));
            turf.placeTile(0, 0, 1);
        }
        vm.warp(block.timestamp + turf.PLACEMENT_COOLDOWN() + 1);
        for (uint256 i = 0; i < n; i++) {
            vm.prank(address(uint160(0x6000 + i)));
            turf.placeTile(1, 1, uint8(1 + (i % 12)));
        }
        assertEq(turf.tiles(_packed(1, 1)), uint8(1 + ((n - 1) % 12)));
    }

    // ----------------------------------------------------------------
    // Fuzz (bounded): invariants that must hold for all inputs
    // ----------------------------------------------------------------

    function testFuzz_OutOfBoundsAlwaysReverts(uint16 x, uint16 y) public {
        vm.assume(x >= 32 || y >= 32);
        vm.prank(p1);
        vm.expectRevert(bytes("OUT_OF_BOUNDS"));
        turf.placeTile(x, y, 1);
    }

    function testFuzz_EmptyColorAlwaysReverts(uint16 x, uint16 y) public {
        vm.assume(x < 32 && y < 32);
        vm.prank(p1);
        vm.expectRevert(bytes("EMPTY_COLOR"));
        turf.placeTile(x, y, 0);
    }

    /// @dev A valid placement writes the colour at exactly `y*WIDTH+x` and nothing
    ///      else in tile storage (single-slot, no loop).
    function testFuzz_PlacementWritesExactlyPackedIndex(uint16 x, uint16 y, uint8 color) public {
        vm.assume(x < 32 && y < 32 && color != 0);
        vm.prank(p1);
        turf.placeTile(x, y, color);

        assertEq(turf.tiles(_packed(x, y)), color);
        assertEq(turf.lastPlacedAt(p1), block.timestamp);
        assertEq(turf.nextPlacementTime(p1), block.timestamp + turf.PLACEMENT_COOLDOWN());
    }
}
