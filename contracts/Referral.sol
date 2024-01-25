pragma solidity ^0.8.0;

import "./Receiver.sol";
import "./Collector.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/IOldMeh.sol";

contract ReferralFactory {

    address immutable implementation;

    event NewReferral(address newReferralAddr, address previousReferal);

    constructor(address oldMehAddr, address previousReferal) public {
        address _implementation = address(new Referral());
        implementation = _implementation;
        initReferral(_implementation, oldMehAddr, previousReferal, msg.sender);
    }

    function createReferral(address oldMehAddr, address previousReferal) external returns (address) {
        address newRefAddress = Clones.clone(implementation);
        initReferral(newRefAddress, oldMehAddr, previousReferal, msg.sender);
        return newRefAddress;
    }

    function initReferral(address thisReferralAddr, address oldMehAddr, address previousReferal, address owner) internal {
        Referral(payable(thisReferralAddr)).initialize(oldMehAddr, previousReferal, owner);
        emit NewReferral(thisReferralAddr, previousReferal);
    }
}

contract Referral is Initializable,  OwnableUpgradeable{

    IOldMeh public oldMeh;
    Collector public wrapper;

    function initialize (
        address oldMehAddr,
        address previousReferal,
        address tempOwner
    ) external initializer {
        __Ownable_init();
        oldMeh = IOldMeh(oldMehAddr);
        oldMeh.signIn(previousReferal);
        transferOwnership(tempOwner);
    }

    function withdraw() external onlyOwner returns (uint256) {
        _withdrawFromMeh();
        return _sendFundsToWrapper();
    }

    function _withdrawFromMeh() internal {
        // console.log("fixing hardhat", address(this).balance);
        oldMeh.withdrawAll();
    }

    function _sendFundsToWrapper() internal returns (uint256) {
        uint256 amount = address(this).balance;
        wrapper.referralPayback{ value: amount }();
        return amount;
    }

    // for testing only (only test adapter got interface)
    function withdrawFromMeh() external onlyOwner {
        _withdrawFromMeh();
    }

    // for testing only (only test adapter got interface)
    function sendFundsToWrapper() external onlyOwner returns (uint256) {
        return _sendFundsToWrapper();
    }

    // setting wrapper after wrapper is deployed
    // (referrals are deployed prior to wrapper)
    function setWrapper(address wrapperAddr) external onlyOwner {
        require(Collector(wrapperAddr).isCollector() == true, 
            "Referral: contract is not collector");
        wrapper = Collector(wrapperAddr);
        transferOwnership(wrapperAddr);
    }

    receive() external payable {
    }
}