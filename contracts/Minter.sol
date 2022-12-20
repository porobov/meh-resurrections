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
    uint8 FROM_X_RESERVED = 77;
    uint8 FROM_Y_RESERVED = 77;
    uint8 TO_X_RESERVED = 77;
    uint8 TO_Y_RESERVED = 77;

    constructor(address wethAddress, address soloMarginAddress) Flashloaner(wethAddress, soloMarginAddress) {}

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
            console.log("no landlord in meh2018");  // TODO why cannot add reason here?
        }
        return landlord;
    }

    // must check the 2016 contract directly. As it will unpaused. 
    function _landlordFrom2016(uint8 x, uint8 y) internal view returns (address) {
        (address landlord, uint u, uint256 s) = oldMeh.getBlockInfo(x,y);
        return landlord;
    }

    // check that blocks are not 2018 blocks and not founders
    function _reservedFor(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) internal view returns (address) {

        // check if already minted at 2016 contract
        // todo ??? probably this is not neccessary. oldMeh.buyBlocks will not allow to buy occupied blocks.
        // good for security though. we are separating workflows of minting anew and wrapping.
        address singleLandlord = address(0);
        address NULL = address(0x00000000000000000000000000000000004E554C4C);  // "NULL" in hex
        address previousLandlord = NULL;  // must be specific, not just 0
        uint16[] memory blocks = blocksList(fromX, fromY, toX, toY);
        for (uint i = 0; i < blocks.length; i++) {
            (uint8 x, uint8 y) = blockXY(blocks[i]);
            require(_landlordFrom2016(x, y) == address(0), "A block is already minted on 2016 contract");
            // the below code can return landlord address(0), it's ok
            singleLandlord = _landlordFrom2018(x, y);
            // todo test area with owners [address(0), any_other...]
            if (singleLandlord != previousLandlord && previousLandlord != NULL) {
                revert("Multiple landlords within area");
            }
            previousLandlord = singleLandlord;
        }
        if (singleLandlord != address(0)) {
            return singleLandlord;
        }
        
        // moving this below _landlordFrom2016 check to cover the case when
        // a block within founders share is bouht directly from 2016
        // check if reserved for founders
        if (fromX >= FROM_X_RESERVED &&
            toX <= TO_X_RESERVED &&
            fromY >= FROM_Y_RESERVED &&
            toY <= TO_Y_RESERVED) 
        {
            return peter;
        } else {
            return address(0);
        }
    }

    function _areaCrowdsalePrice(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) internal view returns (uint256) {
        uint16 numOfBlocks = countBlocks(fromX, fromY, toX, toY);
        return crowdsalePrice * numOfBlocks;
    }

    modifier onlyLegalCoordinates(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) {
        require(isLegalCoordinates(fromX, fromY, toX, toY), "Wrong coordinates");
        _;
    }

    // ordinary user minting (is called by user)
    function mint(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) 
        external
        payable
        onlyLegalCoordinates(fromX, fromY, toX, toY)
    {
        require(_reservedFor(fromX, fromY, toX, toY) == address(0), "A block is reserved for 2018 landlords or founders");
        
        // checking if enough eth is sent, adding to royalties
        uint256 areaCrowdsalePrice = _areaCrowdsalePrice(fromX, fromY, toX, toY);
        require(msg.value == areaCrowdsalePrice, "Not enough eth to mint");
        royalties += areaCrowdsalePrice;

        _borrowAndBuyFromMEH(msg.sender, fromX, fromY, toX, toY);
        console.log("Wrapper weth balance Of:", WETH.balanceOf(address(this)));
    }

    // minting blocks reserved for founders and 2018 landlords
    // 2016 blocks must be transferred via wrap function
    // anyone can call - will mint to a predefined owner
    function mintReservedBlock(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY)
        external
        onlyLegalCoordinates(fromX, fromY, toX, toY)
    {
        address landlord = _reservedFor(fromX, fromY, toX, toY);
        _borrowAndBuyFromMEH(landlord, fromX, fromY, toX, toY);
    }

    // borrows ETH and calls _buyFromMEH with eth amount needed by MEH (1..512 ETH)
    function _borrowAndBuyFromMEH(address buyer, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) internal {
        uint256 price = oldMeh.getAreaPrice(fromX, fromY, toX, toY);
        // if the price is 0, it means that a block within the area is not for sale
        // as both mint functions point to vacant areas, the price should always be > 0
        // except if someone buys a block within founder's share area
        // better check the price here for clearer error message
        require(price > 0, "Area price is 0");
        _borrow(price, buyer, fromX, fromY, toX, toY);
    }

    // is called by SoloMargin (see callFunction function)
    // only solomargin is checked at callfunction (see Flashloaner.sol)
    function _buyFromMEH(uint256 price, address buyer, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) internal override (Flashloaner) {
        
        // minting on 2016 contract
        console.log("... Buying from MEH..., wrapper balance is: %s", address(this).balance);
        require((oldMeh.buyBlocks
            {value: price}
            (fromX, fromY, toX, toY)) > 0, "purchasePrice returned by old Meh is below or is zero");
        console.log("... Withdrawing from refereals..., wrapper balance is: %s", address(this).balance);

        // get all the funds back from referrals to repay the loan 
        _withdrawFromReferrals();

        // mint NFT to buyer
        uint16[] memory blocks = blocksList(fromX, fromY, toX, toY);
        for (uint i = 0; i < blocks.length; i++) {
            _mint(buyer, blocks[i]);
        }
    }
}