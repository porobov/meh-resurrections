// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Admin is Ownable {
    uint256 public crowdsalePrice = 0.25 ether;  // minting price
    // royalties - eth earned by wrapper
    // also used to rescue funds
    uint256 public royalties;
    address public founder = 0xa36c43FE4c9D56a4bd0Fbdc12ab70372fc75d7f4;
    address public adam;
    mapping(address => uint256) public internalBalOf;  // partners balances 

    // Coordinates reserved for founders
    uint8 constant FROM_X_RESERVED = 61;
    uint8 constant FROM_Y_RESERVED = 44;
    uint8 constant TO_X_RESERVED = 100;
    uint8 constant TO_Y_RESERVED = 68;

    // splitting income here to offload minting function
    function splitIncome() internal {
        uint256 foundersShare = royalties * 85 / 100;
        internalBalOf[founder] += foundersShare;
        internalBalOf[adam] += (royalties - foundersShare);
        royalties = 0;
    }

    function withdrawIncome() external {
        require(msg.sender == founder || msg.sender == adam, "Not a beneficiary");
        splitIncome();
        internalBalOf[msg.sender] = 0;
        payable(msg.sender).transfer(internalBalOf[msg.sender]); // todo is this ok?
    }

    function setAdam(address newAdamsAddress) external {
        require(msg.sender == adam, "Not Adam");
        adam = newAdamsAddress;
    }

    function setPeter(address newPetersAddress) external {
        require(msg.sender == founder, "Not Peter");
        founder = newPetersAddress;
    }
    
    function adminSetPrice(uint256 newPrice) external onlyOwner {
        crowdsalePrice = newPrice;
    }
}