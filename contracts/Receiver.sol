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
            // hardhat bug, uncomment the line below to fix flashloaner.js tests.
            // address(WETH) returns same address, but in lower case - reason?
            // msg.sender == 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 ||  
            msg.sender == address(WETH)
            ), "Receiver: Only receives from oldMEH or WETH");
    }
}