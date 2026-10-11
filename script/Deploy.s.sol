// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {PixelTurf} from "../src/PixelTurf.sol";

/// @notice Deploys PixelTurf to Ethereum Sepolia (chain id 11155111).
/// @dev Reads PRIVATE_KEY and SEPOLIA_RPC_URL from the environment. Never commit them.
///      Usage:
///        forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast
///      The contract takes no constructor arguments: canvas size and cooldown
///      are fixed constants compiled into the bytecode.
contract Deploy is Script {
    function run() external returns (PixelTurf turf) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);
        turf = new PixelTurf();
        vm.stopBroadcast();
        console2.log("PixelTurf deployed at:", address(turf));
    }
}
