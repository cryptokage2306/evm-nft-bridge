pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";


contract TestERC721 is ERC721("Test", "tt") {
    function mint(address recipient, uint256 tokenId) external {
        _mint(recipient, tokenId);
    }
}