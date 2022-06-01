// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity >=0.8.0;
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "../libraries/external/BytesLib.sol";

import "./ERC721Safe.sol";
import "./NFTBridgeStructs.sol";
import "./NFTBridgeGetters.sol";
import "./NFTBridgeGovernance.sol";

contract Bridge is NFTBridgeGovernance, AccessControlEnumerable, IERC721Receiver, ERC721Safe {
    using ERC165Checker for address;
    using BytesLib for bytes;
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
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
    event ContractUpgraded(address indexed oldContract, address indexed newContract);

    constructor(address _implContract,address _core) {
        implContract = _implContract;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        setCore( _core);
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
    ) public payable returns (uint64 sequence){
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

        sequence = logTransfer(NFTBridgeStructs.Transfer({
                resourceID : resourceID,
                destinationDomainID         : destinationDomainID, 
                tokenID      : tokenID,
                uri          : metaData,
                user         : msg.sender
            }), msg.value, nonces[destinationDomainID]); 
    }

    function upgrade(bytes memory encodedVM) public {
        (ICore.VM memory vm, bool valid, string memory reason) = verifyGovernanceVM(encodedVM);
        require(valid, reason);
        address currentImplementation = implContract;

        setGovernanceActionConsumed(vm.hash);

        NFTBridgeStructs.UpgradeContract memory implementation = parseUpgrade(vm.payload);

        require(implementation.chainId == chainId(), "wrong chain id");

        implContract = address(uint160(uint256(implementation.newContract)));
        emit ContractUpgraded(currentImplementation, implContract);

    }

    function logTransfer(NFTBridgeStructs.Transfer memory transfer, uint256 callValue, uint64 nonce) internal returns (uint64 sequence) {
        bytes memory encoded = encodeTransfer(transfer);

        sequence = core().publishMessage{
            value : callValue
        }(nonce, encoded, 15); 
    }

    function encodeTransfer(NFTBridgeStructs.Transfer memory transfer) public pure returns (bytes memory encoded) {
        // There is a global limit on 200 bytes of tokenURI in Core due to Solana
        require(bytes(transfer.uri).length <= 200, "tokenURI must not exceed 200 bytes");

        encoded = abi.encodePacked(
            uint8(1),
            transfer.resourceID,
            transfer.destinationDomainID,
            transfer.tokenID,
            uint8(bytes(transfer.uri).length),
            transfer.uri,
            transfer.user
        );
    }


    function parseTransfer(bytes memory encoded) public pure returns (NFTBridgeStructs.Transfer memory transfer) {
        uint index = 0;

        uint8 payloadID = encoded.toUint8(index);
        index += 1;

        require(payloadID == 1, "invalid Transfer");

        transfer.resourceID = encoded.toBytes32(index);
        index += 32;

        transfer.destinationDomainID = encoded.toUint16(index);
        index += 2;

        transfer.tokenID = encoded.toUint256(index);
        index += 32;
        
        // Ignore length due to malformatted payload
        index += 1;
       
        transfer.uri = encoded.slice(index, encoded.length - index - 20);

        // From here we read backwards due malformatted package
        index = encoded.length;

        index -= 20;
        transfer.user = encoded.toAddress(index);
    }

    function executeProposal(
        bytes memory encodedVm
    ) external {
        (ICore.VM memory vm, bool valid, string memory reason) = core().parseAndVerifyVM(encodedVm);

        require(valid, reason);

        NFTBridgeStructs.Transfer memory transfer = parseTransfer(vm.payload);

        require(!isTransferCompleted(vm.hash), "transfer already completed");
        setTransferCompleted(vm.hash);
        require(verifyBridgeVM(vm), "invalid emitter");

        bytes32 resourceID = transfer.resourceID;
        uint256 tokenID = transfer.tokenID;
        address recipientAddress = transfer.user;
        bytes memory metaData = transfer.uri;

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

    function verifyBridgeVM(ICore.VM memory vm) internal view returns (bool){
        if (bridgeContracts(vm.emitterChainId) == vm.emitterAddress) {
            return true;
        }
        return false;
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
