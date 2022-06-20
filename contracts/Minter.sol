// The ABI encoder is necessary, but older Solidity versions should work
pragma solidity ^0.8.0;
// import "./UsingGlobals.sol";
// import "./UsingTools.sol";
import "./Flashloaner.sol";
import "./Collector.sol";
import "./MehERC721.sol";
import "./Admin.sol";

contract Minter is MehERC721, Flashloaner, Collector, Admin {

    // is called by user
    // only used to mint pixels (owner == address(0))
    function buyFromMEH(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) external payable {
        require(msg.value == crowdsalePrice, "Not enough eth to mint");
        require(isLegalCoordinates(fromX, fromY, toX, toY), "Wrong coordinates");
        // require landlord == address(0) ↓↓↓
        uint16[] memory blocks = blocksList(fromX, fromY, toX, toY);
        for (uint i = 0; i < blocks.length; i++) {
            (uint8 x, uint8 y) = blockXY(blocks[i]);
            (address landlord, uint u, uint256 s) = oldMeh.getBlockInfo(x,y);
            require(landlord == address(0), "Area is already minted");
        }

        uint256 price = oldMeh.getAreaPrice(fromX, fromY, toX, toY);
        // borrow and call _buyFromMEH with eth amount needed by MEH (1..512 ETH)
        borrow(price, fromX, fromY, toX, toY);  
    }

    
    // is called by SoloMargin (see callFunction function)
    // TODO make sure to override properly
    function _buyFromMEH(uint256 price, address buyer, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) internal override {
        console.log("... Buying from MEH..., wrapper balance is: %s", address(this).balance);
        require((oldMeh.buyBlocks
            {value: price}
            (fromX, fromY, toX, toY)) > 0, "purchasePrice returned by old Meh is below or is zero");
        
        console.log("... Withdrawing from refereals..., wrapper balance is: %s", address(this).balance);
        // get all the funds back from referrals
        _withdrawFromReferrals();

        // royalties
        royalties += price;

        // mint NFT to buyer
        uint16[] memory blocks = blocksList(fromX, fromY, toX, toY);
        for (uint i = 0; i < blocks.length; i++) {
            _mint(buyer, blocks[i]);
        }
    }
}