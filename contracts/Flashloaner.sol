pragma solidity ^0.8.0;
import "./libs/dydx.sol";
import "./interfaces/IDydx.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./interfaces/IWeth.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";
import "./Receiver.sol";

contract Flashloaner is ICallee, Receiver {
    // The dydx Solo Margin contract, as can be found here:
    // https://github.com/dydxprotocol/solo/blob/master/migrations/deployed.json
    ISoloMargin public soloMargin;

    constructor(address wethAddress, address soloMarginAddress) {
        WETH = IWETH(wethAddress);
        soloMargin = ISoloMargin(soloMarginAddress);
        // infinite approval to dydx to withdraw WETH
        WETH.approve(address(soloMargin), uint(2**256 - 1));
    }
    
    // ** FLASHLOAN ** //
    
    function _borrow(uint256 loanAmount, address buyer, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) internal {
        
        Actions.ActionArgs[] memory operations = new Actions.ActionArgs[](3);

        operations[0] = Actions.ActionArgs({
            actionType: Actions.ActionType.Withdraw,
            accountId: 0,
            amount: Types.AssetAmount({
                sign: false,
                denomination: Types.AssetDenomination.Wei,
                ref: Types.AssetReference.Delta,
                value: loanAmount
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
                    buyer,
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
                value: loanAmount + 2
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
    
    // This function is called by dydx
    function callFunction(address sender, Account.Info memory accountInfo, bytes memory data) external override {
        // only by dxdy
        require(msg.sender == address(soloMargin), "Caller is not soloMargin");
        // dxdy was called by this wrapper
        require(sender == address(this), "Flashloaner: wrong soloMargin caller");
        // Decode variables
        (
            uint256 loanAmount,
            address buyer,
            uint8 fromX,
            uint8 fromY,
            uint8 toX,
            uint8 toY
        ) = abi.decode(data, (uint256, address, uint8, uint8, uint8, uint8));

        console.log("Wrapper weth balance Of:", WETH.balanceOf(address(this)));
        require(WETH.balanceOf(address(this)) >= loanAmount + 2, 
            "CANNOT REPAY LOAN");
        // convert WETH to eth
        WETH.withdraw(loanAmount);
        // buy from MEH and get all the money back
        _buyFromMEH(loanAmount, buyer, fromX, fromY, toX, toY);
        // convert ETH to back to weth
        WETH.deposit{value:loanAmount}();
        // ... solomargin withdraws loan amount on it's own
    }

    // is called by SoloMargin (see callFunction function above)
    // overriden in Minter.sol
    function _buyFromMEH(uint256 price, address buyer, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY) virtual internal {
    }
}