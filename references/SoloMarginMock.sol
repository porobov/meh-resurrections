pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

// import "hardhat/console.sol";
import "../libs/dydx.sol";
import "../balancer-labs/solidity-utils/misc/IWETH.sol";

// This is stripped off SoloMargin contract
// https://github.com/dydxprotocol/solo/blob/master/contracts/protocol/impl/OperationImpl.sol
// to be deployed to a testnet (goerli)

// doesn't do actual flashloan (see Withdraw and Deposit action types in _runActions)
// thus wrapper contract must posses enough WETH
// probably need custom WETH contract too because of that 
// it is simpler than mocking the full-blown SoloMargin 

interface ICallee {

    // ============ Public Functions ============

    /**
     * Allows users to send this contract arbitrary data.
     *
     * @param  sender       The msg.sender to Solo
     * @param  accountInfo  The account from which the data is being sent
     * @param  data         Arbitrary data given by the sender
     */
    function callFunction (
        address sender,
        Account.Info memory accountInfo,
        bytes memory data
    )
        external;
}

contract SoloMarginMock {

IWETH public WETH;

constructor(address wethAddress) {
        WETH = IWETH(wethAddress);
    }

function operate(
        Account.Info[] memory accounts,
        Actions.ActionArgs[] memory actions
    )
        public
    {

        _runActions(
            accounts,
            actions
        );

    }

function _runActions(
        Account.Info[] memory accounts,
        Actions.ActionArgs[] memory actions
    )
        private
    {
        for (uint256 i = 0; i < actions.length; i++) {
            Actions.ActionArgs memory action = actions[i];
            Actions.ActionType actionType = action.actionType;

            if (actionType == Actions.ActionType.Deposit) {
                // do nothing
                //_deposit(state, Actions.parseDepositArgs(accounts, action));
            }
            else if (actionType == Actions.ActionType.Withdraw) {
                // do nothing
                //_withdraw(state, Actions.parseWithdrawArgs(accounts, action));
            }
            else  {
                assert(actionType == Actions.ActionType.Call);
                _call(Actions.parseCallArgs(accounts, action));
            }
        }
    }


function _call(
        Actions.CallArgs memory args
    )
        private
    {   
        // console.log("Sending weth to:", args.callee);
        WETH.transfer(args.callee, 2 ether);
        ICallee(args.callee).callFunction(
            msg.sender,
            args.account,
            args.data
        );
        WETH.transferFrom(args.callee, address(this), 2 ether);

        // Events.logCall(args);
    }
}