// contracts/Bridge.sol
// SPDX-License-Identifier: Apache 2

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Upgrade.sol";

import "../libraries/external/BytesLib.sol";

import "./NFTBridgeGetters.sol";
import "./NFTBridgeSetters.sol";
import "./NFTBridgeStructs.sol";

import "../interfaces/ICore.sol";

contract NFTBridgeGovernance is NFTBridgeGetters, NFTBridgeSetters, ERC1967Upgrade {
    using BytesLib for bytes;

    // Execute a RegisterChain governance message
    function registerChain(bytes memory encodedVM) public {
        (ICore.VM memory vm, bool valid, string memory reason) = verifyGovernanceVM(encodedVM);
        require(valid, reason);

        setGovernanceActionConsumed(vm.hash);

        NFTBridgeStructs.RegisterChain memory chain = parseRegisterChain(vm.payload);

        require(chain.chainId == chainId() || chain.chainId == 0, "invalid chain id");

        setBridgeImplementation(chain.emitterChainID, chain.emitterAddress);
    }

    // Verify if VM is emitted by the Governance
    function verifyGovernanceVM(bytes memory encodedVM) internal view returns (ICore.VM memory parsedVM, bool isValid, string memory invalidReason){
        (ICore.VM memory vm, bool valid, string memory reason) = core().parseAndVerifyVM(encodedVM);

        if(!valid){
            return (vm, valid, reason);
        }

        if (vm.emitterChainId != governanceChainId()) {
            return (vm, false, "wrong governance chain");
        }
        if (vm.emitterAddress != governanceContract()) {
            return (vm, false, "wrong governance contract");
        }

        if(governanceActionIsConsumed(vm.hash)){
            return (vm, false, "governance action already consumed");
        }

        return (vm, true, "");
    }

    // Parse payload of register Chain VM
    function parseRegisterChain(bytes memory encoded) public pure returns(NFTBridgeStructs.RegisterChain memory chain) {
        uint index = 0;

        chain.action = encoded.toUint8(index);
        index += 1;
        require(chain.action == 1, "invalid RegisterChain: wrong action");

        chain.chainId = encoded.toUint16(index);
        index += 2;

        // payload

        chain.emitterChainID = encoded.toUint16(index);
        index += 2;

        chain.emitterAddress = encoded.toBytes32(index);
        index += 32;

        require(encoded.length == index, "invalid RegisterChain: wrong length");
    }

    // Parse payload of upload contract action VM
    function parseUpgrade(bytes memory encoded) public pure returns(NFTBridgeStructs.UpgradeContract memory chain) {
        uint index = 0;

        // governance header

        chain.action = encoded.toUint8(index);
        index += 1;
        require(chain.action == 2, "invalid UpgradeContract: wrong action");

        chain.chainId = encoded.toUint16(index);
        index += 2;

        // payload

        chain.newContract = encoded.toBytes32(index);
        index += 32;

        require(encoded.length == index, "invalid UpgradeContract: wrong length");
    }
}
