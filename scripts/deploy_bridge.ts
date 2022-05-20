import { ethers,upgrades } from "hardhat";
import { getImplementationAddress } from '@openzeppelin/upgrades-core';

async function main() {
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
console.log(currentImplAddress);
const Bridge = await ethers.getContractFactory("Bridge");
const bridge = await Bridge.deploy(currentImplAddress,"0x9309E15276172eEC81b6b5396251BF131b55D788");

await bridge.deployed();

console.log("Bridge deployed to:", bridge.address);

// 0x494E2a46413B921fe9feb6C6a4dA41490b53D401
// Bridge deployed to: 0xb022b19237C2CA246547652ea830023c1Fde838A
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});