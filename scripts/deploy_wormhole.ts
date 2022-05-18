import { artifacts, web3, } from "hardhat";

require('dotenv').config({ path: "../.env" });

const Setup2 = artifacts.require("Setup");
const Implementation = artifacts.require("Implementation");
const Wormhole = artifacts.require("Wormhole");

// CONFIG
const initialSigners = ["0x0000000000000000000000000000000000000000"];
const chainId = process.env.INIT_CHAIN_ID;
const governanceChainId = process.env.INIT_GOV_CHAIN_ID;
const governanceContract = process.env.INIT_GOV_CONTRACT; // bytes32
import { ethers } from "hardhat";


async function main() {
    
  const Setup = await ethers.getContractFactory("Setup");
  const setup = await Setup.deploy();

  await setup.deployed();
  console.log("setup deployed to:", setup.address);

  const Implementation = await ethers.getContractFactory("Implementation");
  const implementation = await Implementation.deploy();

  await implementation.deployed();
  console.log("implementation deployed to:", implementation.address);

  const setup1 = new web3.eth.Contract(Setup2.abi, setup.address);
    const initData = setup1.methods.setup(
        implementation.address,
        initialSigners,
        chainId,
        governanceChainId,
        governanceContract
    ).encodeABI();
    console.log("Init Data:", initData);


  const Wormhole = await ethers.getContractFactory("Wormhole");
  const wormhole = await Wormhole.deploy(setup.address, initData);

  await wormhole.deployed();
  console.log("wormhole deployed to:", wormhole.address);
  // setup deployed to: 0xB3Ff35B137dd9A79Bb519f0EA03ce2d416Db2d3f
  // implementation deployed to: 0xa6b948c043834a5aA2b5E31295330131A4af0a1A
  // Init Data: 0x34a5fcd4000000000000000000000000a6b948c043834a5aa2b5e31295330131a4af0a1a00000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000
  // wormhole deployed to: 0x15A7106be76Aab3e1A191E8d1fF98955e56df5df
  }
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
  
