// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

import "./UsingGlobals.sol";
import "hardhat/console.sol";

contract Receiver is UsingGlobals {
    // Receives eth from WETH contract when converting weth to eth
    // Also receives eth from oldMEH when unwrapping blocks
    // prevents accidental sending of eth
    // TODO can we do it better? (mixing functionality here: flashloan and wrapper)
    // in current version wrapping and unwrapping won't work


    // TODO 
    // Something wrong here. Probably hardhat bug. Even console.log lines my brake code
    // try switching to parametric oldMeh and WETH - pass through constructor

    // TODO now remove receiver from referral, see what can be simplified now
    receive() external payable {
        // console.log("Receiver: received from %s", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
        // require(
            // msg.sender == address(WETH) || // should use this line, but had to use the following one
            // TODO also check why SoloMargin still works when commenting WETH address
            // msg.sender == address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2) ||  // hardhat bug?
            // msg.sender == address(oldMeh),
            // "Receiver: Only receives from oldMEH or WETH");
        // console.log("Receiver: ..."); // add this line to break code 🤷‍♂️ bug
        
        if (msg.sender == address(oldMeh)) {
            // console.log("Receiver: ...");
            console.log("Receiver: msg.sender ok");
        }
        console.log("received from %s", msg.sender);
    }
}