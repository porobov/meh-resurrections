// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

import "./interfaces/IOldMeh.sol";
import "./interfaces/IMeh2018.sol";

// Collector contract deals with MEH referrals
contract UsingGlobals {
    IOldMeh public oldMeh;
    IMeh2018 public meh2018;
}
