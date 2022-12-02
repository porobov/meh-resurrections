pragma solidity ^0.8.4;

import "./My15.sol";

// Mock of the original MEH
// Crowdsale price is always zero here
// Anyone can buy blocks for free 
// Intended to be used on a testnet, where we cannot mint 
// enough ETH for tests.

contract MillionEtherMock is MillionEther {
    
    function getBlockPrice (uint8 fromX, uint8 fromY, uint blocksSold) internal view override returns (uint) {
        if (blocks[fromX][fromY].landlord == address(0x0)) { 
                // when buying at initial sale price doubles every 1000 blocks sold
                return 0;
            } else {
                // when the block is already bought and landlord have set a sell price
                return blocks[fromX][fromY].sellPrice;
            }
        }
}