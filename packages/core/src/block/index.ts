import * as secp256k1 from '@noble/secp256k1';
import { hash256 } from '../crypto/hashing.js';
import { Mempool } from '../mempool.js';
import type { 
  PrivateKey, 
  Block, 
  BlockHeader, 
  BlockBody, 
  CompletionTransaction, 
  AttestationTransaction
} from '../types/index.js';

// Re-export types for convenience
export type { Block, BlockHeader, BlockBody } from '../types/index.js';

// Empty merkle root constant
const EMPTY_MERKLE_ROOT = '0'.repeat(64);

// Maximum block size in bytes (3KB)
const MAX_BLOCK_SIZE = 3072;

// Minimum quorum requirements
const MIN_QUORUM_SIZE = 3;
const MIN_CONVERGENCE_SCORE = 50;

/**
 * Create deterministic JSON string with sorted keys
 */
function deterministicStringify(obj: any): string {
  if (obj === null || obj === undefined) {
    return JSON.stringify(obj);
  }
  
  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  
  if (Array.isArray(obj)) {
    return '[' + obj.map(item => deterministicStringify(item)).join(',') + ']';
  }
  
  // For objects, sort keys and recursively stringify
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(key => `"${key}":${deterministicStringify(obj[key])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * Calculate merkle root from array of transactions and attestations
 */
export function calculateMerkleRoot(items: (CompletionTransaction | AttestationTransaction)[]): string {
  if (items.length === 0) {
    return EMPTY_MERKLE_ROOT;
  }
  
  // Create leaf hashes
  let hashes = items.map(item => {
    const itemString = deterministicStringify(item);
    const itemBytes = new TextEncoder().encode(itemString);
    return secp256k1.etc.bytesToHex(hash256(itemBytes));
  });
  
  // Build merkle tree bottom-up
  while (hashes.length > 1) {
    const nextLevel: string[] = [];
    
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = i + 1 < hashes.length ? hashes[i + 1] : left;
      
      // Combine and hash
      const combined = left + right;
      const combinedBytes = new TextEncoder().encode(combined);
      const combinedHash = secp256k1.etc.bytesToHex(hash256(combinedBytes));
      
      nextLevel.push(combinedHash);
    }
    
    hashes = nextLevel;
  }
  
  return hashes[0];
}

/**
 * Calculate convergence score for attestations
 */
function calculateConvergenceScore(attestations: AttestationTransaction[]): number {
  if (attestations.length === 0) return 0;
  
  // Group attestations by answer
  const answerCounts = new Map<string, number>();
  
  attestations.forEach(attestation => {
    const answer = attestation.answerHash || attestation.answerText || '';
    answerCounts.set(answer, (answerCounts.get(answer) || 0) + 1);
  });
  
  // Find the most common answer
  let maxCount = 0;
  for (const count of answerCounts.values()) {
    maxCount = Math.max(maxCount, count);
  }
  
  // Calculate convergence as percentage of most common answer
  return Math.round((maxCount / attestations.length) * 100);
}

/**
 * Calculate block size in bytes
 */
export function getBlockSize(block: Block): number {
  const blockString = deterministicStringify(block);
  return new TextEncoder().encode(blockString).length;
}

/**
 * Create a new block with header and body structure
 */
export function createBlock({
  privateKey,
  previousHash,
  transactions,
  attestations,
  blockHeight,
  nonce = 0
}: {
  privateKey: PrivateKey;
  previousHash: string;
  transactions: CompletionTransaction[];
  attestations: AttestationTransaction[];
  blockHeight: number;
  nonce?: number;
}): Block {
  // Derive public key
  const publicKey = secp256k1.getPublicKey(privateKey.bytes);
  const publicKeyHex = secp256k1.etc.bytesToHex(publicKey);
  
  // Calculate merkle root
  const merkleRoot = calculateMerkleRoot([...transactions, ...attestations]);
  
  // Calculate convergence score
  const convergenceScore = calculateConvergenceScore(attestations);
  
  // Create header
  const header: BlockHeader = {
    previousHash,
    merkleRoot,
    timestamp: Date.now(),
    blockHeight,
    nonce
  };
  
  // Create body with quorum data
  const body: BlockBody = {
    transactions,
    attestations,
    quorumData: {
      requiredQuorum: MIN_QUORUM_SIZE,
      achievedQuorum: attestations.length,
      convergenceScore
    }
  };
  
  // Create block data for signing
  const blockData = {
    header,
    body
  };
  
  const signingString = deterministicStringify(blockData);
  const signingBytes = new TextEncoder().encode(signingString);
  const hash = hash256(signingBytes);
  
  // Sign the block
  const signature = secp256k1.sign(hash, privateKey.bytes);
  
  // Create block ID
  const blockId = secp256k1.etc.bytesToHex(hash);
  
  return {
    header,
    body,
    signature: signature.toCompactHex(),
    producerPubKey: publicKeyHex,
    blockId
  };
}

/**
 * Mine a new block from mempool and attestations
 */
export function mineBlock(
  mempool: Mempool,
  attestations: AttestationTransaction[],
  previousHash: string,
  blockHeight: number
): Block | null {
  // Check mining eligibility
  if (!mempool.isMiningEligible()) {
    return null;
  }
  
  // Check quorum requirements
  if (attestations.length < MIN_QUORUM_SIZE) {
    return null;
  }
  
  // Check convergence score
  const convergenceScore = calculateConvergenceScore(attestations);
  if (convergenceScore < MIN_CONVERGENCE_SCORE) {
    return null;
  }
  
  // Get transactions from mempool
  const batch = mempool.prepareBatch();
  if (!batch) {
    return null;
  }
  
  const transactions = batch.transactions;
  
  // Create a temporary private key for mining
  // In production, this would be the user's actual private key
  const tempKeyPair = secp256k1.utils.randomPrivateKey();
  const privateKey = { bytes: tempKeyPair, hex: secp256k1.etc.bytesToHex(tempKeyPair) };
  
  // Create the block
  const block = createBlock({
    privateKey,
    previousHash,
    transactions: [...transactions],
    attestations,
    blockHeight
  });
  
  // Check size constraint
  if (getBlockSize(block) > MAX_BLOCK_SIZE) {
    return null;
  }
  
  return block;
}

/**
 * Verify a block's integrity and validity
 */
export function verifyBlock(block: Block): boolean {
  try {
    const { header, body, signature, producerPubKey, blockId } = block;
    
    // Verify header structure
    if (!header.previousHash || !header.merkleRoot || !header.timestamp || 
        typeof header.blockHeight !== 'number' || typeof header.nonce !== 'number') {
      return false;
    }
    
    // Verify body structure
    if (!body.transactions || !body.attestations || !body.quorumData) {
      return false;
    }
    
    if (body.transactions.length > 0) {
      // Verify quorum requirements
      if (body.quorumData.achievedQuorum < MIN_QUORUM_SIZE) {
        return false;
      }
      
      // Verify convergence score
      if (body.quorumData.convergenceScore < MIN_CONVERGENCE_SCORE) {
        return false;
      }
    }
    
    // Verify merkle root
    const expectedMerkleRoot = calculateMerkleRoot([...body.transactions, ...body.attestations]);
    if (header.merkleRoot !== expectedMerkleRoot) {
      return false;
    }
    
    // Verify block size
    if (getBlockSize(block) > MAX_BLOCK_SIZE) {
      return false;
    }
    
    // Verify block signature
    const blockData = { header, body };
    const signingString = deterministicStringify(blockData);
    const signingBytes = new TextEncoder().encode(signingString);
    const hash = hash256(signingBytes);
    
    // Verify block ID matches hash
    const expectedBlockId = secp256k1.etc.bytesToHex(hash);
    if (blockId !== expectedBlockId) {
      return false;
    }
    
    // Verify signature
    const sig = secp256k1.Signature.fromCompact(signature);
    const pubKeyBytes = secp256k1.etc.hexToBytes(producerPubKey);
    
    return secp256k1.verify(sig, hash, pubKeyBytes);
  } catch (error) {
    return false;
  }
}

/**
 * Local chain array for block storage
 */
export class LocalChain {
  private blocks: Block[] = [];
  
  constructor() {
    // Initialize with genesis block if needed
  }
  
  /**
   * Add a block to the chain
   */
  addBlock(block: Block): boolean {
    // Verify block before adding
    if (!verifyBlock(block)) {
      return false;
    }
    
    // Verify block height is sequential
    if (this.blocks.length > 0) {
      const lastBlock = this.blocks[this.blocks.length - 1];
      if (block.header.blockHeight !== lastBlock.header.blockHeight + 1) {
        return false;
      }
      
      // Verify previous hash
      if (block.header.previousHash !== lastBlock.blockId) {
        return false;
      }
    }
    
    this.blocks.push(block);
    return true;
  }
  
  /**
   * Get all blocks in the chain
   */
  getBlocks(): Block[] {
    return [...this.blocks];
  }
  
  /**
   * Get the latest block
   */
  getLatestBlock(): Block | null {
    return this.blocks.length > 0 ? this.blocks[this.blocks.length - 1] : null;
  }
  
  /**
   * Get block by ID
   */
  getBlockById(blockId: string): Block | null {
    return this.blocks.find(block => block.blockId === blockId) || null;
  }
  
  /**
   * Get chain length
   */
  getLength(): number {
    return this.blocks.length;
  }
  
  /**
   * Clear the chain
   */
  clear(): void {
    this.blocks = [];
  }
} 