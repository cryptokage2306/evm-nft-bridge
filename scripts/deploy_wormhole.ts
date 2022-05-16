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
    console.log("implementation deployed to:", initData);


  const Wormhole = await ethers.getContractFactory("Wormhole");
  const wormhole = await Wormhole.deploy(setup.address, initData);

  await wormhole.deployed();
  console.log("wormhole deployed to:", wormhole.address);
    // deploy implementation
    // const b =await deployer.deploy(Implementation);
    // console.log(b.address, b);
    // // encode initialisation data
    // const setup = new web3.eth.Contract(Setup.abi, Setup.address);
    // const initData = setup.methods.setup(
    //     Implementation.address,
    //     initialSigners,
    //     chainId,
    //     governanceChainId,
    //     governanceContract
    // ).encodeABI();

    // // deploy proxy
    // const abc = await deployer.deploy(Wormhole, Setup.address, initData);
    // console.log(abc.address, abc);
  }
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
  
