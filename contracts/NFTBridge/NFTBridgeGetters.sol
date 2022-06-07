// contracts/Getters.sol
// SPDX-License-Identifier: Apache 2

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../interfaces/ICore.sol";

import "./NFTBridgeState.sol";

contract NFTBridgeGetters is NFTBridgeState {
    // It is used to check if same Same governance action is previously taken
    function governanceActionIsConsumed(bytes32 hash) public view returns (bool) {
        return _state.consumedGovernanceActions[hash];
    }

    // Check if implementation contract is already initialized
    function isInitialized(address impl) public view returns (bool) {
        return _state.initializedImplementations[impl];
    }

    // Check if same transfer is previously completed
    function isTransferCompleted(bytes32 hash) public view returns (bool) {
        return _state.completedTransfers[hash];
    }

    // Return address of the core contract
    function core() public view returns (ICore) {
        return ICore(_state.core);
    }

    // Returns Chain ID
    function chainId() public view returns (uint16){
        return _state.provider.chainId;
    }

    // Returns Governance Chain ID 
    function governanceChainId() public view returns (uint16){
        return _state.provider.governanceChainId;
    }

    // Returns Governance Contract
    function governanceContract() public view returns (bytes32){
        return _state.provider.governanceContract;
    }

    // Return address of the bridge contract on given chain ID
    function bridgeContracts(uint16 chainId_) public view returns (bytes32){
        return _state.bridgeImplementations[chainId_];
    }
}