// The ABI encoder is necessary, but older Solidity versions should work
pragma solidity ^0.8.0;
// import "./UsingGlobals.sol";
// import "./UsingTools.sol";
import "./Flashloaner.sol";
import "./Collector.sol";
import "./MehERC721.sol";
import "./Admin.sol";

contract Minter is MehERC721, Flashloaner, Collector, Admin {

    // mapping (uint => bool) public is2018block;
    
    // constructor () {
    //     is2018block[12] = true;
    //     is2018block[22] = true;
    // }
    // is called by user
    // only used to mint pixels (owner == address(0))
    function buyFromMEH(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) external payable {
        require(msg.value == crowdsalePrice, "Not enough eth to mint");
        require(isLegalCoordinates(fromX, fromY, toX, toY), "Wrong coordinates");
        // require landlord == address(0) ↓↓↓
        uint16[] memory blocks = blocksList(fromX, fromY, toX, toY);

        // check if already minted at 2016 contract
        // todo ??? probably this is not neccessary. oldMeh.buyBlocks will not allow to buy occupied blocks.
        // good for security though. we are separating workflows of minting anew and wrapping. 
        for (uint i = 0; i < blocks.length; i++) {
            (uint8 x, uint8 y) = blockXY(blocks[i]);
            // (address landlord, uint u, uint256 s) = oldMeh.getBlockInfo(x,y);
            // require(landlord == address(0), "Area is already minted");

            // checking 2018 contract. WARNING it got both 2016 and 2018 pixels
            // try meh2018.ownerOf(i) returns (address owner2018) {  // todo why this doesn't work? check starting block
            // use coordinates (54,54). they are present on 2018 contract and not minted in 2016
            console.log("......x, y", x, y);
            try meh2018.getBlockOwner(x, y) returns (address owner2018) {
                console.log("......owner2018", owner2018);
            } catch (bytes memory reason) {
                console.log("......reason");
            }
        }

        uint256 price = oldMeh.getAreaPrice(fromX, fromY, toX, toY);
        // todo check the price is > 0???
        // borrow and call _buyFromMEH with eth amount needed by MEH (1..512 ETH)
        borrow(price, fromX, fromY, toX, toY);  
    }

    // function mint(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) external payable {
    //     // check that blocks are not 2018 blocks and not founders
    //     // require(msg.value == crowdsalePrice, "Not enough eth to mint");
    //     // buyFromMEH...
    //     // 
    // }

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