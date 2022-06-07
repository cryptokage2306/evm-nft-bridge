// contracts/Getters.sol
// SPDX-License-Identifier: Apache 2

pragma solidity ^0.8.0;

import "./State.sol";
contract Getters is State {
    // Get Current Guardian Set
    function getGuardianSet() public view returns (Structs.GuardianSet memory) {
        return _state.guardianSets;
    }

    // It is used to check if same Same governance action is previously taken
    function governanceActionIsConsumed(bytes32 hash) public view returns (bool) {
        return _state.consumedGovernanceActions[hash];
    }

    // Check if implementation contract is already initialized
    function isInitialized(address impl) public view returns (bool) {
        return _state.initializedImplementations[impl];
    }

    // return the chain ID used in Set up
    function chainId() public view returns (uint16) {
        return _state.provider.chainId;
    }

    // returns the Governance Chain ID
    function governanceChainId() public view returns (uint16){
        return _state.provider.governanceChainId;
    }

    // returns the Governance Contract
    function governanceContract() public view returns (bytes32){
        return _state.provider.governanceContract;
    }

    // returns the messageFee 
    function messageFee() public view returns (uint256) {
        return _state.messageFee;
    }

    // returns the next sequence for emitter 
    function nextSequence(address emitter) public view returns (uint64) {
        return _state.sequences[emitter];
    }
}