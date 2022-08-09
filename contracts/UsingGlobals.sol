// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

import "./interfaces/IOldMeh.sol";
import "./interfaces/IWeth.sol";
import "./interfaces/IMeh2018.sol";

// Collector contract deals with MEH referrals
contract UsingGlobals {
    IOldMeh internal oldMeh = IOldMeh(0x15dbdB25f870f21eaf9105e68e249E0426DaE916);
    // The WETH token contract, since we're assuming we want a loan in WETH
    IWETH internal WETH = IWETH(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    IMeh2018 internal meh2018 = IMeh2018(0xCEf41878Db032586C835eE0890484399402A64f6);
}
