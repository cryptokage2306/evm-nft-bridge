import { assert, expect } from "chai";
import { ethers, upgrades, artifacts, web3 } from "hardhat";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";

import { createERCDepositData, assertIsRejected } from "./helper";
import { Bridge, Implementation, TestERC721 } from "../typechain";

const jsonfile = require("jsonfile");
const elliptic = require("elliptic");
const TruffleAssert = require("truffle-assertions");

require("dotenv").config({ path: "../.env" });

const Setup2 = artifacts.require("Setup");
const CoreImplementationFullABI = jsonfile.readFileSync(
  "artifacts/contracts/Implementation.sol/Implementation.json"
).abi;

const initialSigners = [process.env.INIT_SIGNERS];
const chainId = process.env.INIT_CHAIN_ID;
const governanceChainId = process.env.INIT_GOV_CHAIN_ID;
const governanceContract = process.env.INIT_GOV_CONTRACT;
const testSigner1PK = process.env.PRIVATE_KEY;
const testSigner3PK = "cfb12303a19cde580bb4dd771639b0d26bc68353645571a8cff516ab2ee113a0";
const testSigner2PK = "892330666a850761e7370376430bb8c2aa1494072d3bfeaed0c4fa3d5a9135fe";

describe("Bridge", function () {
  const testSigner1 = web3.eth.accounts.privateKeyToAccount(testSigner3PK);
  const testSigner2 = web3.eth.accounts.privateKeyToAccount(testSigner2PK);
  let BridgeContract: Bridge;
  let ImplementationContract: Implementation;

  const deployMinterBurner = async () => {
    const MinterBurnerPauser = await ethers.getContractFactory(
      "ERC721MinterBurnerPauser"
    );

    const minterburner = await upgrades.deployProxy(
      MinterBurnerPauser,
      ["Name", "Symbol"],
      {
        kind: "transparent",
      }
    );

    await minterburner.deployed();
    const currentImplAddress = await getImplementationAddress(
      ethers.provider,
      minterburner.address
    );
    return {
      currentImplAddress,
    };
  };

  const deployCore = async () => {
    const Setup = await ethers.getContractFactory("Setup");
    const setup = await Setup.deploy();

    await setup.deployed();

    const Implementation = await ethers.getContractFactory("Implementation");
    const implementation = await Implementation.deploy();
    ImplementationContract = await implementation.deployed();

    const setup1 = new web3.eth.Contract(Setup2.abi, setup.address);
    const initData = setup1.methods
      .setup(
        implementation.address,
        initialSigners,
        chainId,
        governanceChainId,
        governanceContract
      )
      .encodeABI();
    const Core = await ethers.getContractFactory("Core");
    const core = await Core.deploy(setup.address, initData);

    await core.deployed();
    const wh = core.address;
    return {
      wh,
    };
  };

  beforeEach(async function () {
    const { currentImplAddress } = await deployMinterBurner();
    const { wh } = await deployCore();
    const Bridge = await ethers.getContractFactory("Bridge");
    const BridgeContract1 = await Bridge.deploy(currentImplAddress, wh);
    BridgeContract = await BridgeContract1.deployed();
  });

  it("Test for core", async function () {
    const accounts = await web3.eth.getAccounts();

    let core_Address = await BridgeContract.core();

    const initialized = new web3.eth.Contract(CoreImplementationFullABI, core_Address);

    let guardians = await initialized.methods.getGuardianSet().call();
    assert.equal(guardians[0][0], initialSigners[0]);

    let payload = await signAndEncodePayload(
      2,
      chainId,
      2,
      [testSigner2.address,testSigner1.address]
    )

    let encodedVM = await signAndEncodeVM(
      0,
      121211,
      governanceChainId,
      governanceContract,
      0,
      "0x"+payload,
      [testSigner1PK],
      15
    );

    let set = await initialized.methods.submitNewGuardianSet("0x" + encodedVM).send({
      value: 0,
      from: accounts[0],
      gasLimit: 1000000
  });

  let guardians2 = await initialized.methods.getGuardianSet().call();

  assert.equal(guardians2[0][0], testSigner2.address);
  assert.equal(guardians2[0][1], testSigner1.address);
  });
  const signAndEncodePayload = async( action: any,chain: any,length: any,newsigners: any[]) => {
    const body = [
      web3.eth.abi.encodeParameter("uint8", action).substring(2 + (64 - 2)),
      web3.eth.abi.encodeParameter("uint16", chain).substring(2 + (64 - 4)),
      web3.eth.abi.encodeParameter("uint8", length).substring(2 + (64 - 2)),
      web3.eth.abi.encodeParameter("address", newsigners[0]).substring(2 + (64 - 40)),
      web3.eth.abi.encodeParameter("address", newsigners[1]).substring(2 + (64 - 40)),
    ].join("")

    return body;
  }

  const signAndEncodeVM = async function (
    timestamp: any,
    nonce: any,
    emitterChainId: any,
    emitterAddress: any,
    sequence: any,
    data: string,
    signers: any[],
    // guardianSetIndex: any,
    consistencyLevel: any
  ) {
    const body = [
      web3.eth.abi.encodeParameter("uint32", timestamp).substring(2 + (64 - 8)),
      web3.eth.abi.encodeParameter("uint64", nonce).substring(2 + (64 - 8)),
      web3.eth.abi
        .encodeParameter("uint16", emitterChainId)
        .substring(2 + (64 - 4)),
      web3.eth.abi.encodeParameter("bytes32", emitterAddress).substring(2),
      web3.eth.abi.encodeParameter("uint64", sequence).substring(2 + (64 - 16)),
      web3.eth.abi
        .encodeParameter("uint8", consistencyLevel)
        .substring(2 + (64 - 2)),
      data.substr(2),
    ];
    const hash = web3.utils.soliditySha3("0x" + body.join(""));
    if (!hash) return;

    const hash2 = web3.utils.soliditySha3(hash);
    if (!hash2) return;
    let signatures = "";

    for (let i in signers) {
      const ec = new elliptic.ec("secp256k1");
      const key = ec.keyFromPrivate(signers[i]);
      const signature = key.sign(hash2.substring(2), { canonical: true });

      const packSig = [
        web3.eth.abi.encodeParameter("uint8", i).substring(2 + (64 - 2)),
        zeroPadBytes(signature.r.toString(16), 32),
        zeroPadBytes(signature.s.toString(16), 32),
        web3.eth.abi
          .encodeParameter("uint8", signature.recoveryParam)
          .substring(2 + (64 - 2)),
      ];

      signatures += packSig.join("");
    }

    const vm = [
      web3.eth.abi.encodeParameter("uint8", 1).substring(2 + (64 - 2)),
      web3.eth.abi
        .encodeParameter("uint8", signers.length)
        .substring(2 + (64 - 2)),
      signatures,
      body.join(""),
    ].join("");

    return vm;
  };

  function zeroPadBytes(value: string | any[], length: number) {
    while (value.length < 2 * length) {
      value = "0" + value;
    }
    return value;
  }
});
