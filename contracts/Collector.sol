// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Admin.sol";
import "./Referral.sol";

// Collector contract deals with MEH referrals
contract Collector is Admin {

    address payable[] public referrals;  // list of referrals to withdraw eth from
    bool public isCollector = true;  // safe pairing with referrals
    
    // all referrals must be registered through this function
    function addRefferal(address payable newReferral) external onlyOwner {
        require(Referral(newReferral).isReferral() == true, 
            "Collector: contract is not a referral");
        referrals.push(newReferral);
    }

    // withrdaws money from all registered referrals
    // called during minting. Funds are used to payback flashloan
    function _withdrawFromReferrals() internal returns (uint256) {
        // using reverse order and do only 6 referrals
        // a way to upgrade referrals
        uint8 numOfRefs = uint8(referrals.length);
        uint8 collectedFrom = 0;
        uint256 totalFunds = 0;
        
        // withdrawing from 6 last referrals
        console.log("Withdrawing from referrals start index: %s", numOfRefs);
        while (collectedFrom < 6) {
            totalFunds += Referral(referrals[numOfRefs-collectedFrom-1]).withdraw();
            collectedFrom++;
            console.log("withdrawed from %s: %s", collectedFrom, referrals[numOfRefs-collectedFrom]);
            console.log("total: ", totalFunds);
        }
        return totalFunds;
    }

    // admin can call this function in case someone buys from 2016MEH directly
    // or if someone sends funds to a referral directly
    // makes no sense in any other case. Referrals balance are always kept 0.
    // this func is only relevant after crowdsale ends.
    function adminWithdrawFromReferrals() external onlyOwner {
        uint256 amount = _withdrawFromReferrals();
        payable(owner()).transfer(amount);
    }

    // Referrals send eth back to wrapper through this function
    // note: not checking for sender - optimizing for gas
    // Minter.sol handles excess funds
    function referralPayback() external payable {
    }
}