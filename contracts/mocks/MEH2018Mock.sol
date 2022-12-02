pragma solidity ^0.8.4;

// Mock of MEH 2018 for testnet 
// wrapper only uses getBlockOwner function. Events are not 
// returns owner of a block
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Meh2018Mock is ERC721 {

    mapping(uint256 => address) public _owners;

    event LogAds(
        uint ID, 
        uint8 fromX,
        uint8 fromY,
        uint8 toX,
        uint8 toY,
        string imageSourceUrl,
        string adUrl,
        string adText,
        address indexed advertiser);

    constructor() ERC721("Million Ether Homepage", "MEH") {
    }

    /// @notice get an owner(address) of block at a specified coordinates
    function getBlockOwner(uint8 x, uint8 y) external view returns (address) {
        return ownerOf(blockID(x, y));
    }

    function mintBlock(uint8 x, uint8 y, address to) external {
        _safeMint(to, blockID(x, y));
    }

    function ownerOf(uint256 tokenId) public view override returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "ERC721: owner query for nonexistent token");
        return owner;
    }

    /// @notice get ERC721 token id corresponding to xy coordinates
    function blockID(uint8 x, uint8 y) public pure returns (uint16) {
        return (uint16(y) - 1) * 100 + uint16(x);
    }

    function emitAdsEvent(
        uint ID, 
        uint8 fromX,
        uint8 fromY,
        uint8 toX,
        uint8 toY,
        string calldata imageSourceUrl,
        string calldata adUrl,
        string calldata adText,
        address advertiser
    ) external {
        emit LogAds(
            ID,
            fromX,
            fromY,
            toX,
            toY,
            imageSourceUrl,
            adUrl,
            adText,
            advertiser);
    }
}