pragma solidity ^0.8.0;

import "./interfaces/IEuler.sol";
import "./interfaces/IWeth.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "hardhat/console.sol";
import "./Receiver.sol";

contract Flashloaner is IFlashLoan, Receiver {
    // The dydx Solo Margin contract, as can be found here:
    // https://github.com/dydxprotocol/solo/blob/master/migrations/deployed.json
    IEuler public loanPlatform;
    IEulerMarkets public markets;
    IEulerDToken public dToken;
    // from https://github.com/euler-xyz/euler-contracts/blob/master/contracts/Constants.sol
    uint internal constant MODULEID__MARKETS = 2;

    constructor(address wethAddress, address soloMarginAddress) {
        WETH = IWETH(wethAddress);
        loanPlatform = IEuler(soloMarginAddress);
    }
    
    // ** FLASHLOAN ** //
    
    function _borrow(uint256 loanAmount, address buyer, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) internal {
        markets = IEulerMarkets(loanPlatform.moduleIdToProxy(MODULEID__MARKETS)); // 0x3520d5a913427E6F0D6A83E07ccD4A4da316e4d3);
        dToken = IEulerDToken(markets.underlyingToDToken(address(WETH)));  // checking on every loan in case if market changes
        dToken.flashLoan(loanAmount, abi.encode(loanAmount, buyer, fromX, fromY, toX, toY));
    }
    
    function onFlashLoan(bytes memory data) external override {
        require(msg.sender == address(loanPlatform), "Flashloaner: Caller is not loanPlatform");
        (
            uint256 loanAmount,
            address buyer,
            uint8 fromX,
            uint8 fromY,
            uint8 toX,
            uint8 toY
        ) = abi.decode(data, (uint256, address, uint8, uint8, uint8, uint8));

        require(WETH.balanceOf(address(this)) >= loanAmount, 
            "CANNOT REPAY LOAN");
        // convert WETH to eth
        WETH.withdraw(loanAmount);
        // buy from MEH and get all the money back
        _buyFromMEH(loanAmount, buyer, fromX, fromY, toX, toY);
        // convert ETH to back to weth
        WETH.deposit{value:loanAmount}();
        // repay
        WETH.transfer(msg.sender, loanAmount);
    }

    // is called by loanPlatform (see callFunction function above)
    // overriden in Minter.sol
    function _buyFromMEH(uint256 price, address buyer, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) virtual internal {
    }
}