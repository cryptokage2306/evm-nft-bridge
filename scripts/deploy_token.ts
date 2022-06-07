import { ethers } from "hardhat";

async function main() {
  const testContract = await ethers.getContractFactory("TestERC721");
    const TestContract1 = await testContract.deploy("name","symbol");

    await TestContract1.deployed();

  console.log("Token deployed to:", TestContract1.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
