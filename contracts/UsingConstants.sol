// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

// import "./IOldMeh.sol";

interface IOldMeh {
    function signIn (address) external;
    function withdrawAll() external;
    function buyBlocks(uint8, uint8, uint8, uint8) external payable returns(uint256);
    function sellBlocks(uint8, uint8, uint8, uint8, uint256) external;
    function getAreaPrice(uint8, uint8, uint8, uint8) external view returns(uint256);
    function getBlockInfo(uint8, uint8) external view returns (address, uint, uint);
    function placeImage(uint8, uint8, uint8, uint8, string calldata, string calldata, string calldata) external payable; //todo calldata ok
}

// Collector contract deals with MEH referrals
contract UsingConstants {
    IOldMeh internal oldMeh = IOldMeh(0x15dbdB25f870f21eaf9105e68e249E0426DaE916);

}