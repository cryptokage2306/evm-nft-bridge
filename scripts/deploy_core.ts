import { artifacts, web3, } from "hardhat";

require('dotenv').config({ path: "../.env" });

const Setup2 = artifacts.require("Setup");

// CONFIG
const initialSigners = [process.env.INIT_SIGNERS];
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


  const Core = await ethers.getContractFactory("Core");
  const core = await Core.deploy(setup.address, initData);

  await core.deployed();
  console.log("core deployed to:", core.address);
  }
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
  
