import {ethers} from 'ethers';
import { assert } from "chai";

export const createERC721DepositProposalData = (
    tokenAmountOrID: number, lenRecipientAddress: number,
    recipientAddress: string, lenMetaData: number, metaData: number) => {
    return '0x' +
        toHex(tokenAmountOrID, 32).substr(2) +     // Token amount or ID to deposit (32 bytes)
        toHex(lenRecipientAddress, 32).substr(2) + // len(recipientAddress)          (32 bytes)
        recipientAddress.substr(2) +               // recipientAddress               (?? bytes)
        toHex(lenMetaData, 32).substr(2) +
        toHex(metaData, lenMetaData).substr(2)
};

export const createERCDepositData = (tokenAmountOrID: number, lenRecipientAddress: number, recipientAddress: string) => {
    return '0x' +
        toHex(tokenAmountOrID, 32).substr(2) +      // Token amount or ID to deposit (32 bytes)
        toHex(lenRecipientAddress, 32).substr(2) + // len(recipientAddress)          (32 bytes)
        recipientAddress.substr(2);               // recipientAddress               (?? bytes)
};

const toHex = (covertThis: number | bigint | ethers.utils.BytesLike | ethers.utils.Hexable, padding: number) => {
    return ethers.utils.hexZeroPad(ethers.utils.hexlify(covertThis), padding);
};


export const assertIsRejected = (
    promise: Promise<any>,
    error_match: RegExp,
    message: string
  ) => {
    let passed = false;
    return promise
      .then(() => {
        passed = true;
        return assert.fail();
      })
      .catch((error) => {
        if (passed)
          return assert.fail(message || "Expected promise to be rejected");
        if (error_match) {
          if (typeof error_match === "string")
            return assert.equal(error_match, error.message, message);
          if (error_match instanceof RegExp)
            return (
              error.message.match(error_match) ||
              assert.fail(
                error.message,
                error_match.toString(),
                `'${
                  error.message
                }' does not match ${error_match.toString()}: ${message}`
              )
            );
          return assert.instanceOf(error, error_match, message);
        }
      });
  };
  