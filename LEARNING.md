# ZK Voting — implementation notes

This challenge implements private voting with a Semaphore-style identity commitment and a Noir UltraHonk proof. A voter creates two private field elements, `nullifier` and `secret`, and publishes only the Poseidon commitment:

```text
commitment = Poseidon2(nullifier, secret)
```

The Solidity contract inserts each registered commitment into a Lean incremental Merkle tree. Registration is restricted to addresses allowlisted by the owner, an address can register once, and a commitment cannot be reused.

The Noir circuit proves all of the following without revealing the private identity values:

- the commitment is derived from the private nullifier and secret;
- that commitment is a member of the current onchain Merkle root;
- the public nullifier hash is derived from the private nullifier;
- the chosen vote is bound to the proof.

The verifier receives public inputs in this order:

```text
[nullifier_hash, merkle_root, vote, tree_depth]
```

`Voting.vote` rejects an unknown root, a reused nullifier hash, and an invalid proof before updating the yes/no totals. Any relayer can submit the proof, so the Ethereum address paying for the transaction does not need to be the address that registered the commitment. The Sepolia UI uses a Pimlico-sponsored Safe smart account for that relay.

The privacy guarantee still depends on operational choices. A small allowlist provides a small anonymity set, requiring the latest root can make older proofs stale after another registration, and ordinary anonymous voting does not provide MACI-style resistance to bribery or coercion.

## Toolchain

- Nargo `1.0.0-beta.3`
- Barretenberg `0.82.2` for circuit artifacts and the Solidity verifier
- `@noir-lang/noir_js` `1.0.0-beta.3`
- `@aztec/bb.js` `0.82.0`
- `@zk-kit/lean-imt.sol` `2.x`

## Validation

- Nargo circuit formatting and compilation
- generated keccak-compatible UltraHonk verification key and Solidity verifier
- 11 official Hardhat challenge tests
- a real end-to-end UltraHonk proof generated from the compiled circuit and accepted by the deployed local Solidity verifier
- frontend TypeScript check, lint, and Next.js production build
