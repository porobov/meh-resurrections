pragma solidity ^0.8.0;
import "../UsingTools.sol";

contract UsingToolsAdapter is UsingTools {
    function isLegalCoordinatesExt(
        uint8 _fromX, 
        uint8 _fromY, 
        uint8 _toX, 
        uint8 _toY
    )    
        external 
        pure
        returns (bool) 
    {
        return isLegalCoordinates(_fromX, _fromY, _toX, _toY);
    }

    function countBlocksExt(
        uint8 fromX, 
        uint8 fromY, 
        uint8 toX, 
        uint8 toY
    ) 
        external 
        pure 
        returns (uint16)
    {
        return countBlocks(fromX, fromY, toX, toY);
    }

    function blocksListExt(
        uint8 fromX, 
        uint8 fromY, 
        uint8 toX, 
        uint8 toY
    ) 
        internal 
        pure 
        returns (uint16[] memory r) 
    {
        return blocksList(fromX, fromY, toX, toY);
    }

    function blockXYExt(uint16 blockId) external pure returns (uint8, uint8) {
        return blockXY(blockId);
    }

    function blockIDExt(uint8 x, uint8 y) external pure returns (uint16) {
        return blockID(x, y);
    }
}
