// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Admin is Ownable {

    uint256 public crowdsalePrice = 0.25 ether;  // minting price

    uint256 public royalties;  // eth earned by wrapper
    mapping(address => uint256) public internalBalOf;  // partners balances 
    address public peter;
    address public adam;

    // splitting income here to offload minting function
    function splitIncome() internal {
        uint256 petersShare = royalties * 85 / 100;
        internalBalOf[peter] += petersShare;
        internalBalOf[adam] += (royalties - petersShare);
        royalties = 0;
    }

    function withdrawIncome() external {
        require(msg.sender == peter || msg.sender == adam, "Not a beneficiary");
        splitIncome();
        internalBalOf[msg.sender] = 0;
        payable(msg.sender).transfer(internalBalOf[msg.sender]); // todo is this ok?
    }

    function setAdam(address newAdamsAddress) external {
        require(msg.sender == adam, "Not Adam");
        adam = newAdamsAddress;
    }

    function setPeter(address newPetersAddress) external {
        require(msg.sender == peter, "Not Peter");
        peter = newPetersAddress;
    }
    
    function adminSetPrice(uint256 newPrice) external onlyOwner {
        crowdsalePrice = newPrice;
    }
}