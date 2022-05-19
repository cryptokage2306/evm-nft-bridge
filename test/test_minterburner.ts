// import { assert, expect } from "chai";
// import { ethers, upgrades } from "hardhat";
// const TruffleAssert = require("truffle-assertions");
// import { assertIsRejected } from "./aux";

// describe("Tests for ERC721MinterBurnerPauser", function () {
//   const initialize = async () => {
//     const MinterBurnerPauser = await ethers.getContractFactory(
//       "ERC721MinterBurnerPauser"
//     );
//     const minterburner = await upgrades.deployProxy(
//       MinterBurnerPauser,
//       ["TestMerry", "strawhat"],
//       {
//         kind: "transparent",
//       }
//     );
//     await minterburner.deployed();

//     return {
//       minterburner,
//     };
//   };

//   it("Contract Should Initialize Properly", async function () {
//     const { minterburner } = await initialize();
//     expect(await minterburner.name()).to.equal("TestMerry");
//     expect(await minterburner.symbol()).to.equal("strawhat");
//   });

//   it("Happy flow of Mint Function", async function () {
//     const { minterburner } = await initialize();
//     const accs = await ethers.getSigners();
//     const tokenID = 69420;
//     const data = "TestString";
//     TruffleAssert.passes(
//       await minterburner.mint(accs[1].address, tokenID, data)
//     );
//     expect(await minterburner.ownerOf(tokenID)).to.equal(accs[1].address);
//   });

//   it("Check for Minter role error", async function () {
//     const { minterburner } = await initialize();
//     const accs = await ethers.getSigners();
//     const tokenID = 69420;
//     const data = "TestString";
//     await assertIsRejected(
//       minterburner.connect(accs[5]).mint(accs[2].address, tokenID, data),
//       /must have minter role to mint/,
//       "must have minter role to mint"
//     );
//   });

//   it("Test for TokenURI", async function () {
//     const { minterburner } = await initialize();
//     const accs = await ethers.getSigners();
//     const tokenID = 69420;
//     const data = "TestString";
//     TruffleAssert.passes(
//       await minterburner.mint(accs[1].address, tokenID, data)
//     );
//     expect(await minterburner.tokenURI(tokenID)).to.equal("TestString");
//   });

//   it("Contract should not be paused", async () => {
//     const { minterburner } = await initialize();
//     assert.isFalse(await minterburner.paused());
//   });

//   it("Contract should be paused", async () => {
//     const { minterburner } = await initialize();
//     TruffleAssert.passes(await minterburner.pause());
//     assert.isTrue(await minterburner.paused());
//   });

//   it("Check for Pauser role error during Pause", async () => {
//     const accs = await ethers.getSigners();
//     const { minterburner } = await initialize();
//     await assertIsRejected(
//       minterburner.connect(accs[4]).pause(),
//       /must have pauser role to pause/,
//       "must have pauser role to pause"
//     );
//   });

//   it("Check for Pauser role error during Unpause", async () => {
//     const accs = await ethers.getSigners();
//     const { minterburner } = await initialize();
//     await assertIsRejected(
//       minterburner.connect(accs[4]).unpause(),
//       /must have pauser role to unpause/,
//       "must have pauser role to unpause"
//     );
//   });

//   it("Contract should not be pause after being unpaused", async () => {
//     const { minterburner } = await initialize();
//     TruffleAssert.passes(await minterburner.pause());
//     assert.isTrue(await minterburner.paused());
//     TruffleAssert.passes(await minterburner.unpause());
//     assert.isFalse(await minterburner.paused());
//   });
// });
