pragma solidity ^0.8.0;

// import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./UsingConstants.sol";

interface IWrapper {
    function referralPayback() external payable;
}

contract Referral is UsingConstants, Ownable {

    // IOldMeh private oldMeh;
    IWrapper private wrapper;

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
        wrapper = IWrapper(wrapperAddr);
    }

    receive() external payable {
        require(
            msg.sender == address(oldMeh), 
            "Can only receive from Old Meh");
    }
}