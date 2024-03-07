pragma solidity ^0.8.0;

import "../balancer-labs/solidity-utils/misc/IWETH.sol";
import "../balancer-labs/solidity-utils/openzeppelin/IERC20.sol";
import "../Flashloaner.sol";
import "hardhat/console.sol";

contract BalancerVaultMock {

    IWETH public WETH;

    constructor (address wethAddress) {
        WETH = IWETH(wethAddress);
    }

    function flashLoan(
        address payable receiver,
        IERC20[] memory tokens,
        uint256[] memory amounts,
        bytes memory userData
    ) external {
        // send WETH to wrapper
        uint256 loanAmount = amounts[0];
        require(loanAmount <= WETH.balanceOf(address(this)), "BAL#528");
        console.log("Balancer vault eth bal:", WETH.balanceOf(address(this)));
        console.log("Balancer vault eth bal:", address(this).balance);
        WETH.transfer(receiver, loanAmount);

        // the following console.log line fixes some hardhat bug
        // without this line flashloan.js test fails even though
        // Vault does not deal with Eth at all
        // set fees to zero (as in real balancer)
        uint256[] memory feeAmounts = new uint256[](1);
        feeAmounts[0] = 0;

        // init wrapper
        Flashloaner wrapper = Flashloaner(receiver);

        // forward other params and call wrapper
        wrapper.receiveFlashLoan(tokens, amounts, feeAmounts, userData);
    }
}