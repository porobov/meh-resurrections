// The ABI encoder is necessary, but older Solidity versions should work
pragma solidity ^0.8.0;
// import "./UsingGlobals.sol";
// import "./UsingTools.sol";
import "./Flashloaner.sol";
import "./Collector.sol";
import "./MehERC721.sol";
import "./Admin.sol";

contract Minter is MehERC721, Flashloaner, Collector, Admin {

    // Coordinates reserved for founders
    uint8 X_RESERVED_FROM = 77;
    uint8 X_RESERVED_TO = 77;
    uint8 Y_RESERVED_FROM = 77;
    uint8 Y_RESERVED_TO = 77;

    function _landlordFrom2018(uint8 x, uint8 y) internal view returns (address) {
        address landlord = address(0);
        console.log("......x, y", x, y);
        // try meh2018.ownerOf(i) returns (address landlord2018) {  // todo why this doesn't work? check starting block
        // use coordinates (54,54). they are present on 2018 contract and not minted in 2016
        // getBlockOwner function fails on empty coordinates => using try/catch
        // note WARNING 2018 contract got both 2016 and 2018 pixels
        try meh2018.getBlockOwner(x, y) returns (address landlord2018) {
            console.log("......landlord2018", landlord2018);
            landlord = landlord2018;
        } catch (bytes memory reason) {
            console.log("......reason");
        }
        return landlord;
    }

    function _landlordFrom2016(uint8 x, uint8 y) internal view returns (address) {
        (address landlord, uint u, uint256 s) = oldMeh.getBlockInfo(x,y);
        return landlord;
    }

    function _isReservedForFounders(uint8 x, uint8 y) internal view returns (bool) {
        if (x >= X_RESERVED_FROM &&
            x <= X_RESERVED_TO &&
            y >= Y_RESERVED_FROM &&
            y <= Y_RESERVED_TO) {
            return true;
        } else {
            return false;
        }
    }

    // ordinary user minting // is called by user
    function mint(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) external payable {
        require(msg.value == crowdsalePrice, "Not enough eth to mint");
        require(isLegalCoordinates(fromX, fromY, toX, toY), "Wrong coordinates");
        // check that blocks are not 2018 blocks and not founders
        uint16[] memory blocks = blocksList(fromX, fromY, toX, toY);
        // check if already minted at 2016 contract
        // todo ??? probably this is not neccessary. oldMeh.buyBlocks will not allow to buy occupied blocks.
        // good for security though. we are separating workflows of minting anew and wrapping. 
        for (uint i = 0; i < blocks.length; i++) {
            (uint8 x, uint8 y) = blockXY(blocks[i]);
            require(_landlordFrom2016(x, y) == address(0), "A block is already minted on 2016 contract");
            require(_landlordFrom2018(x, y) == address(0), "A block is already minted on 2018 contract");
            require(_isReservedForFounders(x, y) == false, "A block is reserved for founders");
        }
        buyFromMEH(fromX, fromY, toX, toY);
    }

    // // note. to mint 2016 block on the wrapper user wrap function
    // function mint2018block(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) external {
    //     // check if blocks are in hardcoded range
    //     // buyFromMEH...
    // }

    // function mintFoundeBlock(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) external {
    //     // check if blocks are in hardcoded range
    //     // check if founder
    //     // buyFromMEH...
    // }

    
    // only used to mint pixels (landlord == address(0))
    function buyFromMEH(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) internal {
        uint256 price = oldMeh.getAreaPrice(fromX, fromY, toX, toY);
        // todo check the price is > 0???
        // borrow and call _buyFromMEH with eth amount needed by MEH (1..512 ETH)
        borrow(price, fromX, fromY, toX, toY);  
    }

    // is called by SoloMargin (see callFunction function)
    // TODO make sure to override properly
    // only solomargin is checked at callfunction (see Flashloaner.sol)
    function _buyFromMEH(uint256 price, address buyer, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) internal override {
        console.log("... Buying from MEH..., wrapper balance is: %s", address(this).balance);
        require((oldMeh.buyBlocks
            {value: price}
            (fromX, fromY, toX, toY)) > 0, "purchasePrice returned by old Meh is below or is zero");
        
        console.log("... Withdrawing from refereals..., wrapper balance is: %s", address(this).balance);
        // get all the funds back from referrals to repay the loan 
        _withdrawFromReferrals();

        // royalties (todo wrong price here???!!! should be crowdsale price!)
        royalties += price;

        // mint NFT to buyer
        uint16[] memory blocks = blocksList(fromX, fromY, toX, toY);
        for (uint i = 0; i < blocks.length; i++) {
            _mint(buyer, blocks[i]);
        }
    }
}