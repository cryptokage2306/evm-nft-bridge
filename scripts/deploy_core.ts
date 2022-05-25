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
  // setup deployed to: 0xe8499fb1b006a7C712c6fC11B8Ba574Da50d9392
  // implementation deployed to: 0x9144aC93B45D57B668e081C0D5DABD68C0E82710
  // Init Data: 0x34a5fcd40000000000000000000000009144ac93b45d57b668e081c0d5dabd68c0e8271000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000010000000000000000000000007c610b4dda11820b749aea40df8cbfda1925e581
  // core deployed to: 0x9EC5D189FEc51FCb14EB8dFEd2f50FF21403D0c7

//   polygon
//   setup deployed to: 0x3CbE7cdD53393c7031D29C107C46635E1fd5B054
// implementation deployed to: 0xDF0E43A8763343a4E376A6bEA77492c93c021217
// Init Data: 0x34a5fcd4000000000000000000000000df0e43a8763343a4e376a6bea77492c93c02121700000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000010000000000000000000000007c610b4dda11820b749aea40df8cbfda1925e581
// core deployed to: 0x9309E15276172eEC81b6b5396251BF131b55D788
  }
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
  
