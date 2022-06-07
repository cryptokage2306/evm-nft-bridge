// contracts/Setters.sol
// SPDX-License-Identifier: Apache 2

pragma solidity ^0.8.0;

import "./NFTBridgeState.sol";

contract NFTBridgeSetters is NFTBridgeState {
    //  Set initialized to True for new Implementation contract
    function setInitialized(address implementatiom) internal {
        _state.initializedImplementations[implementatiom] = true;
    }

    // Set Hash of Governance action to consumed
    function setGovernanceActionConsumed(bytes32 hash) internal {
        _state.consumedGovernanceActions[hash] = true;
    }

    // Set transfer hash inside it to check for completion
    function setTransferCompleted(bytes32 hash) internal {
        _state.completedTransfers[hash] = true;
    }

    // Set Chain ID 
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

    // Set Bridge contract address on given Chain
    function setBridgeImplementation(uint16 chainId, bytes32 bridgeContract) internal {
        _state.bridgeImplementations[chainId] = bridgeContract;
    }

    // Set core address
    function setCore(address wh) internal {
        _state.core = payable(wh);
    }

}