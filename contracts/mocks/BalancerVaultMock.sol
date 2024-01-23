pragma solidity ^0.8.0;

import "./balancer-labs/solidity-utils/misc/IWETH.sol";
import "../contracts/Flashloaner.sol:";

contract BalancerVaultMock {

    IWETH public WETH;
    Flashloaner public wrapper;

    constructor (wethAddress, wrapperAddress) {
        WETH = IWETH(wethAddress);
        wrapper = Flashloaner(wrapperAddress);
    }

    // vault.flashLoan(this, tokens, amounts, userData);
    function flashLoan(this, tokens, amounts, userData) {

        // send WETH to wrapper
        uint256 loanAmount = amounts[0];
        WETH.transfer(msg.sender, loanAmount);

        // set fees to zero (as in real balancer)
        uint256[] memory feeAmounts = new uint256[](1);
        feeAmounts[0] = 0;
        // forward other params and call wrapper
        wrapper.receiveFlashLoan(tokens, amounts, feeAmounts, userData);
    }
}