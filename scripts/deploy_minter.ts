import { ethers, upgrades } from "hardhat";
async function main() {

  const [owner] = await ethers.getSigners();

  const MinterBurnerPauser = await ethers.getContractFactory(
    "ERC721MinterBurnerPauser"
  );
  const minterburner = await upgrades.deployProxy(
    MinterBurnerPauser,
    ["TestMerry", "strawhat"],
    {
      kind: "transparent",
    }
  );
  await minterburner.deployed();
  console.log("MinterBurnerPauser deployed to:", minterburner.address);
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
