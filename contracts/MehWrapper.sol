// The ABI encoder is necessary, but older Solidity versions should work
pragma solidity ^0.8.0;
import "./Minter.sol";
// import "./WrapUnwrapper.sol";

contract MehWrapper is Minter {
    constructor(address meh2016address, address meh2018address, address wethAddress, address soloMarginAddress) Minter(wethAddress, soloMarginAddress) {    
        oldMeh = IOldMeh(meh2016address);
        meh2018 = IMeh2018(meh2018address);
    }
    // forward ads placement
    function placeImage(
        uint8 fromX, 
        uint8 fromY, 
        uint8 toX, 
        uint8 toY, 
        string calldata imageSourceUrl, 
        string calldata adUrl, 
        string calldata adText) 
    external 
    {   
        // only owner of pixels can place ads
        uint16[] memory blocks = blocksList(fromX, fromY, toX, toY);
        for (uint i = 0; i < blocks.length; i++) {
            require(_isApprovedOrOwner(msg.sender, blocks[i]), "Not a landlord");
        }

        oldMeh.placeImage(fromX, fromY, toX, toY, imageSourceUrl, adUrl, adText);
    } 
}