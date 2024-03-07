// SPDX-License-Identifier: AGPL-3.0-or-later

// Reference contract

// todo Your solo margin DyDx address is wrong, the correct address is 0x4EC3570cADaAEE08Ae384779B0f3A45EF85289DE
// probably Kovan

// TODO depricate???

// The ABI encoder is necessary, but older Solidity versions should work
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

// These definitions are taken from across multiple dydx contracts, and are
// limited to just the bare minimum necessary to make flash loans work.
library Types {
    enum AssetDenomination { Wei, Par }
    enum AssetReference { Delta, Target }
    struct AssetAmount {
        bool sign;
        AssetDenomination denomination;
        AssetReference ref;
        uint256 value;
    }
}

library Account {
    struct Info {
        address owner;
        uint256 number;
    }
}

library Actions {
    enum ActionType {
        Deposit, Withdraw, Transfer, Buy, Sell, Trade, Liquidate, Vaporize, Call
    }
    struct ActionArgs {
        ActionType actionType;
        uint256 accountId;
        Types.AssetAmount amount;
        uint256 primaryMarketId;
        uint256 secondaryMarketId;
        address otherAddress;
        uint256 otherAccountId;
        bytes data;
    }
}

interface ISoloMargin {
    function operate(Account.Info[] memory accounts, Actions.ActionArgs[] memory actions) external;
}

// The interface for a contract to be callable after receiving a flash loan
interface ICallee {
    function callFunction(address sender, Account.Info memory accountInfo, bytes memory data) external;
}

// Standard ERC-20 interface
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

// Additional methods available for WETH
interface IWETH is IERC20 {
    function deposit() external payable;
    function withdraw(uint wad) external;
}

interface IOldMeh {
    function signIn (address) external;
    function withdrawAll() external;
    function buyBlocks(uint8, uint8, uint8, uint8) external payable returns(uint256);
    function sellBlocks(uint8, uint8, uint8, uint8, uint256) external;
    function getAreaPrice(uint8, uint8, uint8, uint8) external view returns(uint256);
    function getBlockInfo(uint8, uint8) external view returns (address, uint, uint);
    function placeImage(uint8, uint8, uint8, uint8, string calldata, string calldata, string calldata) external payable; //todo calldata ok
}

interface IReferral {
    function withdraw() external;
}









