// The ABI encoder is necessary, but older Solidity versions should work
pragma solidity ^0.8.0;
import "./Receiver.sol";
import "./UsingTools.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MehERC721 is Receiver, UsingTools, ERC721, Ownable {
    // wrapping-unwrapping
    // stores unwrapped blocks
    // todo check ordering
    uint256 constant public MAX_INT_TYPE = type(uint256).max;

    struct Receipt {
        bool isAwaitingWithdrawal;
        uint256 sellPrice;
        address recipient;
    }
    // ↓↓↓ eth withdrawn from oldMEH while unwrapping. Funds separation. 
    // consider it wrap-unwrap balance of the wrapper contract
    uint256 public unclaimed = 0;
    uint256 public numOfReceipts = 0;
    mapping(uint16 => Receipt) public receipts;  // single receipt for blockId

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
        uint256 areaPrice = 0;
        // checking for overlap with unminted (can only buy blocks from landlords)
        // require landlord != address(0) ↓↓↓
        uint16[] memory blocks = blocksList(fromX, fromY, toX, toY);
        for (uint i = 0; i < blocks.length; i++) {
            (uint8 x, uint8 y) = blockXY(blocks[i]);
            (address landlord, uint u, uint256 price) = oldMeh.getBlockInfo(x,y);
            require(landlord != address(0), "MehERC721: Area is not minted yet");
            require(receipts[blocks[i]].isAwaitingWithdrawal == false, "MehERC721: Must withdraw receipt first");
            areaPrice += price;
        }
        // checking msg.value
        require(areaPrice > 0, "MehERC721: Sanity check");
        require(areaPrice == msg.value, "MehERC721: Sending wrong amount of ether");

        // buying from oldMEH
        oldMeh.buyBlocks
            {value: areaPrice}
            (fromX, fromY, toX, toY);

        // set prohibitary sell price so no one could buy it from oldMeh
        oldMeh.sellBlocks(fromX, fromY, toX, toY, MAX_INT_TYPE);

        // minting on wrapper
        // minting to msg.sender (not original landlord) for simplicity (anyone can buy it from the
        // original contract anyway)
        for (uint i = 0; i < blocks.length; i++) {
            _mint(msg.sender, blocks[i]);
        }
    }

    // any owner of a wrapped block can unwrap it (put on sale) and reclaim ownership
    // at the original contract (have to buy at 2016 and have to withdraw from the wrapper)
    // priceForEachBlockInWei - specify unique price?
    // unwrap flow: call unwrap on wrapper -> buy on 2016MEH -> withdraw on wrapper
    // todo setSome random sell price in the UX, so that it won't be
    // repeated on accident
    function unwrap(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY, uint priceForEachBlockInWei) external {
        uint16[] memory blocks = blocksList(fromX, fromY, toX, toY);
        for (uint i = 0; i < blocks.length; i++) {
            require(_isApprovedOrOwner(msg.sender, blocks[i]), "MehERC721: Not a landlord");
            receipts[blocks[i]].sellPrice = priceForEachBlockInWei;
            receipts[blocks[i]].isAwaitingWithdrawal = true;
            receipts[blocks[i]].recipient = msg.sender;
            _burn(blocks[i]);
            numOfReceipts++;
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
    // must be available to anyone - able to clean up contract from excess eth
    // todo mention in the docs to withdraw money immediately.
    function withdraw(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) external { // anyone can call
        // check receipts
        // if sell price is different than that assigned in unwrap function
        // it means that the block was sold. Then wrapper can withdraw money and send
        // them to seller.
        uint16[] memory blocks = blocksList(fromX, fromY, toX, toY);
        uint256 payment = 0;
        address NULL_ADDR = address(0x00000000000000000000000000000000004E554C4C);  // "NULL" in hex
        address singleRecipient = NULL_ADDR;
        for (uint i = 0; i < blocks.length; i++) {
            (uint8 x, uint8 y) = blockXY(blocks[i]);
            (address landlord, uint u, uint256 p) = oldMeh.getBlockInfo(x,y);
            address recipient;
            // checking if wrapper lost ownership - means that block is bought
            if (landlord != address(this) && receipts[blocks[i]].isAwaitingWithdrawal) {
                payment += receipts[blocks[i]].sellPrice;
                recipient = receipts[blocks[i]].recipient;
                delete receipts[blocks[i]];
                // checking for single recipient
                if (singleRecipient != NULL_ADDR) {
                    require(singleRecipient == recipient,
                        "MehERC721: Multiple recipients within area");
                }
                numOfReceipts--;
                singleRecipient = recipient;
            }
        }
        // protects against gas waste. Reverts useless transactions. 
        require(payment > 0,
            "MehERC721: Payment must be above 0");

        // withdraw from MEH. Amount may be higher than payment
        uint256 balBefore = address(this).balance;
        console.log("balBefore");
        oldMeh.withdrawAll(); // will withdraw all funds owned by Wrapper on MEH
        uint256 balAfter = address(this).balance;

        // funds separation (does not interfere with contract bal directly)
        unclaimed += balAfter - balBefore;
        unclaimed -= payment;  // will throw on underflow

        // payout
        require(singleRecipient != NULL_ADDR && singleRecipient != address(0),
            "MehERC721: Wrong recipient");
        
        console.log("payment", msg.sender ,payment, address(this).balance);
        payable(singleRecipient).transfer(payment); // todo is this ok?
    }

    // admin can rescue funds
    // in case if no active receipts, but somehow got unclaimed funds
    // receipts payments can be initiated by anyone
    function rescueUnclaimed() external onlyOwner {
        require((numOfReceipts == 0 && unclaimed > 0),
            "MehERC721: rescue conditions are not met");
        payable(owner()).transfer(unclaimed);
    }
}