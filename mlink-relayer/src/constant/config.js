require("dotenv").config();
const SRC_BRIDGE_CONTRACT_ADDRESSS = process.env.SRC_BRIDGE_CONTRACT_ADDRESSS;
const DEST_BRIDGE_CONTRACT_ADDRESSS = process.env.DEST_BRIDGE_CONTRACT_ADDRESSS;
const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "";
const SRC_RPC_URL = process.env.SRC_RPC_URL;
const DEST_RPC_URL = process.env.DEST_RPC_URL;
const START_BLOCK = process.env.START_BLOCK;
module.exports = {
  SRC_BRIDGE_CONTRACT_ADDRESSS,
  DEST_BRIDGE_CONTRACT_ADDRESSS,
  PRIVATE_KEY,
  SRC_RPC_URL,
  DEST_RPC_URL,
  START_BLOCK,
};