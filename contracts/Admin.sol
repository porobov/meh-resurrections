// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Admin is Ownable {
    uint256 public crowdsalePrice = 0.25 ether;  // minting price
    // royalties - eth earned by wrapper
    uint256 public royalties;
    address public founder = 0xa36c43FE4c9D56a4bd0Fbdc12ab70372fc75d7f4;
    address public partners = 0x690B9A9E9aa1C9dB991C7721a92d351Db4FaC990;
    address public devs = 0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5;
    mapping(address => uint256) public internalBalOf;  // internal balances 

    // Coordinates reserved for founders
    uint8 constant FROM_X_RESERVED = 55;
    uint8 constant FROM_Y_RESERVED = 70;
    uint8 constant TO_X_RESERVED = 94;  // width 40
    uint8 constant TO_Y_RESERVED = 94;  // height 25

    event NewCrowdsalePrice(uint256 newPrice);

    // splitting income here to offload minting function
    function splitIncome() internal {
        uint256 foundersShare = royalties * 84 / 100;
        uint256 partnersShare = royalties * 15 / 100;
        internalBalOf[founder] += foundersShare;
        internalBalOf[partners] += partnersShare;
        internalBalOf[devs] += (royalties - foundersShare - partnersShare);
        royalties = 0;
    }

    function withdrawShare() external {
        require(msg.sender == founder || msg.sender == partners || msg.sender == devs, 
            "Admin: Not an authorized beneficiary");
        splitIncome();
        payable(msg.sender).transfer(internalBalOf[msg.sender]);
        internalBalOf[msg.sender] = 0;
    }

    function setFounder(address newFoundersAddress) external {
        require(msg.sender == founder, "Admin: Not founder");
        internalTransfer(founder, newFoundersAddress);
        founder = newFoundersAddress;
    }

    function setPartners(address newPartnersAddress) external {
        require(msg.sender == partners, "Admin: Not partner");
        internalTransfer(partners, newPartnersAddress);
        partners = newPartnersAddress;
    }
    
    function setDevs(address newDevsAddress) external {
        require(msg.sender == devs, "Admin: Not devs");
        internalTransfer(devs, newDevsAddress);
        devs = newDevsAddress;
    }

    function internalTransfer(address from, address to) internal {
        internalBalOf[to] += internalBalOf[from];
        internalBalOf[from] = 0;
    }

    function adminSetPrice(uint256 newPrice) external onlyOwner {
        crowdsalePrice = newPrice;
        emit NewCrowdsalePrice(newPrice);
    }
}