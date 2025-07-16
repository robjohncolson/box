# ADR-029: Block Structure for Emergent PoK

**Date:** 2025-01-27  
**Status:** Accepted  
**Context:** V2 Development Phase - Blockchain-Powered Student Experience  

## Context

Building on the foundational work of [ADR-001: Decentralized Genesis Architecture](./001-decentralized-genesis-architecture.md) and the batching economics established in [ADR-026: Granular Progress Transactions for PoK](./026-granular-progress-transactions-for-pok.md), we need to define a block structure that efficiently packages emergent attestations while maintaining cryptographic integrity and enabling QR code distribution.

The current block implementation lacks proper header/body separation, merkle root validation, and size constraints necessary for peer-to-peer distribution. Drawing from the batching economics in ADR-026, we recognize that optimal block sizes balance network efficiency with meaningful proof-of-knowledge validation.

This block structure must support the emergent consensus model where mining eligibility depends on quorum achievement and convergence scores exceeding 50%, creating a self-organizing knowledge validation system.

## Decision

We will implement a **Header-Body Block Structure** with the following components:

### Block Header Structure

```typescript
interface BlockHeader {
  previousHash: string;      // SHA-256 hash of previous block
  merkleRoot: string;        // Merkle root of all transactions and attestations
  timestamp: number;         // Unix timestamp of block creation
  blockHeight: number;       // Sequential block number
  nonce: number;             // Mining nonce for difficulty adjustment
}
```

### Block Body Structure

```typescript
interface BlockBody {
  transactions: CompletionTransaction[];    // Batched completion transactions
  attestations: AttestationTransaction[];   // Peer attestations for consensus
  quorumData: {
    requiredQuorum: number;                 // Minimum attestations needed
    achievedQuorum: number;                 // Actual attestations received
    convergenceScore: number;               // Percentage agreement (0-100)
  };
}
```

### Complete Block Structure

```typescript
interface Block {
  header: BlockHeader;
  body: BlockBody;
  signature: string;         // Block producer's signature
  producerPubKey: string;    // Public key of block producer
  blockId: string;           // SHA-256 hash of deterministic block serialization
}
```

## Mining Requirements

### Quorum-Based Mining Eligibility

Following the emergent consensus model from ADR-028:

1. **Minimum Quorum**: At least 3 peer attestations per question
2. **Convergence Threshold**: >50% agreement on answer distributions
3. **Mempool Threshold**: 50+ points accumulated in mempool (per ADR-027)
4. **Validation Chain**: All attestations must reference valid completion transactions

### Mining Process

```typescript
function mineBlock(mempool: Mempool, attestations: AttestationTransaction[]): Block | null {
  // 1. Validate mining eligibility
  if (!mempool.isMiningEligible()) return null;
  
  // 2. Calculate convergence scores
  const convergenceScores = calculateDistributionConvergence(attestations);
  if (convergenceScores.average < 50) return null;
  
  // 3. Create merkle root from transactions + attestations
  const merkleRoot = calculateMerkleRoot([...transactions, ...attestations]);
  
  // 4. Assemble block with size constraint
  const block = assembleBlock(header, body);
  if (getBlockSize(block) > 3072) return null; // 3KB limit
  
  return block;
}
```

## Size Constraints for QR Distribution

### 3KB Block Size Limit

- **QR Code Compatibility**: Maximum 3,072 bytes for reliable QR encoding
- **Network Efficiency**: Reduces P2P message overhead
- **Mobile Optimization**: Ensures fast transmission on mobile networks
- **Batch Economics**: Aligns with optimal transaction batching from ADR-026

### Size Optimization Strategies

1. **Compact Serialization**: Use deterministic JSON with minimal whitespace
2. **Signature Efficiency**: Single block signature covers entire merkle root
3. **Attestation Compression**: Reference transactions by hash rather than full data
4. **Timestamp Optimization**: Use relative timestamps within block timeframe

## Merkle Tree Implementation

### Merkle Root Calculation

Following the cryptographic foundation from ADR-001:

