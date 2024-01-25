// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Admin.sol";
import "./Referral.sol";

// Collector contract deals with MEH referrals
contract Collector is Admin {

    address payable[] public referrals;  // list of referrals to withdraw eth from
    bool public constant isCollector = true;  // safe pairing with referrals
    bool public isSignedIn = false;  // is wrapper signed in to OldMeh
    uint8 public constant numOfHandshakes = 6;  // using last 6 referrals. See also MehWrapper.sol

    // all referrals must be registered through this function 
    function addRefferal(address payable newReferral) external onlyOwner {
        require(isSignedIn == false, 
            "Collector: Cannot add referrals after sign in");
        require(address(Referral(newReferral).wrapper()) == address(this), 
            "Collector: Referral is not owned by wrapper");
        referrals.push(newReferral);
    }

    // withrdaws money from all registered referrals
    // called during minting. Funds are used to payback flashloan
    function _withdrawFromReferrals() internal returns (uint256) {
        // using reverse order and do only 6 referrals
        // a way to add referrals if something goes wrong before wrapper signIn
        uint8 numOfRefs = uint8(referrals.length);
        uint8 collectedFrom = 0;
        uint256 totalFunds = 0;
        
        // withdrawing from 6 last referrals
        // console.log("Withdrawing from referrals, numOfRefs: %s, start index: %s", numOfRefs, numOfRefs-1);
        while (collectedFrom < numOfHandshakes) {
            totalFunds += Referral(referrals[numOfRefs-collectedFrom-1]).withdraw();
            collectedFrom++;
            // console.log("withdrawed from %s: %s", collectedFrom, referrals[numOfRefs-collectedFrom]);
            // console.log("total: ", totalFunds);
        }
        return totalFunds;
    }

    // admin can call this function in case someone buys from 2016MEH directly
    // or if someone sends funds to a referral directly
    // makes no sense in any other case. Referrals balance are always kept 0.
    // this func is only relevant before crowdsale ends
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