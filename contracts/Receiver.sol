// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

import "./UsingGlobals.sol";
import "hardhat/console.sol";

// Receives eth from WETH contract when converting weth to eth
// Also receives eth from oldMEH when unwrapping blocks
contract Receiver is UsingGlobals {

    receive() external payable {
        require((
            msg.sender == address(oldMeh) ||
            msg.sender == address(WETH)),
            "Receiver: Only receives from oldMEH or WETH");
    }
}