```typescript
function calculateMerkleRoot(items: (Transaction | Attestation)[]): string {
  if (items.length === 0) return EMPTY_MERKLE_ROOT;
  
  // Create leaf hashes
  const leaves = items.map(item => sha256(deterministicStringify(item)));
  
  // Build merkle tree bottom-up
  return buildMerkleTree(leaves);
}
```

### Merkle Proof Verification

```typescript
function verifyMerkleProof(
  item: Transaction | Attestation,
  proof: string[],
  merkleRoot: string
): boolean {
  const itemHash = sha256(deterministicStringify(item));
  const computedRoot = computeMerkleRoot(itemHash, proof);
  return computedRoot === merkleRoot;
}
```

## Integration with Existing Systems

### Mempool Integration

- **Batch Preparation**: Pull transactions from mempool when mining threshold met
- **Attestation Validation**: Verify attestations reference valid mempool transactions
- **Points Calculation**: Maintain existing point system from ADR-026

### P2P Network Integration

- **Block Propagation**: Broadcast blocks as compact JSON strings
- **Verification Protocol**: Peers verify merkle proofs before accepting blocks
- **Chain Synchronization**: Use block hashes for efficient sync (per ADR-011)

## Technical Specifications

### Block Validation Rules

1. **Header Validation**:
   - Previous hash must reference valid block or genesis
   - Merkle root must match calculated root of body contents
   - Timestamp must be within reasonable bounds
   - Block height must be sequential

2. **Body Validation**:
   - All transactions must be valid completion transactions
   - All attestations must reference valid questions
   - Quorum requirements must be met
   - Convergence score must exceed 50%

3. **Size Validation**:
   - Serialized block must not exceed 3,072 bytes
   - Must contain at least 1 transaction or attestation
   - Maximum 50 transactions per block (batching economics)

### Mining Difficulty Adjustment

```typescript
interface MiningDifficulty {
  targetBlockTime: number;    // 10 minutes target
  difficultyAdjustment: number; // Every 10 blocks
  minQuorumSize: number;      // Minimum 3 attestations
  convergenceThreshold: number; // 50% agreement required
}
```

## Implementation Strategy

### Phase 1: Core Block Structure
- Implement Block, BlockHeader, and BlockBody interfaces
- Add merkle root calculation and verification
- Implement deterministic serialization

### Phase 2: Mining Function
- Create mineBlock function with quorum validation
- Integrate with existing mempool system
- Add size constraint enforcement

### Phase 3: Network Integration
- Update P2P protocol for new block format
- Implement block verification in chain synchronization
- Add QR code generation for block distribution

## Consequences

### Benefits

1. **Cryptographic Integrity**: Merkle roots ensure tamper-proof block contents
2. **Efficient Distribution**: 3KB limit enables QR code and mobile distribution
3. **Emergent Consensus**: Mining depends on peer agreement, not authority
4. **Network Optimization**: Batching reduces P2P overhead significantly
5. **Scalable Validation**: Merkle proofs enable efficient verification

### Trade-offs

1. **Increased Complexity**: Header/body separation adds implementation complexity
2. **Size Constraints**: 3KB limit may restrict transaction batch sizes
3. **Quorum Dependencies**: Mining depends on peer participation
4. **Merkle Overhead**: Tree calculation adds computational cost

### Migration Impact

- Existing block tests will need updates for new structure
- Chain synchronization protocol requires merkle proof integration
- UI components need updates for header/body display

## References

- [ADR-001: Decentralized Genesis Architecture](./001-decentralized-genesis-architecture.md) - Merkle tree foundation
- [ADR-026: Granular Progress Transactions for PoK](./026-granular-progress-transactions-for-pok.md) - Batching economics
- [ADR-027: Mempool for Granular Progress and Mining Threshold](./027-mempool-for-granular-progress-and-mining-threshold.md) - Mining eligibility
- [ADR-028: Emergent Attestation with Optional Reveals](./028-emergent-attestation-with-optional-reveals.md) - Consensus model 