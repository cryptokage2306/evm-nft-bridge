// contracts/Governance.sol
// SPDX-License-Identifier: Apache 2

pragma solidity ^0.8.0;

import "./Structs.sol";
import "./GovernanceStructs.sol";
import "./Messages.sol";
import "./Setters.sol";

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Upgrade.sol";

abstract contract Governance is GovernanceStructs, Messages, Setters, ERC1967Upgrade {
    event ContractUpgraded(address indexed oldContract, address indexed newContract);
    event GuardianSetAdded(uint32 indexed index);

    //Governance action Used for submit new contract upgrades
    function submitContractUpgrade(bytes memory _vm) public {
        Structs.VM memory vm = parseVM(_vm);

        (bool isValid, string memory reason) = verifyGovernanceVM(vm);
        require(isValid, reason);

        GovernanceStructs.ContractUpgrade memory upgrade = parseContractUpgrade(vm.payload);

        require(upgrade.chain == chainId(), "Invalid Chain");

        setGovernanceActionConsumed(vm.hash);

        upgradeImplementation(upgrade.newContract);
    }

    //Governance action Used for set message fee for execution
    function submitSetMessageFee(bytes memory _vm) public {
        Structs.VM memory vm = parseVM(_vm);

        (bool isValid, string memory reason) = verifyGovernanceVM(vm);
        require(isValid, reason);

        GovernanceStructs.SetMessageFee memory upgrade = parseSetMessageFee(vm.payload);

        require(upgrade.chain == chainId(), "Invalid Chain");

        setGovernanceActionConsumed(vm.hash);

        setMessageFee(upgrade.messageFee);
    }

    //Governance action to set new Guardian set
    function submitNewGuardianSet(bytes memory _vm) public {
        Structs.VM memory vm = parseVM(_vm);

        (bool isValid, string memory reason) = verifyGovernanceVM(vm);
        require(isValid, reason);

        GovernanceStructs.GuardianSetUpgrade memory upgrade = parseGuardianSetUpgrade(vm.payload);

        require(upgrade.chain == chainId() || upgrade.chain == 0, "invalid Chain");

        require(upgrade.newGuardianSet.keys.length > 0, "new guardian set is empty");

        setGovernanceActionConsumed(vm.hash);

        expireGuardianSet();
        storeGuardianSet(upgrade.newGuardianSet);
    }

    //Governance action to distribute Transfer fees
    function submitTransferFees(bytes memory _vm) public {
        Structs.VM memory vm = parseVM(_vm);

        (bool isValid, string memory reason) = verifyGovernanceVM(vm);
        require(isValid, reason);

        GovernanceStructs.TransferFees memory transfer = parseTransferFees(vm.payload);

        require(transfer.chain == chainId() || transfer.chain == 0, "invalid Chain");

        setGovernanceActionConsumed(vm.hash);

        address payable recipient = payable(address(uint160(uint256(transfer.recipient))));

        recipient.transfer(transfer.amount);
    }

    function upgradeImplementation(address newImplementation) internal {
        address currentImplementation = _getImplementation();

        _upgradeTo(newImplementation);

        // Call initialize function of the new implementation
        (bool success, bytes memory reason) = newImplementation.delegatecall(abi.encodeWithSignature("initialize()"));

        require(success, string(reason));

        emit ContractUpgraded(currentImplementation, newImplementation);
    }

    // Verify Governance sent within the VM for governance Action
    function verifyGovernanceVM(Structs.VM memory vm) internal view returns (bool, string memory){
        // validate vm
        (bool isValid, string memory reason) = verifyVM(vm);
        if (!isValid){
            return (false, reason);
        }

        // verify source
        if (uint16(vm.emitterChainId) != governanceChainId()) {
            return (false, "wrong governance chain");
        }
        if (vm.emitterAddress != governanceContract()) {
            return (false, "wrong governance contract");
        }

        // prevent re-entry
        if (governanceActionIsConsumed(vm.hash)){
            return (false, "governance action already consumed");
        }

        return (true, "");
    }
}