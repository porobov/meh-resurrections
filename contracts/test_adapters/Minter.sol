pragma solidity ^0.8.0;
import "../MehWrapper.sol";

// adapter to make internal functions external
// using adapter above MehWrapper to simplify deployment
contract MinterAdapter is MehWrapper {

    constructor(address meh2016address, address meh2018address, address wethAddress, address soloMarginAddress) 
        MehWrapper(meh2016address, meh2018address, wethAddress, soloMarginAddress) {}

    // constructor(address wethAddress, address soloMarginAddress) Minter(wethAddress, soloMarginAddress) {}

    function _landlordFrom2018Ext(uint8 x, uint8 y) external view returns (address) {
        return _landlordFrom2018(x, y);
    }

    function _landlordFrom2016Ext(uint8 x, uint8 y) external view returns (address) {
        return _landlordFrom2016(x, y);
    }

    function _reservedForExt(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) external view returns (address) {
        return _reservedFor(fromX, fromY, toX, toY);
    }

    function _areaCrowdsalePriceExt(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) external view returns (uint256) {
        return _areaCrowdsalePrice(fromX, fromY, toX, toY);
    }

    function _borrowAndBuyFromMEHExt(address buyer, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) external {
        return _borrowAndBuyFromMEH(buyer, fromX, fromY, toX, toY);
    }

    function _buyFromMEHExt(uint256 price, address buyer, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) external {
        return _buyFromMEH(price, buyer, fromX, fromY, toX, toY);
    }

}