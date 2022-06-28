pragma solidity ^0.8.0;

// import "@openzeppelin/contracts/proxy/Clones.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";
import "./Receiver.sol";
import "./Collector.sol";
import "hardhat/console.sol";
import '@openzeppelin/contracts/proxy/Clones.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
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
    Collector private wrapper;
    // address public wrapperAddress;

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

    function withdraw() external {
        require(
            msg.sender == address(wrapper),
            "Only wrapper can withdraw");
        oldMeh.withdrawAll();
        wrapper.referralPayback{value:address(this).balance}();
    }

    // seeting wrapper after wrapper is deployed
    // (referrals are deployed prior to wrapper)
    function setWrapper(address wrapperAddr) external onlyOwner {
        // TODO check pairing
        wrapper = Collector(wrapperAddr);
        // revoke ownership from current admin
        transferOwnership(wrapperAddr);
    }

    receive() external payable {
        // console.log("Receiver: received from %s", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
        require(
            msg.sender == address(oldMeh),
            "Referral: Only receives from oldMEH");
        // console.log("Receiver: ..."); // add this line to break code 🤷‍♂️ bug
        
        if (msg.sender == address(oldMeh)) {
            // console.log("Receiver: ...");
            console.log("Receiver: msg.sender ok");
        }
        // console.log("received from %s", msg.sender);
    }
}