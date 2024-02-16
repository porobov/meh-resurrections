pragma solidity ^0.8.0;
import "./Minter.sol";

contract MehWrapper is Minter {
    constructor(address meh2016address, address meh2018address, address wethAddress, address soloMarginAddress) Minter(wethAddress, soloMarginAddress) {
        oldMeh = IOldMeh(meh2016address);
        meh2018 = IMeh2018(meh2018address);
        // // check pairing
        (
            uint _numUsers, 
            uint16 _blocksSold, 
            uint _totalWeiInvested, 
            uint _numImages, 
            uint _setting_imagePlacementPriceInWei,
            uint _numNewStatus,
            uint32 _setting_delay
        ) = oldMeh.getStateInfo();
        require(_setting_delay != 0, "MehWrapper: wrong Meh2016 contract");
        require(meh2018.isMEH() == true, "MehWrapper: wrong Meh2018 contract");
        require(IWETH(wethAddress).totalSupply() > 100000, "MehWrapper: wrong Weth contract");
        require(address(IVault(soloMarginAddress).WETH()) == wethAddress, "MehWrapper: wrong Flashloan platform contract");
    }

    // this wrapper contract is a referral too (must sign in)
    function signIn() external onlyOwner {
        uint8 numOfRefs = uint8(referrals.length);
        require(numOfRefs >= numOfHandshakes, "MehWrapper: not enough referrals");
        // check chain of referrals
        // (checking only numOfHandshakes - 1 referrals)
        for(uint8 i = numOfRefs - 1;  i >= numOfRefs - numOfHandshakes + 1; i--) {
            (
                address prevRef,
                uint8 handshakes,
                uint balance,
                uint32 activationTime,
                bool banned,
                uint userID,
                bool refunded,
                uint investments
            ) = oldMeh.getUserInfo(referrals[i]);
            require(prevRef == referrals[i - 1], 
                "MehWrapper: referrals chain is broken");
        }
        // signing in with the last registered referral
        oldMeh.signIn(referrals[numOfRefs - 1]);
        isSignedIn = true;  // cannot add referrals after this
    }

    // forward ads placement
    // Function made payable as hommage to MEH 2016 (community will decide what 
    // to do with it)
    function placeImage(
        uint8 fromX,
        uint8 fromY,
        uint8 toX,
        uint8 toY,
        string calldata imageSourceUrl,
        string calldata adUrl,
        string calldata adText)
    external payable
    {
        // only owner of blocks can place ads
        // (must be minted or wrapped)
        uint16[] memory blocks = blocksList(fromX, fromY, toX, toY);
        for (uint i = 0; i < blocks.length; i++) {
            require(_isApprovedOrOwner(msg.sender, blocks[i]), 
                "MehWrapper: Not a landlord");
        }
        // forwarding payment to MEH 2016
        oldMeh.placeImage
            {value: msg.value}
            (fromX, fromY, toX, toY, imageSourceUrl, adUrl, adText);
    }


    // function restrictAccess(
    //     uint8 fromX,
    //     uint8 fromY,
    //     uint8 toX,
    //     uint8 toY,
    //     bool restrict)
    // external
    // {
    //     // only owner of blocks can deside to restrict access to the area they own
    //     uint16[] memory blocks = blocksList(fromX, fromY, toX, toY);
    //     for (uint i = 0; i < blocks.length; i++) {
    //         require(_isApprovedOrOwner(msg.sender, blocks[i]), 
    //             "MehWrapper: Not a landlord");
    //         isRestricted[i] = restrict;
    //     }
    // }
}