pragma solidity ^0.8.0;

// import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Receiver.sol";
import "./Collector.sol";
import "hardhat/console.sol";


contract Referral is Receiver, Ownable {

    Collector private wrapper;

    constructor (address oldMehAddr, address referal) {
        oldMeh = IOldMeh(oldMehAddr);
        oldMeh.signIn(referal);
    }

    function withdraw() external {
        require(
            msg.sender == address(wrapper),
            "Only wrapper can withdraw");
        oldMeh.withdrawAll();
        wrapper.referralPayback{value:address(this).balance}();
    }

    function setWrapper(address wrapperAddr) external onlyOwner {
        wrapper = Collector(wrapperAddr);
    }

    // Using receive function from Receiver
    // Can receive ETH from WETH contract. That's ok.
}