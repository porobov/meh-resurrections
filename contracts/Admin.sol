// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Admin is Ownable {
    uint256 public crowdsalePrice = 0.25 ether;  // minting price
    // royalties - eth earned by wrapper (also used to rescue funds)
    uint256 public royalties;
    address public founder = 0xa36c43FE4c9D56a4bd0Fbdc12ab70372fc75d7f4;
    address public partners = 0x690B9A9E9aa1C9dB991C7721a92d351Db4FaC990;
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
        internalBalOf[partners] += (royalties - foundersShare);
        royalties = 0;
    }

    function withdrawShare() external {
        require(msg.sender == founder || msg.sender == partners, 
            "Admin: Not an authorized beneficiary");
        require(royalties > 0, 
            "Admin: No royalties yet, work harder!");
        splitIncome();
        internalBalOf[msg.sender] = 0;
        payable(msg.sender).transfer(internalBalOf[msg.sender]);
    }

    function setPartners(address newPartnerssAddress) external {
        // withdraw first
        require(msg.sender == partners, "Admin: Not partner");
        partners = newPartnerssAddress;
    }
    
    function setFounder(address newFoundersAddress) external {
        // withdraw first
        require(msg.sender == founder, "Admin: Not founder");
        founder = newFoundersAddress;
    }
    
    function adminSetPrice(uint256 newPrice) external onlyOwner {
        crowdsalePrice = newPrice;
    }
}