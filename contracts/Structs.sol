// contracts/Structs.sol
// SPDX-License-Identifier: Apache 2
//STEP 1
pragma solidity ^0.8.0;

interface Structs {
	struct Provider {
		uint16 chainId;
		uint16 governanceChainId;
		bytes32 governanceContract;
	}

	// Guardian set are set of validators used for approving the bridge transactions
	struct GuardianSet {
		address[] keys;
		uint32 expirationTime;
	}

	// Signature of a single guardian including with index of that guardian
	struct Signature {
		bytes32 r;
		bytes32 s;
		uint8 v;
		uint8 guardianIndex;
	}

	// VM is a verifiable action approval of the Bridge protocol.
	// It represents a message observation made by the Bridge network.
	struct VM {

		// Protocol version of the entire VM.
		uint8 version;

		// Timestamp of the observed message (for most chains, this
		// identifies the block that contains the message transaction).
		uint32 timestamp;

		// Nonce of the VM, must to be set to random bytes. Nonces
		// prevent collisions where one emitter publishes identical
		// messages within one block (= timestamp).

		// It is not suitable as a global identifier -
		// use the (chain, emitter, sequence) tuple instead.
		uint32 nonce;

		// EmitterChain the VAA was emitted on. Set by the guardian node
		// according to which chain it received the message from.
		uint16 emitterChainId;

		// EmitterAddress of the contract that emitted the message. Set by
		// the guardian node according to protocol metadata.
		bytes32 emitterAddress;

		// Sequence number of the message. Automatically set and
		// and incremented by the core contract when called by
		// an emitter contract.
		//
		// Tracked per (EmitterChain, EmitterAddress) tuple.
		uint64 sequence;

		// Level of consistency requested by the emitter.
		//
		// The semantic meaning of this field is specific to the target
		// chain (like a commitment level on Solana, number of
		// confirmations on Ethereum, or no meaning with instant finality). 
		uint8 consistencyLevel;

		// Payload of the message.
		bytes payload;

		// Signatures contain a list of signatures made by the guardian set.
		Signature[] signatures;

		bytes32 hash;
	}
}