contract MehWrapperRef is ICallee, ERC721, Ownable {
    // The WETH token contract, since we're assuming we want a loan in WETH
    IWETH private WETH = IWETH(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    // The dydx Solo Margin contract, as can be found here:
    // https://github.com/dydxprotocol/solo/blob/master/migrations/deployed.json
    ISoloMargin private soloMargin = ISoloMargin(0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e);
    IOldMeh private oldMeh = IOldMeh(0x15dbdB25f870f21eaf9105e68e249E0426DaE916);

    // uint256 public loaned;
    address [] public referrals;  // list of referrals to withdraw eth from
    uint256 public crowdsalePrice = 0.25 ether;  // minting price

    // internal accounting 
    uint256 public unclaimed;  // eth withdrawn from oldMEH while unwrapping
    uint256 public royalties;  // eth earned by wrapper
    mapping(address => uint256) public internalBalOf;  // partners balances 
    address public peter;
    address public adam;

    // wrapping-unwrapping
    // stores unwrapped blocks
    // todo check ordering
    struct Receipt {
        address receiverAddress;
        bool isWithdrawn;
        uint256 sellPrice;
    }
    mapping(uint16 => Receipt) private receipts;  // single receipt for blockId


    constructor() ERC721("Million Ether Homepage", "MEH") {
        // Give infinite approval to dydx to withdraw WETH on contract deployment,
        // so we don't have to approve the loan repayment amount (+2 wei) on each call.
        // The approval is used by the dydx contract to pay the loan back to itself.
        WETH.approve(address(soloMargin), uint(2**256 - 1));
    }


    // ** FLASHLOAN ** //
    
    // This is the function we call
    function borrow(uint256 loanAmount, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) internal {
        /*
        The flash loan functionality in dydx is predicated by their "operate" function,
        which takes a list of operations to execute, and defers validating the state of
        things until it's done executing them.
        
        We thus create three operations, a Withdraw (which loans us the funds), a Call
        (which invokes the callFunction method on this contract), and a Deposit (which
        repays the loan, plus the 2 wei fee), and pass them all to "operate".
        
        Note that the Deposit operation will invoke the transferFrom to pay the loan 
        (or whatever amount it was initialised with) back to itself, there is no need
        to pay it back explicitly.
        
        The loan must be given as an ERC-20 token, so WETH is used instead of ETH. Other
        currencies (DAI, USDC) are also available, their index can be looked up by
        calling getMarketTokenAddress on the solo margin contract, and set as the 
        primaryMarketId in the Withdraw and Deposit definitions.
        */
        
        Actions.ActionArgs[] memory operations = new Actions.ActionArgs[](3);

        operations[0] = Actions.ActionArgs({
            actionType: Actions.ActionType.Withdraw,
            accountId: 0,
            amount: Types.AssetAmount({
                sign: false,
                denomination: Types.AssetDenomination.Wei,
                ref: Types.AssetReference.Delta,
                value: loanAmount // Amount to borrow
            }),
            primaryMarketId: 0, // WETH
            secondaryMarketId: 0,
            otherAddress: address(this),
            otherAccountId: 0,
            data: ""
        });
        
        operations[1] = Actions.ActionArgs({
                actionType: Actions.ActionType.Call,
                accountId: 0,
                amount: Types.AssetAmount({
                    sign: false,
                    denomination: Types.AssetDenomination.Wei,
                    ref: Types.AssetReference.Delta,
                    value: 0
                }),
                primaryMarketId: 0,
                secondaryMarketId: 0,
                otherAddress: address(this),
                otherAccountId: 0,
                data: abi.encode(
                    loanAmount,
                    msg.sender,
                    fromX,
                    fromY,
                    toX,
                    toY
                )
            });
        
        operations[2] = Actions.ActionArgs({
            actionType: Actions.ActionType.Deposit,
            accountId: 0,
            amount: Types.AssetAmount({
                sign: true,
                denomination: Types.AssetDenomination.Wei,
                ref: Types.AssetReference.Delta,
                value: loanAmount + 2 // Repayment amount with 2 wei fee 
                // todo. test pay on every tx?! (important!!!)
                // require 2 wei * 10000 on contract creation
            }),
            primaryMarketId: 0, // WETH
            secondaryMarketId: 0,
            otherAddress: address(this),
            otherAccountId: 0,
            data: ""
        });

        Account.Info[] memory accountInfos = new Account.Info[](1);
        accountInfos[0] = Account.Info({owner: address(this), number: 1});

        soloMargin.operate(accountInfos, operations);
    }
    
    // This is the function called by dydx after giving us the loan    
    function callFunction(address sender, Account.Info memory accountInfo, bytes memory data) external override {
        // only by loan platform
        require(msg.sender == address(soloMargin), "Caller is not soloMargin");

        // Decode the passed variables from the data object
        (
            uint256 loanAmount,
            address buyer,
            uint8 fromX,
            uint8 fromY,
            uint8 toX,
            uint8 toY
        ) = abi.decode(data, (uint256, address, uint8, uint8, uint8, uint8));

        require(WETH.balanceOf(address(this)) >= loanAmount + 2, 
            "CANNOT REPAY LOAN");
        
        // convert WETH to eth
        WETH.withdraw(loanAmount);
        // buy
        _buyFromMEH(loanAmount, buyer,fromX, fromY, toX, toY);
    }

    // also see receive function below


    // ** REFERRALS ** //

    // this wrapper contract is a referral too (must sign in)
    function signIn(address referral) external onlyOwner {
        oldMeh.signIn(referral);
    }

    // all referrals must be registered through this function
    function addRefferal(address newReferral) external onlyOwner {
        // leaving some flexibility - pushing as many referrals as needed 
        // (a way to upgrade referrals)
        referrals.push(newReferral);
    }

    // withrdaws money from all registered referrals
    function _withdrawFromReferrals() private {
        // using reverse order and do only 7 (or is it 6?) referrals
        // a way to upgrade referrals
        console.log("... _withdrawFromReferrals");
        for (uint i = 6; i > 0; i--) { // TODO does not withdraw from refferal[0]
            IReferral(referrals[i]).withdraw();
        }
    }

    // Referrals send eth back to wrapper through this function
    function referralPayback() external payable {
        // note: not checking for sender - optimizing for gas
    }


    // ** MINTING ** //


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

    // is called by SoloMargin (see callFunction function above)
    // TODO only soloMargin?
    function _buyFromMEH(uint256 price, address buyer, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) internal {
        console.log("... Buying from MEH..., wrapper balance is: %s", address(this).balance);
        require((oldMeh.buyBlocks
            {value: price}
            (fromX, fromY, toX, toY)) > 0, "purchasePrice returned by old Meh is below or is zero");
        
        console.log("... Withdrawing from refereals..., wrapper balance is: %s", address(this).balance);
        // get all the funds back from referrals
        _withdrawFromReferrals();
        // convert ETH to weth
        console.log("... Converting to WETH..., wrapper balance is: %s", address(this).balance);
        WETH.deposit{value:price}();
        console.log("... Converted to WETH..., wrapper balance is: %s", address(this).balance);

        // mint NFT to buyer
        uint16[] memory blocks = blocksList(fromX, fromY, toX, toY);
        for (uint i = 0; i < blocks.length; i++) {
            _mint(buyer, blocks[i]);
        }
        
        // royalties
        royalties += price;

        // solomargin withdraws loan amount on it's own
    }


    // ** PLACING ADS ** //


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


    // ** WRAPPING / UNWRAPPING ** //


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


    // ** ADMIN ** // 

    // splitting income here to offload minting function
    function splitIncome() internal {
        uint256 petersShare = royalties * 85 / 100;
        internalBalOf[peter] += petersShare;
        internalBalOf[adam] += (royalties - petersShare);
        royalties = 0;
    }

    function withdrawIncome() external {
        require(msg.sender == peter || msg.sender == adam, "Not a beneficiary");
        splitIncome();
        internalBalOf[msg.sender] = 0;
        payable(msg.sender).transfer(internalBalOf[msg.sender]); // todo is this ok?
    }

    function setAdam(address newAdamsAddress) external {
        require(msg.sender == adam, "Not Adam");
        adam = newAdamsAddress;
    }

    function setPeter(address newPetersAddress) external {
        require(msg.sender == peter, "Not Peter");
        peter = newPetersAddress;
    }
    
    function adminSetPrice(uint256 newPrice) external onlyOwner {
        crowdsalePrice = newPrice;
    }


    // ** TOOLS ** //


    /// @notice get ERC721 token id corresponding to xy coordinates
    function blockID(uint8 x, uint8 y) internal pure returns (uint16) {
        return (uint16(y) - 1) * 100 + uint16(x);
    }

    // todo check in tests
    function blockXY(uint16 blockId) internal pure returns (uint8, uint8) {
        uint8 x = uint8(blockId % 100);
        uint8 y = uint8(blockId / 100 + 1);
        return (x, y);
    }

    /// @notice get an array of all block ids (i.e. ERC721 token ids) within area
    function blocksList(
        uint8 fromX, 
        uint8 fromY, 
        uint8 toX, 
        uint8 toY
    ) 
        internal 
        pure 
        returns (uint16[] memory r) 
    {
        uint i = 0;
        r = new uint16[](countBlocks(fromX, fromY, toX, toY));
        for (uint8 ix=fromX; ix<=toX; ix++) {
            for (uint8 iy=fromY; iy<=toY; iy++) {
                r[i] = blockID(ix, iy);
                i++;
            }
        }
    }

    /// @notice get a number of blocks within area
    function countBlocks(
        uint8 fromX, 
        uint8 fromY, 
        uint8 toX, 
        uint8 toY
    ) 
        internal 
        pure 
        returns (uint16)
    {
        return (toX - fromX + 1) * (toY - fromY + 1);
    }
    // todo set img url prefix (allow another hosting for images)

    /// @notice insures that area coordinates are within 100x100 field and 
    ///  from-coordinates >= to-coordinates
    /// @dev function is used instead of modifier as modifier 
    ///  required too much stack for placeImage and rentBlocks
    function isLegalCoordinates(
        uint8 _fromX, 
        uint8 _fromY, 
        uint8 _toX, 
        uint8 _toY
    )    
        private 
        pure 
        returns (bool) 
    {
        return ((_fromX >= 1) && (_fromY >=1)  && (_toX <= 100) && (_toY <= 100) 
            && (_fromX <= _toX) && (_fromY <= _toY));
    }

    // Receives eth from WETH contract when converting weth to eth
    // Also receives eth from oldMEH when unwrapping blocks
    // prevents accidental sending of eth 
    receive() external payable {
        require(
            msg.sender == address(WETH) || msg.sender == address(oldMeh),
            "Only receives from oldMEH or WETH");
    }
}
