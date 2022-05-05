import { ethers, web3 } from "hardhat";
const { abi: logMessageAbi } = require("./logMessageAbi.json");
const elliptic = require("elliptic");
const testSigner1PK = process.env.PRIVATE_KEY;

async function main() {
  const Bridge = await ethers.getContractFactory("Bridge");
  const BridgeContract = await Bridge.attach(
    "0x5417375DF98a7Fa33ad5cD91c28f0BC65544F733"
  );

  const srcJsonProvider = new ethers.providers.JsonRpcProvider(
    "https://data-seed-prebsc-1-s1.binance.org:8545/"
  );

  const logs = await srcJsonProvider.getLogs({
    fromBlock: 19465410,
    toBlock: "latest",
    address: "0x9EC5D189FEc51FCb14EB8dFEd2f50FF21403D0c7",
    topics: [
      "0x3ee3a07ad0c8c880aa8d4ec4e37327ed749337e45490108c1a643a4d6635a5fd",
    ],
  });

  const iface = new ethers.utils.Interface(logMessageAbi);
  const decodeLogData = iface.parseLog(logs[0]);
  const { sender, sequence, nonce, payload, consistencyLevel } =
    decodeLogData.args;
  console.log(decodeLogData);

  let encodedVM = await signAndEncodeVM(
    0,
    nonce.toNumber(),
    121,
    "0x0000000000000000000000000000000000000000",
    sequence.toNumber(),
    payload,
    [testSigner1PK],
    consistencyLevel
  );
  console.log(encodedVM);

  await BridgeContract.createResourceIdForToken(
    "0x9b05a194b2aafc404907ab4a20261a2e917ea70a5c9f44057f5b5e0ed2b4da5b",
    "testss",
    "fdfdfdfd"
  );
  await BridgeContract.executeProposal("0x" + encodedVM);
}
const signAndEncodeVM = async function (
  timestamp: any,
  nonce: any,
  emitterChainId: any,
  emitterAddress: any,
  sequence: any,
  data: string,
  signers: any[],
  // guardianSetIndex: any,
  consistencyLevel: any
) {
  const body = [
    web3.eth.abi.encodeParameter("uint32", timestamp).substring(2 + (64 - 8)),
    web3.eth.abi.encodeParameter("uint64", nonce).substring(2 + (64 - 8)),
    web3.eth.abi
      .encodeParameter("uint16", emitterChainId)
      .substring(2 + (64 - 4)),
    web3.eth.abi.encodeParameter("bytes32", emitterAddress).substring(2),
    web3.eth.abi.encodeParameter("uint64", sequence).substring(2 + (64 - 16)),
    web3.eth.abi
      .encodeParameter("uint8", consistencyLevel)
      .substring(2 + (64 - 2)),
    data.substr(2),
  ];
  const hash = web3.utils.soliditySha3("0x" + body.join(""));
  if (!hash) return;

  const hash2 = web3.utils.soliditySha3(hash);
  if (!hash2) return;
  let signatures = "";

  for (let i in signers) {
    const ec = new elliptic.ec("secp256k1");
    const key = ec.keyFromPrivate(signers[i]);
    const signature = key.sign(hash2.substring(2), { canonical: true });

    const packSig = [
      web3.eth.abi.encodeParameter("uint8", i).substring(2 + (64 - 2)),
      zeroPadBytes(signature.r.toString(16), 32),
      zeroPadBytes(signature.s.toString(16), 32),
      web3.eth.abi
        .encodeParameter("uint8", signature.recoveryParam)
        .substring(2 + (64 - 2)),
    ];

    signatures += packSig.join("");
  }

  const vm = [
    web3.eth.abi.encodeParameter("uint8", 1).substring(2 + (64 - 2)),
    web3.eth.abi
      .encodeParameter("uint8", signers.length)
      .substring(2 + (64 - 2)),
    signatures,
    body.join(""),
  ].join("");

  return vm;
};

function zeroPadBytes(value: string | any[], length: number) {
  while (value.length < 2 * length) {
    value = "0" + value;
  }
  return value;
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
