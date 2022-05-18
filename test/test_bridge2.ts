import { assert, expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { getImplementationAddress } from '@openzeppelin/upgrades-core';

import { createERCDepositData, createERC721DepositProposalData } from "./helper"
import { Bridge, Implementation, TestERC721 } from "../typechain";
const TruffleAssert = require("truffle-assertions");
const initialSigners = ["0x0000000000000000000000000000000000000000"];
const chainId = process.env.INIT_CHAIN_ID;
const governanceChainId = process.env.INIT_GOV_CHAIN_ID;
const governanceContract = process.env.INIT_GOV_CONTRACT;
import { artifacts, web3 } from "hardhat";

require('dotenv').config({ path: "../.env" });

const Setup2 = artifacts.require("Setup");



console.log(createERCDepositData(1, 20,"0x7c610B4dDA11820b749AeA40Df8cBfdA1925e581"))
describe("Bridge", function () {
    const resourceID = "0x9b05a194b2aafc404907ab4a20261a2e917ea70a5c9f44057f5b5e0ed2b4da5b";

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
        const currentImplAddress = await getImplementationAddress(ethers.provider, minterburner.address);
        return {
            currentImplAddress,
        };
    };
    let Implementation1: Implementation;;


    const deployWormhole = async () => {
        const Setup = await ethers.getContractFactory("Setup");
        const setup = await Setup.deploy();

        await setup.deployed();

        const Implementation = await ethers.getContractFactory("Implementation");
        const implementation = await Implementation.deploy();
        Implementation1 = implementation;
        await implementation.deployed();

        const setup1 = new web3.eth.Contract(Setup2.abi, setup.address);
        const initData = setup1.methods.setup(
            implementation.address,
            initialSigners,
            chainId,
            governanceChainId,
            governanceContract
        ).encodeABI();
        const Wormhole = await ethers.getContractFactory("Wormhole");
        const wormhole = await Wormhole.deploy(setup.address, initData);
      
        await wormhole.deployed();
        const wh = wormhole.address;
        return {
            wh
        }
    }

    let BridgeContract: Bridge;
    let TestContract: TestERC721;

    beforeEach(async function () {
        const [owner] = await ethers.getSigners();
        const {currentImplAddress} = await deployMinterBurner();
        const {wh} = await deployWormhole();
        const Bridge = await ethers.getContractFactory("Bridge");
        const bridge = await Bridge.deploy(currentImplAddress,wh);
        BridgeContract = await bridge.deployed();
        const TestERC721 = await ethers.getContractFactory("TestERC721");
        const testERC721 = await TestERC721.deploy();
        TestContract = await testERC721.deployed();
    });

    let event1;

    it("Tests for Deposit with external Contract", async function () {
        const [owner] = await ethers.getSigners();
        const relayer = await BridgeContract.RELAYER_ROLE();
        await BridgeContract.grantRole(relayer, owner.address);
        await BridgeContract.setResourceIdForToken(resourceID, TestContract.address, true, false);
        await TestContract.mint(owner.address,1)
        expect(await TestContract.ownerOf(1)).to.equal(owner.address)
        await TestContract.setApprovalForAll(BridgeContract.address,true)
        const depositData = createERCDepositData(1, 20, owner.address);
        let punit = await BridgeContract.deposit(123, resourceID, depositData);
        let abc = await punit.wait()
        event1 = abc.events?.pop()?.data
        expect(await TestContract.ownerOf(1)).to.equal(BridgeContract.address);
    });

    // it("Tests for Execute Proposal with external Contract", async function () {
    //     const [deployer] = await ethers.getSigners();
    //     const relayer = await BridgeContract.RELAYER_ROLE();
    //     await BridgeContract.grantRole(relayer, deployer.address);
    //     await BridgeContract.setResourceIdForToken(resourceID, TestContract.address, true, false);
    //     await TestContract.mint(deployer.address,1)
    //     expect(await TestContract.ownerOf(1)).to.equal(deployer.address)
    //     await TestContract.setApprovalForAll(BridgeContract.address,true)
    //     const depositData = createERCDepositData(1, 20, deployer.address);
    //     TruffleAssert.passes(await BridgeContract.deposit(123, resourceID, depositData));
    //     expect(await TestContract.ownerOf(1)).to.equal(BridgeContract.address)

    //     const executeData = createERC721DepositProposalData(1, 20, deployer.address, 32, 0);
    //     TruffleAssert.passes(await BridgeContract.executeProposal(123, 12, resourceID, executeData));
    //     expect(await TestContract.ownerOf(1)).to.equal(deployer.address)
    // });
});     