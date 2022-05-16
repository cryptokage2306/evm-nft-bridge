// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import { createERCDepositData, createERC721DepositProposalData } from "../test/helper"

async function main() {
    const Bridge = await ethers.getContractFactory("Bridge");
    const BridgeContract = await Bridge.attach("0xB37c64b5afD082305202A6dCe3e4cE4E96357373")

    const testContract = await ethers.getContractFactory("TestERC721");

    const TestContract = await testContract.attach("0x020D5356370E12C7E2D4Bd974aFEBe6F0afe3fCb")

    const resourceID = "0x9b05a194b2aafc404907ab4a20261a2e917ea70a5c9f44057f5b5e0ed2b4da5b"
      

    const [deployer] = await ethers.getSigners()
    const relayer = await BridgeContract.RELAYER_ROLE()

    await BridgeContract.grantRole(relayer, deployer.address);

    await BridgeContract.setResourceIdForToken(resourceID, TestContract.address, true, false)

    await TestContract.mint(deployer.address,2)
    await TestContract.setApprovalForAll(BridgeContract.address,true)
    const depositData = createERCDepositData(2, 20, deployer.address)
    console.log(await TestContract.ownerOf(2))

    const abc = await BridgeContract.deposit(123, resourceID, depositData)

    const abbb = await BridgeContract.parseTransfer(abc.data)

    console.log(await TestContract.ownerOf(2), abbb)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});