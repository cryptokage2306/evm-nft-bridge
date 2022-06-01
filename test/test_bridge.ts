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

const BridgeImplementationFullABI = jsonfile.readFileSync(
  "artifacts/contracts/NFTBridge/Bridge.sol/Bridge.json"
).abi;
const testForeignChainId = "1";
const testForeignBridgeContract =
  "0x000000000000000000000000000000000000000000000000000000000000ffff";

const resourceID =
  "0x9b05a194b2aafc404907ab4a20261a2e917ea70a5c9f44057f5b5e0ed2b4da5b";
const initialSigners = [process.env.INIT_SIGNERS];
const chainId = 1;
const governanceChainId = 10;
const governanceContract =
  "0x0000000000000000000000000000000000000000000000000000000000000004";
const testSigner1PK = process.env.PRIVATE_KEY;
const testSigner3PK =
  "cfb12303a19cde580bb4dd771639b0d26bc68353645571a8cff516ab2ee113a0";
const testSigner2PK =
  "892330666a850761e7370376430bb8c2aa1494072d3bfeaed0c4fa3d5a9135fe";
const testGovernanceContract =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

describe("Bridge", function () {
  const testSigner1 = web3.eth.accounts.privateKeyToAccount(testSigner3PK);
  const testSigner2 = web3.eth.accounts.privateKeyToAccount(testSigner2PK);
  let BridgeContract: Bridge;
  let TestContract: TestERC721;
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
    const SetupNFT = await ethers.getContractFactory("NFTBridgeSetup");
    const setupNFT = await SetupNFT.deploy();

    await setupNFT.deployed();

    await setupNFT.setup(chainId, governanceChainId, governanceContract);

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
    const [owner] = await ethers.getSigners();
    const { currentImplAddress } = await deployMinterBurner();
    const { wh } = await deployCore();
    const Bridge = await ethers.getContractFactory("Bridge");
    const BridgeContract1 = await Bridge.deploy(currentImplAddress, wh);
    BridgeContract = await BridgeContract1.deployed();
    const TestERC721 = await ethers.getContractFactory("TestERC721");
    const testERC721 = await TestERC721.deploy("name","testID");
    TestContract = await testERC721.deployed();
  });

  it("Tests for createResourceIdForToken", async function () {
    TruffleAssert.passes(
      await BridgeContract.createResourceIdForToken(
        resourceID,
        "name",
        "symbol"
      )
    );
  });

  it("Tests for Happy flow _setResourceIdForToken", async function () {
    const [deployer] = await ethers.getSigners();
    TruffleAssert.passes(
      await BridgeContract.setResourceIdForToken(
        resourceID,
        deployer.address,
        true,
        true
      )
    );
  });

  it("Negative Tests for _setResourceIdForToken", async function () {
    const [deployer] = await ethers.getSigners();
    const accs = await ethers.getSigners();
    TruffleAssert.passes(
      await BridgeContract.setResourceIdForToken(
        resourceID,
        deployer.address,
        false,
        true
      )
    );

    await assertIsRejected(
      BridgeContract.setResourceIdForToken(
        resourceID,
        deployer.address,
        false,
        true
      ),
      /already contract registered/,
      "already contract registered"
    );
  });

  it("Tests for _resourceIDToTokenContractAddress", async function () {
    TruffleAssert.passes(
      await BridgeContract._resourceIDToTokenContractAddress(resourceID)
    );
  });


  it("Tests for Deposit ", async function () {
    const [owner] = await ethers.getSigners();
    await BridgeContract.setResourceIdForToken(
      resourceID,
      TestContract.address,
      true,
      false
    );
    await TestContract.mint(owner.address, 1,"");

    expect(await TestContract.ownerOf(1)).to.equal(owner.address);
    await TestContract.setApprovalForAll(BridgeContract.address, true);
    const depositData = createERCDepositData(1, 20, owner.address);
    await BridgeContract.deposit(123, resourceID, depositData);
    expect(await TestContract.ownerOf(1)).to.equal(BridgeContract.address);
  });

  it("Tests for Deposit burnable ", async function () {
    const [owner] = await ethers.getSigners();
    await BridgeContract.setResourceIdForToken(
      resourceID,
      TestContract.address,
      true,
      true
    );
    await TestContract.mint(owner.address, 1,"");

    expect(await TestContract.ownerOf(1)).to.equal(owner.address);
    await TestContract.setApprovalForAll(BridgeContract.address, true);
    const depositData = createERCDepositData(1, 20, owner.address);
    await BridgeContract.deposit(123, resourceID, depositData);

  });

  it("should accept smart contract upgrades", async function () {
    const { currentImplAddress } = await deployMinterBurner();

    const timestamp = 1000;
    const nonce = 1001;
    const emitterAddress = testGovernanceContract;

    let data = await signAndEncodePayloadContract(2, 0, currentImplAddress);

    const vm = await signAndEncodeVM(
      timestamp,
      nonce,
      0,
      emitterAddress,
      0,
      "0x" + data,
      [testSigner1PK],
      2
    );

    TruffleAssert.passes(await BridgeContract.upgrade("0x" + vm));
  });

  it("should not accept smart contract upgrades with wrong governance chain", async function () {
    const { currentImplAddress } = await deployMinterBurner();

    const timestamp = 1000;
    const nonce = 1001;
    const emitterAddress = testGovernanceContract;

    let data = await signAndEncodePayloadContract(2, 0, currentImplAddress);

    const vm = await signAndEncodeVM(
      timestamp,
      nonce,
      1,
      emitterAddress,
      0,
      "0x" + data,
      [testSigner1PK],
      2
    );

    await assertIsRejected(
      BridgeContract.upgrade("0x" + vm),
      /wrong governance chain/,
      "wrong governance chain"
    );
  });

  it("should not accept smart contract upgrades with wrong governance contract", async function () {
    const { currentImplAddress } = await deployMinterBurner();

    const timestamp = 1000;
    const nonce = 1001;

    let data = await signAndEncodePayloadContract(2, 0, currentImplAddress);

    const vm = await signAndEncodeVM(
      timestamp,
      nonce,
      0,
      "0x0000000000000000000000000000000000000000000000000000000000000004",
      0,
      "0x" + data,
      [testSigner1PK],
      2
    );

    await assertIsRejected(
      BridgeContract.upgrade("0x" + vm),
      /wrong governance contract/,
      "wrong governance contract"
    );
  });

  it("should not accept smart contract upgrades for same VM", async function () {
    const { currentImplAddress } = await deployMinterBurner();

    const timestamp = 1000;
    const nonce = 1001;
    const emitterAddress = testGovernanceContract;

    let data = await signAndEncodePayloadContract(2, 0, currentImplAddress);

    const vm = await signAndEncodeVM(
      timestamp,
      nonce,
      0,
      emitterAddress,
      0,
      "0x" + data,
      [testSigner1PK],
      2
    );

    TruffleAssert.passes(await BridgeContract.upgrade("0x" + vm));
    await assertIsRejected(
      BridgeContract.upgrade("0x" + vm),
      /governance action already consumed/,
      "governance action already consumed"
    );
  });

  it("Tests for Execute", async function () {
    const [owner] = await ethers.getSigners();
    await BridgeContract.setResourceIdForToken(
      resourceID,
      TestContract.address,
      true,
      false
    );
    await TestContract.mint(owner.address, 1,"");

    expect(await TestContract.ownerOf(1)).to.equal(owner.address);
    await TestContract.setApprovalForAll(BridgeContract.address, true);
    const depositData = createERCDepositData(1, 20, owner.address);
    const bcv = await BridgeContract.deposit(123, resourceID, depositData);
    expect(await TestContract.ownerOf(1)).to.equal(BridgeContract.address);

    let core_Address = await BridgeContract.core();

    const core = new web3.eth.Contract(CoreImplementationFullABI, core_Address);
    const log = (
      await core.getPastEvents("LogMessagePublished", {
        fromBlock: "latest",
      })
    )[0].returnValues;

    let sequence = log.sequence;
    let nonce = log.nonce;
    let payload = log.payload;
    let cl = log.consistencyLevel;

    let encodedVM = await signAndEncodeVM(
      0,
      nonce,
      121,
      "0x0000000000000000000000000000000000000000",
      sequence,
      payload,
      [testSigner1PK],
      cl
    );

    await BridgeContract.executeProposal("0x" + encodedVM);
    expect(await TestContract.ownerOf(1)).to.equal(owner.address);
  });

  it("Tests for Execute burnable", async function () {
    const [owner] = await ethers.getSigners();
    await BridgeContract.setResourceIdForToken(
      resourceID,
      TestContract.address,
      true,
      true
    );
    await TestContract.mint(owner.address, 1,"");

    expect(await TestContract.ownerOf(1)).to.equal(owner.address);
    await TestContract.setApprovalForAll(BridgeContract.address, true);
    const depositData = createERCDepositData(1, 20, owner.address);
    await BridgeContract.deposit(123, resourceID, depositData);

    let core_Address = await BridgeContract.core();

    const core = new web3.eth.Contract(CoreImplementationFullABI, core_Address);
    const log = (
      await core.getPastEvents("LogMessagePublished", {
        fromBlock: "latest",
      })
    )[0].returnValues;

    let sequence = log.sequence;
    let nonce = log.nonce;
    let payload = log.payload;
    let cl = log.consistencyLevel;

    let encodedVM = await signAndEncodeVM(
      0,
      nonce,
      121,
      "0x0000000000000000000000000000000000000000",
      sequence,
      payload,
      [testSigner1PK],
      cl
    );

    let minter = await TestContract.MINTER_ROLE()

    await TestContract.grantRole(minter,BridgeContract.address)
    await BridgeContract.executeProposal("0x" + encodedVM);
    expect(await TestContract.ownerOf(1)).to.equal(owner.address);
  });

  it("should register a foreign bridge implementation correctly", async function () {
    const initialized = new web3.eth.Contract(
      BridgeImplementationFullABI,
      BridgeContract.address
    );
    const accounts = await web3.eth.getAccounts();

    let data = await signAndEncodePayloadRegisterChain(
      1,
      0,
      testForeignChainId,
      testForeignBridgeContract
    );

    const timestamp = 1000;
    const nonce = 1001;
    const emitterAddress = testGovernanceContract;

    const vm = await signAndEncodeVM(
      timestamp,
      nonce,
      0,
      emitterAddress,
      0,
      "0x" + data,
      [testSigner1PK],
      2
    );

    let before = await initialized.methods
      .bridgeContracts(testForeignChainId)
      .call();

    assert.equal(
      before,
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );

    await initialized.methods.registerChain("0x" + vm).send({
      value: 0,
      from: accounts[0],
      gasLimit: 2000000,
    });

    let after = await initialized.methods
      .bridgeContracts(testForeignChainId)
      .call();

    assert.equal(after, testForeignBridgeContract);
  });

  const signAndEncodePayloadRegisterChain = async (
    action: any,
    chain: any,
    emitterChainId: any,
    emitterAddress: any
  ) => {
    const body = [
      web3.eth.abi.encodeParameter("uint8", action).substring(2 + (64 - 2)),
      web3.eth.abi.encodeParameter("uint16", chain).substring(2 + (64 - 4)),
      web3.eth.abi
        .encodeParameter("uint16", emitterChainId)
        .substring(2 + (64 - 4)),
      web3.eth.abi.encodeParameter("bytes32", emitterAddress).substring(2),
    ].join("");

    return body;
  };

  const signAndEncodePayloadContract = async (
    action: any,
    chain: any,
    add: any
  ) => {
    const body = [
      web3.eth.abi.encodeParameter("uint8", action).substring(2 + (64 - 2)),
      web3.eth.abi.encodeParameter("uint16", chain).substring(2 + (64 - 4)),
      // Recipient
      web3.eth.abi.encodeParameter("address", add).substring(2),
    ].join("");

    return body;
  };

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
