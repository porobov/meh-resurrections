// The ABI encoder is necessary, but older Solidity versions should work
pragma solidity ^0.8.0;

import "../libs/dydx.sol";

interface ISoloMargin {
    function operate(Account.Info[] memory accounts, Actions.ActionArgs[] memory actions) external;
    function getNumMarkets() external view returns (uint256);
}

// The interface for a contract to be callable after receiving a flash loan
interface ICallee {
    function callFunction(address sender, Account.Info memory accountInfo, bytes memory data) external;
    function onFlashLoan(bytes memory data) external;
}