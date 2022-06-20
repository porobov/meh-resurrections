// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

import "./UsingGlobals.sol";

contract Receiver is UsingGlobals {
    // Receives eth from WETH contract when converting weth to eth
    // Also receives eth from oldMEH when unwrapping blocks
    // prevents accidental sending of eth
    // TODO can we do it better? (mixing functionality here: flashloan and wrapper)
    // in current version wrapping and unwrapping won't work
    receive() external payable {
        require(
            msg.sender == address(WETH) || msg.sender == address(oldMeh),
            "Only receives from oldMEH or WETH");
    }
}