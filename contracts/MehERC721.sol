// The ABI encoder is necessary, but older Solidity versions should work
pragma solidity ^0.8.0;
import "./Receiver.sol";
import "./UsingTools.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MehERC721 is Receiver, UsingTools, ERC721 {
    // wrapping-unwrapping
    // stores unwrapped blocks
    // todo check ordering
    uint256 public unclaimed;  // eth withdrawn from oldMEH while unwrapping
    struct Receipt {
        address receiverAddress;
        bool isWithdrawn;
        uint256 sellPrice;
    }
    mapping(uint16 => Receipt) private receipts;  // single receipt for blockId

    constructor() ERC721("Million Ether Homepage", "MEH") {
    }

    // 2016 block owners can "sell" their blocks and buy from themselves through wrapper
    // then they'll have to withdraw from the 2016 MEH contract
    // will also be used to mint blocks reserved for 2018 buyers (bought by admin)
    // those blocks will then be transfered to owners through regular NFT transfer
    // check price through getAreaPrice() function of MEH  
    // wrap flow: sell on 2016MEH -> call wrap on wrapper -> withdraw from 2016MEH
    function wrap(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) 
        external 
        payable 
    {
        // checking msg.value
        uint256 areaPrice = oldMeh.getAreaPrice (fromX, fromY, toX, toY);
        require(areaPrice == msg.value, "Sending wrong amount of ether");

        // checking for overlap with unminted (can only buy blocks from landlords)
        // require landlord != address(0) ↓↓↓
        uint16[] memory blocks = blocksList(fromX, fromY, toX, toY);
        for (uint i = 0; i < blocks.length; i++) {
            (uint8 x, uint8 y) = blockXY(blocks[i]);
            (address landlord, uint u, uint256 s) = oldMeh.getBlockInfo(x,y);
            require(landlord != address(0), "Area is not minted yet");
        }

        // buying from oldMEH
        oldMeh.buyBlocks
            {value: areaPrice}
            (fromX, fromY, toX, toY);

        // minting on wrapper
        // minting to msg.sender for simplicity (anyone can buy it from the 
        // original contract anyway)
        for (uint i = 0; i < blocks.length; i++) {
            _mint(msg.sender, blocks[i]); 
        }
    }

    // any owner of a wrapped block can unwrap it (put on sale) and reclaim ownership 
    // at the original contract (have to buy at 2016 and have to withdraw from this wrapper)
    // priceForEachBlockInWei - specify unique price? 
    // unwrap flow: call unwrap on wrapper -> buy on 2016MEH -> withdraw on wrapper
    // todo setSome random sell price in the UX, so that it won't be 
    // repeated on accident 
    function unwrap(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY, uint priceForEachBlockInWei) external {
        uint16[] memory blocks = blocksList(fromX, fromY, toX, toY);
        for (uint i = 0; i < blocks.length; i++) {
            require(_isApprovedOrOwner(msg.sender, blocks[i]), "Not a landlord");
            receipts[blocks[i]].sellPrice = priceForEachBlockInWei;
            receipts[blocks[i]].isWithdrawn = false;
            receipts[blocks[i]].receiverAddress = msg.sender;
            _burn(blocks[i]);
        }
        oldMeh.sellBlocks(fromX, fromY, toX, toY, priceForEachBlockInWei);
    }

    // Q'n'A. Bob unwraps his block
    // q: what if Bob creates multiple orders?
    // a: receipt is tied to blockId, so it's ok
    // q: what if someone bought a part of the area being sold?
    // a: no worries receipt is tied to blockId
    // q: what if Alice sets the same sell price as Bob when he was unwrapping? 
    // a: To do that Bob needs to finish unwrapping, then put the block on sale,
    //    then Alice needs to buy from Bob and set the same price as Bob set. 
    //    Plus Bob needs to miss his opportunity to withdraw from wrapper. 
    //    Then Bob will not be able to withdraw. 
    // q: what if multiple orders placed for the same block by the same landlord?
    // a: we can check that, and require to withdraw first
    // q: what if next landlord preforms unwrap?
    // a: well, we will not overcomplicate code for that.
    // Web interface should guide through all wrap-unwrap stages gracefully. 

    // withdraw money for the unwrapped block.
    // todo mention in the docs to withdraw money immediately. 
    function withdraw(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) external { // anyone can call 
        // check receipts
        // if sell price is different than that assigned in unwrap function
        // it means that the block was sold. Then wrapper can withdraw money and send 
        // them to seller.
        uint16[] memory blocks = blocksList(fromX, fromY, toX, toY);
        uint256 payment = 0;
        for (uint i = 0; i < blocks.length; i++) {
            (uint8 x, uint8 y) = blockXY(blocks[i]);
            (address a, uint u, uint256 currentSellPrice) = oldMeh.getBlockInfo(x,y);
            if (receipts[blocks[i]].sellPrice != currentSellPrice && !receipts[blocks[i]].isWithdrawn) {
                receipts[blocks[i]].isWithdrawn = true;
                payment += receipts[blocks[i]].sellPrice;
            }
        }
 
        // withdraw from MEH and log
        uint256 balBefore = address(this).balance;
        oldMeh.withdrawAll(); // will withdraw all funds owned by Wrapper on MEH
        uint256 balAfter = address(this).balance;
        uint256 withdrawnFromMeh = balAfter - balBefore;
        unclaimed += withdrawnFromMeh;

        // payout 
        assert (unclaimed >= payment); // sanity check (check funds)
        unclaimed -= payment;
        payable(msg.sender).transfer(payment); // todo is this ok? 
    }

    // receive() external payable {} 
}