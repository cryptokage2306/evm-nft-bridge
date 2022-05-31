pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../ERC721MinterBurnerPauser.sol";

contract TestERC721 is ERC721MinterBurnerPauser{
    constructor(string memory name_, string memory symbol_) {
        initialize(name_, symbol_);
    }
}