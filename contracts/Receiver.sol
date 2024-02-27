// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

import "./UsingGlobals.sol";
// import "hardhat/console.sol";

// Receives eth from WETH contract when converting weth to eth
// Also receives eth from oldMEH when unwrapping blocks
contract Receiver is UsingGlobals {
    receive() external payable {
        // the console.log's here are meant to fix some hardhat bug
        // turn them on for testing locally with mocks (no hardfork)
        // console.log("....Receiver. msg.sender", msg.sender);
        // console.log("....Receiver. address(WETH)", address(WETH));
        require((
            msg.sender == address(oldMeh) ||
            // hardhat bug, uncomment the line below to fix flashloaner.js tests.
            // address(WETH) returns same address, but in lower case - reason?
            // safe to use real weth address in production
            // but may be harmfull if using hardhat's mocked address
            // TODO check before production deployment
            msg.sender == 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 ||  
            msg.sender == address(WETH)
            ), "Receiver: Only receives from oldMEH or WETH");
        // console.log("Flashloaner contract eth balance", address(this).balance);
    }
}