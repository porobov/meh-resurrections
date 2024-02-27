// The ABI encoder is necessary, but older Solidity versions should work
pragma solidity ^0.8.0;
import "./Receiver.sol";
import "./UsingTools.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MehERC721 is Receiver, UsingTools, ERC721, Ownable {
    uint256 constant public MAX_INT_TYPE = type(uint256).max;

    // stores unwrapped blocks
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

    // metadata control
    string private _baseURIextended;

    // events
    event Wrapped(address indexed owner, uint256 areaPrice, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY);
    event Unwrapping(address indexed owner, uint priceForEachBlockInWei, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY);
    event ReceiptWithdrawn(address indexed recipient, uint256 payment, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY);

    constructor() ERC721("Million Ether Homepage", "MEH") {
    }

    // 2016 block owners can "sell" their blocks and buy from themselves through wrapper
    // then they'll have to withdraw from the 2016 MEH contract
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
            require(price > 0, "MehERC721: Sanity check");  // every block must be on sale
            require(receipts[blocks[i]].isAwaitingWithdrawal == false, "MehERC721: Must withdraw receipt first");
            areaPrice += price;
        }

        // checking msg.value
        require(areaPrice == msg.value, "MehERC721: Sending wrong amount of ether");

        // buying from oldMEH
        oldMeh.buyBlocks
            {value: areaPrice}
            (fromX, fromY, toX, toY);

        // set prohibitary sell price so no one could buy it from oldMeh
        // oldMeh is not resetting sell price after blocks are bought
        // oldMeh will not allow to set 0 sell price, so we are setting to max
        oldMeh.sellBlocks(fromX, fromY, toX, toY, MAX_INT_TYPE);

        // minting on wrapper
        // minting to msg.sender (not original landlord) for simplicity (anyone can buy it from the
        // original contract anyway)
        for (uint i = 0; i < blocks.length; i++) {
            _mint(msg.sender, blocks[i]);
        }
        emit Wrapped(msg.sender, areaPrice, fromX, fromY, toX, toY);
    }

    // any owner of a wrapped block can unwrap it (put on sale) and reclaim ownership
    // at the original contract (have to buy at 2016 and have to withdraw from the wrapper)
    // unwrap flow: call unwrap on wrapper -> buy on 2016MEH -> withdraw on wrapper
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
        emit Unwrapping(msg.sender, priceForEachBlockInWei, fromX, fromY, toX, toY);
    }

    // in case if sellPrice was set unbearably too high by mistake
    function resetSellPrice(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY, uint priceForEachBlockInWei) external {
        uint16[] memory blocks = blocksList(fromX, fromY, toX, toY);
        for (uint i = 0; i < blocks.length; i++) {
            // we don't need to check other requirements(e.g. isAwaitingWithdrawal). Used receipts get deleted. 
            require(receipts[blocks[i]].recipient == msg.sender, 
                "MehERC721: Not a recipient");
            receipts[blocks[i]].sellPrice = priceForEachBlockInWei;
        }
        // ↓↓↓ will throw if block was already sold
        // will throw if sellPrice is 0
        oldMeh.sellBlocks(fromX, fromY, toX, toY, priceForEachBlockInWei);
        // emiting same event as for unwrap function
        emit Unwrapping(msg.sender, priceForEachBlockInWei, fromX, fromY, toX, toY);
    }

    // withdraw money for the unwrapped block.
    // must be available to anyone - able to clean up contract from excess eth
    function withdraw(uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) external { // anyone can call
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
        // because multiple sales may happen at the same time
        uint256 balBefore = address(this).balance;
        oldMeh.withdrawAll(); // will withdraw all funds owned by Wrapper on MEH
        uint256 balAfter = address(this).balance;

        // funds separation (does not interfere with contract bal directly)
        unclaimed += balAfter - balBefore;
        unclaimed -= payment;  // will throw on underflow

        // payout
        require(singleRecipient != NULL_ADDR && singleRecipient != address(0),
            "MehERC721: Wrong recipient");
        
        // console.log("payment", msg.sender ,payment, address(this).balance);
        payable(singleRecipient).transfer(payment);
        emit ReceiptWithdrawn(singleRecipient, payment, fromX, fromY, toX, toY);
    }

    // admin can rescue funds
    // in case if no active receipts, but somehow got unclaimed funds
    // (e.g. someone can use wrapper contract address as a referral)
    // receipts payments can be initiated by anyone
    function rescueUnclaimed() external onlyOwner {
        require((numOfReceipts == 0 && unclaimed > 0),
            "MehERC721: rescue conditions are not met");
        payable(owner()).transfer(unclaimed);
    }

    function setBaseURI(string memory baseURI_) external onlyOwner {
        _baseURIextended = baseURI_;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseURIextended;
    }
}