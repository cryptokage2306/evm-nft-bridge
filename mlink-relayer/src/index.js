const { ethers } = require("ethers");
const cron = require("node-cron");
const {
  SRC_BRIDGE_CONTRACT_ADDRESSS,
  DEST_BRIDGE_CONTRACT_ADDRESSS,
  PRIVATE_KEY,
  SRC_RPC_URL,
  DEST_RPC_URL,
  START_BLOCK,
} = require("./constant/config");



const { abi: ProposalAbi } = require("./abi/ExecuteProposalAbi.json");
const { abi: DepositEventAbi } = require("./abi/DepositEventAbi.json");
const { createERC721DepositProposalData } = require("./utils");
let latestblock = START_BLOCK;
let PreviousTokenID;
const srcJsonProvider = new ethers.providers.JsonRpcProvider(SRC_RPC_URL);
const destJsonProvider = new ethers.providers.JsonRpcProvider(DEST_RPC_URL);
const srcWallet = new ethers.Wallet(PRIVATE_KEY, srcJsonProvider);
const destWallet = new ethers.Wallet(PRIVATE_KEY, destJsonProvider);

async function eventFilterv4(provider) {
  console.log(await srcJsonProvider.getBlockNumber());
  const iface = new ethers.utils.Interface(DepositEventAbi);
  const logs = await srcJsonProvider.getLogs({
    fromBlock: latestblock,
    toBlock: "latest",
    address: SRC_BRIDGE_CONTRACT_ADDRESSS,
    topics: [
      "0x9e21e30f4e16d98ddec37604ea18af344492966515eb131134df0349dc67cc3f",
    ],
  });

  if (!logs || !logs[0]) {
    return;
  }
  latestblock = await srcJsonProvider.getBlockNumber();
  const decodeLogData = iface.parseLog(logs[0]);
  if (!decodeLogData && !decodeLogData.args) return;
  // console.log(decodeLogData)
  const { destinationDomainID, resourceID, depositNonce, data, user, uri } =
    decodeLogData.args;

  const abiCoder = ethers.utils.defaultAbiCoder;
  const tokenID = parseInt(abiCoder.decode(["uint256"], data).toString());

  if (tokenID == PreviousTokenID) {
    return;
  }
  PreviousTokenID = tokenID;

  const proposalData = createERC721DepositProposalData(
    tokenID,
    20,
    user,
    32,
    0
  );

  const ConvertedDepositNonce = parseInt(depositNonce.toString());
  console.log(destinationDomainID,ConvertedDepositNonce,resourceID,proposalData);

  const DestBridge = new ethers.Contract(
    DEST_BRIDGE_CONTRACT_ADDRESSS,
    ProposalAbi,
    destWallet
  );

  const tx = await DestBridge.executeProposal(
    destinationDomainID,
    ConvertedDepositNonce,
    resourceID,
    pp,
    {
      gasLimit: 100000,
    }
  );
  console.log(tx)
  console.log(tx.wait());
}

cron.schedule("2 * * * * *", () => {
  eventFilterv4();
});
