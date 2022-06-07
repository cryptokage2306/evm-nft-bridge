// contracts/Setters.sol
// SPDX-License-Identifier: Apache 2

pragma solidity ^0.8.0;

import "./State.sol";

contract Setters is State {

    // Expire guardian set
    function expireGuardianSet() internal {
        _state.guardianSets.expirationTime = uint32(block.timestamp) + 86400;
    }

    // Set new Guardian Set
    function storeGuardianSet(Structs.GuardianSet memory set) internal {
        _state.guardianSets = set;
    }

    //  Set initialized to True for new Implementation contract
    function setInitialized(address implementatiom) internal {
        _state.initializedImplementations[implementatiom] = true;
    }

    // Set Hash of Governance action to consumed
    function setGovernanceActionConsumed(bytes32 hash) internal {
        _state.consumedGovernanceActions[hash] = true;
    }

    // Set chain ID 
    function setChainId(uint16 chainId) internal {
        _state.provider.chainId = chainId;
    }

    // Set Governance chain ID 
    function setGovernanceChainId(uint16 chainId) internal {
        _state.provider.governanceChainId = chainId;
    }

    // Set Governance Contract
    function setGovernanceContract(bytes32 governanceContract) internal {
        _state.provider.governanceContract = governanceContract;
    }

    // Set message fee for execute action
    function setMessageFee(uint256 newFee) internal {
        _state.messageFee = newFee;
    }

    // set next sequence for implementation
    function setNextSequence(address emitter, uint64 sequence) internal {
        _state.sequences[emitter] = sequence;
    }
}