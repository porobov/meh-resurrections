// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./UsingGlobals.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Referral.sol";

// Collector contract deals with MEH referrals
contract Collector is UsingGlobals, Ownable {

    address payable[] public referrals;  // list of referrals to withdraw eth from

    // this wrapper contract is a referral too (must sign in)
    function signIn(address referral) external onlyOwner {
        oldMeh.signIn(referral);
    }
    // all referrals must be registered through this function
    function addRefferal(address newReferral) external onlyOwner {
        // leaving some flexibility - pushing as many referrals as needed 
        // (a way to upgrade referrals)
        referrals.push(payable(newReferral));
    }

    // withrdaws money from all registered referrals
    function _withdrawFromReferrals() internal {
        // using reverse order and do only 6 referrals
        // a way to upgrade referrals
        console.log("... _withdrawFromReferrals");
        for (uint i = 5; i > 0; i--) {
            Referral(referrals[i]).withdraw();
            console.log("... withdrawed from %s: %s", i, referrals[i]);
        }
    }

    // admin can call this function in case someone buys from 2016MEH directly
    // makes no sense in any other case. Referrals balance are always kept 0. 
    function adminWithdrawFromReferrals() external onlyOwner {
        _withdrawFromReferrals();
    }

    // Referrals send eth back to wrapper through this function
    function referralPayback() external payable {
        // note: not checking for sender - optimizing for gas
    }

    // doesn't need receive function referrals pay via referralPayback()
}