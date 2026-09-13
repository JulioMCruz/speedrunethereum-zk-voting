import { readFileSync } from "node:fs";
import { UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import { poseidon1, poseidon2 } from "poseidon-lite";
import { network } from "hardhat";

const { ethers } = await network.create();
const [owner, voter, relayer] = await ethers.getSigners();

const poseidon = await (await ethers.getContractFactory("PoseidonT3")).deploy();
await poseidon.waitForDeployment();

const leanIMT = await (
  await ethers.getContractFactory("LeanIMT", { libraries: { PoseidonT3: await poseidon.getAddress() } })
).deploy();
await leanIMT.waitForDeployment();

const verifier = await (await ethers.getContractFactory("HonkVerifier")).deploy();
await verifier.waitForDeployment();

const voting = await (
  await ethers.getContractFactory("Voting", { libraries: { LeanIMT: await leanIMT.getAddress() } })
).deploy(owner.address, await verifier.getAddress(), "Should we build privacy-preserving zk apps?");
await voting.waitForDeployment();

const nullifier = 123456789n;
const secret = 987654321n;
const commitment = poseidon2([nullifier, secret]);
await voting.addVoters([voter.address], [true]);
await voting.connect(voter).register(commitment);

const votingData = await voting.getVotingData();
const root = votingData[6];
const depth = votingData[5];
const circuit = JSON.parse(readFileSync(new URL("../../circuits/target/circuits.json", import.meta.url), "utf8"));
const noir = new Noir(circuit);
const { witness } = await noir.execute({
  nullifier_hash: poseidon1([nullifier]).toString(),
  nullifier: nullifier.toString(),
  secret: secret.toString(),
  root: root.toString(),
  vote: true,
  depth: depth.toString(),
  index: "0",
  siblings: Array(16).fill("0"),
});

const backend = new UltraHonkBackend(circuit.bytecode, { threads: 1 });
const { proof, publicInputs } = await backend.generateProof(witness, { keccak: true });
await voting.connect(relayer).vote(ethers.hexlify(proof), ...publicInputs);

const result = await voting.getVotingData();
if (result[2] !== 1n || result[3] !== 0n) throw new Error("Real ZK vote was not counted");
console.log(`Real UltraHonk proof verified; yesVotes=${result[2]}, proofBytes=${proof.length}`);
await backend.destroy();
