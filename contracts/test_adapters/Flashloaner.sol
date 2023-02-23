pragma solidity ^0.8.0;
import "../Flashloaner.sol";

contract FlashloanerAdapter is Flashloaner {
    
    constructor (address wethAddress, address soloMarginAddress) public 
        Flashloaner(wethAddress, soloMarginAddress) {}

    function borrowExt(uint256 loanAmount, address buyer, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) external {
        _borrow(loanAmount, buyer, fromX, fromY, toX, toY);
    }
}