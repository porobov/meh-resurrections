// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

interface IOldMeh {
    function signIn (address) external;
    function withdrawAll() external;
    function buyBlocks(uint8, uint8, uint8, uint8) external payable returns(uint256);
    function sellBlocks(uint8, uint8, uint8, uint8, uint256) external;
    function getAreaPrice(uint8, uint8, uint8, uint8) external view returns(uint256);
    function getBlockInfo(uint8, uint8) external view returns (address, uint, uint);
    function getUserInfo (address) external view returns (
        address referal,
        uint8 handshakes,
        uint balance,
        uint32 activationTime,
        bool banned,
        uint userID,
        bool refunded,
        uint investments);
    function placeImage(uint8, uint8, uint8, uint8, string calldata, string calldata, string calldata) external payable; //todo calldata ok
    function charityAddress() external view returns(address);  // used for pairing wrapper and oldMeh
}