// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

interface IMeh2018 {
    function getBlockOwner(uint8 x, uint8 y) external view returns (address owner);
    // function ownerOf(uint256 tokenId) external view returns (address owner);
}
