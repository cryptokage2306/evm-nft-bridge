import { assert, expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";

import {
  createERCDepositData,
  createERC721DepositProposalData,
  assertIsRejected,
} from "./helper";
import { Bridge } from "../typechain";
const TruffleAssert = require("truffle-assertions");

describe("Bridge", function () {
  const resourceID =
    "0x9b05a194b2aafc404907ab4a20261a2e917ea70a5c9f44057f5b5e0ed2b4da5b";

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

  let BridgeContract: Bridge;

  beforeEach(async function () {
    const { currentImplAddress } = await deployMinterBurner();
    const Bridge = await ethers.getContractFactory("Bridge");
    const bridge = await Bridge.deploy(currentImplAddress);
    BridgeContract = await bridge.deployed();
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

  it("Tests for _resourceIDToTokenContractAddress", async function () {
    TruffleAssert.passes(
      await BridgeContract._resourceIDToTokenContractAddress(resourceID)
    );
  });

  it("Should assign relayer role", async function () {
    const [deployer] = await ethers.getSigners();
    const relayer = await BridgeContract.RELAYER_ROLE();
    TruffleAssert.passes(
      await BridgeContract.grantRole(relayer, deployer.address)
    );
    assert.isTrue(await BridgeContract.hasRole(relayer, deployer.address));
  });

  it("Tests for Execute Propossal", async function () {
    const [deployer] = await ethers.getSigners();
    const accs = await ethers.getSigners();

    await BridgeContract.createResourceIdForToken(resourceID, "name", "symbol");
    const relayer = await BridgeContract.RELAYER_ROLE();
    await BridgeContract.grantRole(relayer, deployer.address);
    const tokenAddress = await BridgeContract._resourceIDToTokenContractAddress(
      resourceID
    );
    await BridgeContract.setResourceIdForToken(
      resourceID,
      tokenAddress,
      true,
      true
    );
    const executeData = createERC721DepositProposalData(
      1,
      20,
      accs[1].address,
      32,
      0
    );
    await BridgeContract.executeProposal(123, 12, resourceID, executeData);

    const minter = await ethers.getContractAt(
      "ERC721MinterBurnerPauser",
      tokenAddress
    );
    expect(await minter.connect(accs[1].address).ownerOf(1)).to.equal(
      accs[1].address
    );
  });

  it("Tests for Deposit", async function () {
    const [deployer] = await ethers.getSigners();
    const accs = await ethers.getSigners();

    await BridgeContract.createResourceIdForToken(resourceID, "name", "symbol");
    const relayer = await BridgeContract.RELAYER_ROLE();
    await BridgeContract.grantRole(relayer, deployer.address);
    const tokenAddress = await BridgeContract._resourceIDToTokenContractAddress(
      resourceID
    );
    await BridgeContract.setResourceIdForToken(
      resourceID,
      tokenAddress,
      true,
      true
    );
    const executeData = createERC721DepositProposalData(
      1,
      20,
      accs[1].address,
      32,
      0
    );
    TruffleAssert.passes(
      await BridgeContract.executeProposal(123, 12, resourceID, executeData)
    );

    const minter = await ethers.getContractAt(
      "ERC721MinterBurnerPauser",
      tokenAddress
    );
    expect(await minter.connect(accs[1].address).ownerOf(1)).to.equal(
      accs[1].address
    );

    await minter
      .connect(accs[1])
      .setApprovalForAll(BridgeContract.address, true);
    const depositData = createERCDepositData(1, 20, deployer.address);
    TruffleAssert.passes(
      await BridgeContract.deposit(123, resourceID, depositData)
    );

    await assertIsRejected(
      minter.connect(accs[1].address).ownerOf(1),
      /ERC721: owner query for nonexistent token/,
      "ERC721: owner query for nonexistent token"
    );
  });
});
