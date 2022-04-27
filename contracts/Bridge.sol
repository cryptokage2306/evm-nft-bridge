// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity >=0.8.0;
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

import "./ERC721Safe.sol";

contract Bridge is AccessControlEnumerable, IERC721Receiver, ERC721Safe {
    using ERC165Checker for address;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    bytes4 private constant _INTERFACE_ERC721_METADATA = 0x5b5e139f;

    mapping(bytes32 => address) public _resourceIDToTokenContractAddress;
    mapping(uint8 => uint64) public nonces;
    mapping(uint72 => bool) private _proposals;
    mapping(address => bool) private _burnList;
    address public implContract;

    event Deposit(
        uint8 destinationDomainID,
        bytes32 resourceID,
        uint64 depositNonce,
        bytes data,
        address indexed user,
        bytes uri
    );

    event ResourceId(bytes32 _resourceId, address token);

    constructor(address _implContract) {
        implContract = _implContract;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(RELAYER_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function onERC721Received(
        address _operator,
        address _from,
        uint256 _tokenId,
        bytes calldata _data
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function deposit(
        uint8 destinationDomainID,
        bytes32 resourceID,
        bytes calldata data
    ) external {
        nonces[destinationDomainID] += 1;
        uint256 tokenID;
        bytes memory metaData;

        (tokenID) = abi.decode(data, (uint256));

        address tokenAddress = _resourceIDToTokenContractAddress[resourceID];

        // Check if the contract supports metadata, fetch it if it does
        if (tokenAddress.supportsInterface(_INTERFACE_ERC721_METADATA)) {
            IERC721Metadata erc721 = IERC721Metadata(tokenAddress);
            metaData = bytes(erc721.tokenURI(tokenID));
        }

        if (_burnList[tokenAddress]) {
            burnERC721(tokenAddress, tokenID);
        } else {
            lockERC721(tokenAddress, msg.sender, address(this), tokenID);
        }
        emit Deposit(
            destinationDomainID,
            resourceID,
            nonces[destinationDomainID],
            data,
            msg.sender,
            metaData
        );
    }

    function executeProposal(
        uint8 domainID,
        uint64 depositNonce,
        bytes32 resourceID,
        bytes calldata data
    ) external onlyRole(RELAYER_ROLE) {
        uint72 nonceAndID = (uint72(depositNonce) << 8) | uint72(domainID);

        uint256 tokenID;
        uint256 lenDestinationRecipientAddress;
        bytes memory destinationRecipientAddress;
        uint256 offsetMetaData;
        uint256 lenMetaData;
        bytes memory metaData;

        (tokenID, lenDestinationRecipientAddress) = abi.decode(
            data,
            (uint256, uint256)
        );
        offsetMetaData = 64 + lenDestinationRecipientAddress;
        destinationRecipientAddress = bytes(data[64:offsetMetaData]);
        lenMetaData = abi.decode(data[offsetMetaData:], (uint256));
        metaData = bytes(
            data[offsetMetaData + 32:offsetMetaData + 32 + lenMetaData]
        );

        bytes20 recipientAddress;

        assembly {
            recipientAddress := mload(add(destinationRecipientAddress, 0x20))
        }
        address tokenAddress = _resourceIDToTokenContractAddress[resourceID];
        if (_burnList[tokenAddress]) {
            mintERC721(
                tokenAddress,
                address(recipientAddress),
                tokenID,
                metaData
            );
        } else {
            releaseERC721(
                tokenAddress,
                address(this),
                address(recipientAddress),
                tokenID
            );
        }
    }

    function createResourceIdForToken(
        bytes32 _resourceId,
        string memory _name,
        string memory _symbol
    ) external onlyRole(ADMIN_ROLE) {
        address nft_contract = address(
            new TransparentUpgradeableProxy(
                implContract,
                msg.sender,
                abi.encodeWithSignature(
                    "initialize(string,string)",
                    _name,
                    _symbol
                )
            )
        );
        _setResourceIdForToken(_resourceId, nft_contract, false, true);
    }

    function setResourceIdForToken(
        bytes32 _resourceId,
        address _tokenAddress,
        bool overwrite,
        bool isBurnAddress
    ) external onlyRole(ADMIN_ROLE) {
        _setResourceIdForToken(
            _resourceId,
            _tokenAddress,
            overwrite,
            isBurnAddress
        );
    }

    function _setResourceIdForToken(
        bytes32 _resourceId,
        address token,
        bool overwrite,
        bool isBurnAddress
    ) internal {
        if (!overwrite) {
            require(
                _resourceIDToTokenContractAddress[_resourceId] == address(0),
                "already contract registered"
            );
        }
        if (isBurnAddress) {
            _burnList[token] = true;
        }
        _resourceIDToTokenContractAddress[_resourceId] = token;
        emit ResourceId(_resourceId, token);
    }
}
