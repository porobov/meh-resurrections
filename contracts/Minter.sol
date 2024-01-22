pragma solidity ^0.8.0;
import "./Flashloaner.sol";
import "./Collector.sol";
import "./MehERC721.sol";

contract Minter is MehERC721, Flashloaner, Collector {

    constructor(address wethAddress, address soloMarginAddress) Flashloaner(wethAddress, soloMarginAddress) {}

    function _landlordFrom2018ByIndex(uint256 id) internal view returns (address) {
        address landlord = address(0);
        console.log("......id", id);
        // note ownerOf function fails on empty coordinates => using try/catch
        // note WARNING 2018 contract got both 2016 and 2018 pixels
        try meh2018.ownerOf(id) returns (address landlord2018) {
            console.log("......landlord2018", landlord2018);
            landlord = landlord2018;
        } catch (bytes memory reason) {
            console.log("no landlord in meh2018");
        }
        return landlord;
    }

    function _landlordFrom2016(uint8 x, uint8 y) internal view returns (address) {
        console.log("......x, y", x, y);
        (address landlord, uint u, uint256 s) = oldMeh.getBlockInfo(x,y);
        return landlord;
    }

    function _landlordFounder(uint8 x, uint8 y) internal view returns (address) {
        if (x >= FROM_X_RESERVED &&
            x <= TO_X_RESERVED &&
            y >= FROM_Y_RESERVED &&
            y <= TO_Y_RESERVED) 
        {
            return founder;
        } else {
            return address(0);
        }
    }

    // check that blocks are not 2018 blocks and not founders
    // will throw if any of the blocks are from 2016 or if multiple owners
    // also separates minting and wrapping flows
    function _reservedFor(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) internal view returns (address) {
        address singleLandlord = address(0);
        address NULL_ADDR = address(0x00000000000000000000000000000000004E554C4C);  // "NULL" in hex
        address previousLandlord = NULL_ADDR;  // must be specific, not just 0
        uint16[] memory blocks = blocksList(fromX, fromY, toX, toY);
        // every block in the area shound belong to a single owner or o address
        for (uint i = 0; i < blocks.length; i++) {
            (uint8 x, uint8 y) = blockXY(blocks[i]);
            console.log("Checking if reserved", x, y);
            // check if already minted at 2016 contract
            // good for security. we are separating workflows of minting anew and wrapping.
            require(_landlordFrom2016(x, y) == address(0), "A block is already minted on 2016 contract");
            // the below code can return landlord address(0), it's ok
            singleLandlord = _landlordFrom2018ByIndex(blocks[i]);
            // moving founders check below _landlordFrom2016 check to cover the case when
            // a block within founders share is bouht directly from 2016.
            // moving below _landlordFrom2018 to simplify selection of founder's area as it can include 
            // other reserved blocks - they will just not belong to founder
            if (singleLandlord == address(0)) {
                singleLandlord = _landlordFounder(x, y);
            }
            require((singleLandlord == previousLandlord || previousLandlord == NULL_ADDR),
                "Multiple landlords within area");
            previousLandlord = singleLandlord;
        }
        return singleLandlord;
    }

    function _areaCrowdsalePrice(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) internal view returns (uint256) {
        uint16 numOfBlocks = countBlocks(fromX, fromY, toX, toY);
        return crowdsalePrice * numOfBlocks;
    }

    modifier onlyLegalCoordinates(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) {
        require(isLegalCoordinates(fromX, fromY, toX, toY), "Wrong coordinates");
        _;
    }

    function reservedFor(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) external view returns (address) {
        return _reservedFor(fromX, fromY, toX, toY);
    }

    // ordinary minting (is called by user)
    function mint(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) 
        external
        payable
        onlyLegalCoordinates(fromX, fromY, toX, toY)
    {
        require(_reservedFor(fromX, fromY, toX, toY) == address(0), 
            "A block is reserved for 2018 landlords or founders");
        
        // checking if enough eth is sent, adding to royalties
        uint256 areaCrowdsalePrice = _areaCrowdsalePrice(fromX, fromY, toX, toY);
        require(msg.value == areaCrowdsalePrice, "Not enough eth to mint");
        royalties += areaCrowdsalePrice;

        _borrowAndBuyFromMEH(msg.sender, fromX, fromY, toX, toY);
        console.log("Wrapper weth balance Of:", WETH.balanceOf(address(this)));
    }

    // Minting blocks reserved for founders and 2018 landlords
    // anyone can call - will mint to a predefined owner.
    // As for 2016 blocks - they must be transferred via wrap function
    function mintReserved(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY)
        external
        onlyLegalCoordinates(fromX, fromY, toX, toY)
    {
        address landlord = _reservedFor(fromX, fromY, toX, toY);
        require(landlord != address(0x0));  // sanity check
        _borrowAndBuyFromMEH(landlord, fromX, fromY, toX, toY);
    }

    // borrows ETH from loan platform and calls _buyFromMEH (SoloMargin calls it) 
    // with eth amount needed by MEH (1..512 ETH)
    function _borrowAndBuyFromMEH(address buyer, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) internal {
        // checking big loan
        // * 7500 works as of 22.02.2023 for euler
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
        // now after big loan is received bring back the original price
        // minting on 2016 contract
        console.log("... Buying from MEH..., wrapper balance is: %s", address(this).balance);
        // this is require here is not much needed, but leaving it for more security
        require((oldMeh.buyBlocks
            {value: price}
            (fromX, fromY, toX, toY)) > 0, "purchasePrice returned by old Meh is below or is zero");
        console.log("... Withdrawing from refereals..., wrapper balance is: %s", address(this).balance);

        // get all the funds back from referrals to repay the loan 
        uint256 withdrawnFromReferrals = _withdrawFromReferrals();
        // Checking what is withdrawn from referrals. Using ">=" because
        // otherwise someone could send funds to a referral and hang up execution
        require(withdrawnFromReferrals >= price, 
            "Minter: Received not enough funds from referrals");
        // any excess goes to founder - enables rescuing funds
        // simpler and cheaper than moving it to owner (founder got internal balance)
        internalBalOf[founder] += withdrawnFromReferrals - price; 

        // mint NFT to buyer
        uint16[] memory blocks = blocksList(fromX, fromY, toX, toY);
        for (uint i = 0; i < blocks.length; i++) {
            _mint(buyer, blocks[i]);
        }
    }
}