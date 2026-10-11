// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Pixel Turf — a shared canvas nobody can wipe
/// @notice One fixed-size canvas. Any address may place a coloured tile at a
///         position, at most once per fixed cooldown. There is no owner, no
///         admin, no batch, reset or clear function: the cooldown-limited
///         player placement path is the only code that writes tile state, so no
///         one — visibly not even a host — can erase the canvas.
contract PixelTurf {
    /// @dev Canvas size. The packed tile index is `y * WIDTH + x`.
    uint16 public constant WIDTH = 32;
    uint16 public constant HEIGHT = 32;
    uint16 public constant TOTAL_TILES = WIDTH * HEIGHT; // 1024

    /// @dev Fixed time each address must wait between placements.
    uint256 public constant PLACEMENT_COOLDOWN = 10 seconds;

    /// @dev Colour 0 is reserved for "empty" and is rejected, so a placement can
    ///      never wipe an existing tile. Real palette colours are 1..12.
    uint8 public constant EMPTY = 0;

    /// @dev packed index (y * WIDTH + x) => colour index.
    mapping(uint256 => uint8) public tiles;

    /// @dev player => block timestamp of their last placement (0 = never).
    mapping(address => uint256) public lastPlacedAt;

    /// @notice Emitted on every successful placement. Carries the packed index
    ///         and the x/y coordinates, so the full canvas can be rebuilt from
    ///         logs alone.
    event TilePlaced(
        address indexed player, uint256 indexed index, uint16 x, uint16 y, uint8 color
    );

    /// @notice Place a coloured tile at (x, y).
    /// @dev Enforces bounds, rejects the empty colour, and enforces the cooldown
    ///      keyed by the caller. Writes a fixed number of storage slots (one
    ///      tile + one timestamp): no loop over the canvas or tile array, so the
    ///      cost does not grow with the size of the world.
    /// @param x column, 0 .. WIDTH-1.
    /// @param y row, 0 .. HEIGHT-1.
    /// @param color palette index, 1..255 (0 is rejected).
    function placeTile(uint16 x, uint16 y, uint8 color) external {
        require(x < WIDTH && y < HEIGHT, "OUT_OF_BOUNDS");
        require(color != EMPTY, "EMPTY_COLOR");

        uint256 last = lastPlacedAt[msg.sender];
        require(last == 0 || block.timestamp >= last + PLACEMENT_COOLDOWN, "COOLDOWN");

        lastPlacedAt[msg.sender] = block.timestamp;

        uint256 index = uint256(y) * WIDTH + uint256(x);
        tiles[index] = color;

        emit TilePlaced(msg.sender, index, x, y, color);
    }

    /// @notice Timestamp at which `player` may next place a tile (0 = now/already).
    /// @dev The frontend reads this to show the cooldown from contract state.
    function nextPlacementTime(address player) external view returns (uint256) {
        uint256 last = lastPlacedAt[player];
        if (last == 0) return 0;
        return last + PLACEMENT_COOLDOWN;
    }
}
