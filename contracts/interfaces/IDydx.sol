// now this file is used only for mocks
pragma solidity ^0.8.0;

import "../libs/dydx.sol";

interface ISoloMargin {
    function operate(Account.Info[] memory accounts, Actions.ActionArgs[] memory actions) external;
    function getNumMarkets() external view returns (uint256);
}

// The interface for a contract to be callable after receiving a flash loan
interface ICallee {
    function onFlashLoan(bytes memory data) external;
}