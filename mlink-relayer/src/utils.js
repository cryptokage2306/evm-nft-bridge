const { ethers } = require("ethers");


const createERC721DepositProposalData = (
  tokenAmountOrID, lenRecipientAddress,
  recipientAddress, lenMetaData, metaData) => {
  return '0x' +
      toHex(tokenAmountOrID, 32).substr(2) +     // Token amount or ID to deposit (32 bytes)
      toHex(lenRecipientAddress, 32).substr(2) + // len(recipientAddress)          (32 bytes)
      recipientAddress.substr(2) +               // recipientAddress               (?? bytes)
      toHex(lenMetaData, 32).substr(2) +
      toHex(metaData, lenMetaData).substr(2)
};

const toHex = (covertThis, padding) => {
  return ethers.utils.hexZeroPad(ethers.utils.hexlify(covertThis), padding);
};

module.exports = {
  createERC721DepositProposalData,
};
