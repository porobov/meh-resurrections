pragma solidity ^0.8.0;

// import "./interfaces/IWeth.sol";
import "./balancer-labs/vault/IVault.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "hardhat/console.sol";
import "./Receiver.sol";

contract Flashloaner is IFlashLoanRecipient, Receiver {
    IVault private vault;
    // in case Balancer introduces fees for flashloans, currently fees are 0
    // we will have to manually update minting price if this happens
    uint8 MAX_FEE_PERCENT = 1;

    constructor(address wethAddress, address soloMarginAddress) {
        WETH = IWETH(wethAddress);
        vault = IVault(soloMarginAddress);
    }
    function _borrow(uint256 loanAmount, address buyer, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) internal {
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = WETH;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = loanAmount;
        bytes memory userData = abi.encode(buyer, fromX, fromY, toX, toY);

        vault.flashLoan(this, tokens, amounts, userData);
    }

    function receiveFlashLoan(
        IERC20[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external override {
        require(msg.sender == address(vault), "Flashloaner: Caller is not loanPlatform");
        uint256 loanAmount = amounts[0];
        (
            address buyer,
            uint8 fromX,
            uint8 fromY,
            uint8 toX,
            uint8 toY
        ) = abi.decode(userData, (address, uint8, uint8, uint8, uint8));
        uint256 fees = feeAmounts[0];
        require(fees / loanAmount * 100 <= MAX_FEE_PERCENT, "Flashloaner: fees are too high");

        require(WETH.balanceOf(address(this)) >= loanAmount, 
            "CANNOT REPAY LOAN");
        // convert WETH to eth
        WETH.withdraw(loanAmount);
        // buy from MEH and get all the money back
        console.log("Flashloaner eth bal:", WETH.balanceOf(address(this)));
        console.log("Flashloaner eth bal:", address(this).balance);
        _buyFromMEH(loanAmount, buyer, fromX, fromY, toX, toY);
        // convert ETH to back to weth
        WETH.deposit{value:loanAmount}();
        // repay
        WETH.transfer(msg.sender, loanAmount + fees);
    }



    // is called by loanPlatform (see callFunction function above)
    // overriden in Minter.sol
    function _buyFromMEH(uint256 price, address buyer, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) virtual internal {
    }
}