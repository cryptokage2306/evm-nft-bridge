// contracts/BridgeSetup.sol
// SPDX-License-Identifier: Apache 2

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;
import "./NFTBridgeGovernance.sol";

contract NFTBridgeSetup is NFTBridgeSetters {
    function setup(
        uint16 chainId,
        uint16 governanceChainId,
        bytes32 governanceContract
    ) public {
        setChainId(chainId);
        setGovernanceChainId(governanceChainId);
        setGovernanceContract(governanceContract);
    }
}
