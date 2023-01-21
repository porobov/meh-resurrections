// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

contract UsingTools {

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
        return uint16(toX - fromX + 1) * uint16(toY - fromY + 1);
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
        internal 
        pure 
        returns (bool) 
    {
        return ((_fromX >= 1) && (_fromY >=1)  && (_toX <= 100) && (_toY <= 100) 
            && (_fromX <= _toX) && (_fromY <= _toY));
    }
}
