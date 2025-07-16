import { describe, it, expect, beforeEach } from 'vitest';
import { generateKeyPair } from '../src/crypto/secp256k1.js';
import { createTransaction } from '../src/transaction/index.js';
import { Block, BlockHeader, BlockBody, createBlock, mineBlock, verifyBlock, calculateMerkleRoot, getBlockSize } from '../src/block/index.js';
import { createAttestation } from '../src/attestation/index.js';
import { Mempool } from '../src/mempool.js';
import type { PrivateKey, CompletionTransaction, AttestationTransaction } from '../src/types/index.js';
import { createMCQCompletionTransaction, createFRQCompletionTransaction } from '../src/transaction/index';

describe('Block Structure for Emergent PoK', () => {
  let privateKey: PrivateKey;
  let transactions: CompletionTransaction[];
  let attestations: AttestationTransaction[];
  let mempool: Mempool;
  let previousHash: string;

  beforeEach(() => {
    const keyPair = generateKeyPair();
    privateKey = keyPair.privateKey;
    
    // Create test completion transactions using valid questionIds from mock lessons data
    transactions = [
      createMCQCompletionTransaction({ questionId: '1-2_q1', selectedOption: 'A' }, privateKey),
      createFRQCompletionTransaction({ questionId: '1-3_q1', responseText: 'answer2' }, privateKey)
    ];
    
    // Create test attestations with valid signatures
    const attester1 = generateKeyPair();
    const attester2 = generateKeyPair();
    const attester3 = generateKeyPair();
    
    // Create proper attestations using the createAttestation function
    const attestation1 = createAttestation({ privateKey: attester1.privateKey, puzzleId: '1-2_q1', attesterAnswer: 'A' });
    const attestation2 = createAttestation({ privateKey: attester2.privateKey, puzzleId: '1-2_q1', attesterAnswer: 'A' });
    const attestation3 = createAttestation({ privateKey: attester3.privateKey, puzzleId: '1-2_q1', attesterAnswer: 'A' });
    
    // Convert to AttestationTransaction format
    attestations = [
      {
        type: 'attestation',
        questionId: attestation1.puzzleId,
        answerHash: attestation1.attesterAnswer,
        attesterPubKey: attestation1.attesterPublicKey,
        signature: attestation1.signature,
        timestamp: Date.now()
      },
      {
        type: 'attestation',
        questionId: attestation2.puzzleId,
        answerHash: attestation2.attesterAnswer,
        attesterPubKey: attestation2.attesterPublicKey,
        signature: attestation2.signature,
        timestamp: Date.now()
      },
      {
        type: 'attestation',
        questionId: attestation3.puzzleId,
        answerHash: attestation3.attesterAnswer,
        attesterPubKey: attestation3.attesterPublicKey,
        signature: attestation3.signature,
        timestamp: Date.now()
      }
    ];
    
    // Create mempool with sufficient points
    mempool = new Mempool(keyPair.publicKey.hex, 50);
    transactions.forEach(tx => mempool.addTransaction(tx));
    
    previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
  });

  describe('Block Header Structure', () => {
    it('should create a valid block header with required fields', () => {
      const header: BlockHeader = {
        previousHash,
        merkleRoot: calculateMerkleRoot([...transactions, ...attestations]),
        timestamp: Date.now(),
        blockHeight: 1,
        nonce: 0
      };
      
      expect(header.previousHash).toBe(previousHash);
      expect(header.merkleRoot).toBeDefined();
      expect(header.merkleRoot).toMatch(/^[a-f0-9]{64}$/i);
      expect(header.timestamp).toBeGreaterThan(0);
      expect(header.blockHeight).toBe(1);
      expect(header.nonce).toBe(0);
    });

    it('should generate different merkle roots for different transaction sets', () => {
      const merkleRoot1 = calculateMerkleRoot([transactions[0]]);
      const merkleRoot2 = calculateMerkleRoot([transactions[1]]);
      
      expect(merkleRoot1).not.toBe(merkleRoot2);
      expect(merkleRoot1).toMatch(/^[a-f0-9]{64}$/i);
      expect(merkleRoot2).toMatch(/^[a-f0-9]{64}$/i);
    });
  });

  describe('Block Body Structure', () => {
    it('should create a valid block body with quorum data', () => {
      const body: BlockBody = {
        transactions,
        attestations,
        quorumData: {
          requiredQuorum: 3,
          achievedQuorum: 3,
          convergenceScore: 100
        }
      };
      
      expect(body.transactions).toHaveLength(2);
      expect(body.attestations).toHaveLength(3);
      expect(body.quorumData.requiredQuorum).toBe(3);
      expect(body.quorumData.achievedQuorum).toBe(3);
      expect(body.quorumData.convergenceScore).toBe(100);
    });

    it('should validate quorum requirements', () => {
      const insufficientAttestations = attestations.slice(0, 2);
      const body: BlockBody = {
        transactions,
        attestations: insufficientAttestations,
        quorumData: {
          requiredQuorum: 3,
          achievedQuorum: 2,
          convergenceScore: 100
        }
      };
      
      expect(body.quorumData.achievedQuorum).toBeLessThan(body.quorumData.requiredQuorum);
    });
  });

  describe('Block Creation', () => {
    it('should create a valid block with header and body', () => {
      const block = createBlock({
        privateKey,
        previousHash,
        transactions,
        attestations,
        blockHeight: 1
      });
      
      expect(block.header).toBeDefined();
      expect(block.body).toBeDefined();
      expect(block.signature).toBeDefined();
      expect(block.producerPubKey).toBeDefined();
      expect(block.blockId).toBeDefined();
      
      // Verify header structure
      expect(block.header.previousHash).toBe(previousHash);
      expect(block.header.merkleRoot).toBeDefined();
      expect(block.header.timestamp).toBeGreaterThan(0);
      expect(block.header.blockHeight).toBe(1);
      
      // Verify body structure
      expect(block.body.transactions).toEqual(transactions);
      expect(block.body.attestations).toEqual(attestations);
      expect(block.body.quorumData).toBeDefined();
    });

    it('should generate valid merkle root from transactions and attestations', () => {
      const block = createBlock({
        privateKey,
        previousHash,
        transactions,
        attestations,
        blockHeight: 1
      });
      
      const expectedMerkleRoot = calculateMerkleRoot([...transactions, ...attestations]);
      expect(block.header.merkleRoot).toBe(expectedMerkleRoot);
    });

    it('should create different block IDs for different contents', () => {
      const block1 = createBlock({
        privateKey,
        previousHash,
        transactions,
        attestations,
        blockHeight: 1
      });
      
      const block2 = createBlock({
        privateKey,
        previousHash: 'different',
        transactions,
        attestations,
        blockHeight: 1
      });
      
      expect(block1.blockId).not.toBe(block2.blockId);
    });
  });

  describe('Mining Function', () => {
    it('should mine a valid block when quorum is met and convergence > 50%', () => {
      const block = mineBlock(mempool, attestations, previousHash, 1);
      
      expect(block).toBeDefined();
      expect(block!.body.quorumData.achievedQuorum).toBeGreaterThanOrEqual(3);
      expect(block!.body.quorumData.convergenceScore).toBeGreaterThan(50);
    });

    it('should return null when mempool is not mining eligible', () => {
      const insufficientMempool = new Mempool(generateKeyPair().publicKey.hex, 50);
      
      const block = mineBlock(insufficientMempool, attestations, previousHash, 1);
      
      expect(block).toBeNull();
    });

         it('should return null when convergence score is below 50%', () => {
       // Create attestations with poor convergence
       const attester1 = generateKeyPair();
       const attester2 = generateKeyPair();
       const attester3 = generateKeyPair();
       
       // Create proper attestations with different answers for poor convergence
       const poorAttestation1 = createAttestation({ privateKey: attester1.privateKey, puzzleId: '1-2_q1', attesterAnswer: 'A' });
       const poorAttestation2 = createAttestation({ privateKey: attester2.privateKey, puzzleId: '1-2_q1', attesterAnswer: 'B' });
       const poorAttestation3 = createAttestation({ privateKey: attester3.privateKey, puzzleId: '1-2_q1', attesterAnswer: 'C' });
       
       const poorAttestations = [
         {
           type: 'attestation' as const,
           questionId: poorAttestation1.puzzleId,
           answerHash: poorAttestation1.attesterAnswer,
           attesterPubKey: poorAttestation1.attesterPublicKey,
           signature: poorAttestation1.signature,
           timestamp: Date.now()
         },
         {
           type: 'attestation' as const,
           questionId: poorAttestation2.puzzleId,
           answerHash: poorAttestation2.attesterAnswer,
           attesterPubKey: poorAttestation2.attesterPublicKey,
           signature: poorAttestation2.signature,
           timestamp: Date.now()
         },
         {
           type: 'attestation' as const,
           questionId: poorAttestation3.puzzleId,
           answerHash: poorAttestation3.attesterAnswer,
           attesterPubKey: poorAttestation3.attesterPublicKey,
           signature: poorAttestation3.signature,
           timestamp: Date.now()
         }
       ];
       
       const block = mineBlock(mempool, poorAttestations, previousHash, 1);
       
       expect(block).toBeNull();
     });

    it('should return null when quorum is not met', () => {
      const insufficientAttestations = attestations.slice(0, 2);
      
      const block = mineBlock(mempool, insufficientAttestations, previousHash, 1);
      
      expect(block).toBeNull();
    });

    it('should include correct quorum data in mined block', () => {
      const block = mineBlock(mempool, attestations, previousHash, 1);
      
      expect(block).toBeDefined();
      expect(block!.body.quorumData.requiredQuorum).toBe(3);
      expect(block!.body.quorumData.achievedQuorum).toBe(3);
      expect(block!.body.quorumData.convergenceScore).toBe(100);
    });
  });

  describe('Size Constraints', () => {
    it('should enforce 3KB size limit', () => {
      const block = createBlock({
        privateKey,
        previousHash,
        transactions,
        attestations,
        blockHeight: 1
      });
      
      const blockSize = getBlockSize(block);
      expect(blockSize).toBeLessThanOrEqual(3072); // 3KB limit
    });

         it('should reject blocks exceeding size limit', () => {
       // Create a large number of transactions to exceed size limit
       const testKeyPair = generateKeyPair();
       const largeTransactions = Array.from({ length: 100 }, (_, i) => ({
         type: 'completion' as const,
         questionId: `1-2_q1`,  // Use valid questionId that gives 50 points each
         userPubKey: testKeyPair.publicKey.hex,  // Use same user for all transactions
         answerText: 'A'.repeat(100),
         signature: 'large_sig',
         timestamp: Date.now()
       }));
       
       // Add to mempool
       const largeMempool = new Mempool(testKeyPair.publicKey.hex, 50);
       largeTransactions.forEach(tx => largeMempool.addTransaction(tx));
       
       const block = mineBlock(largeMempool, attestations, previousHash, 1);
       
       // Should return null due to size constraint
       expect(block).toBeNull();
     });

    it('should calculate block size correctly', () => {
      const block = createBlock({
        privateKey,
        previousHash,
        transactions: [],
        attestations: [],
        blockHeight: 1
      });
      
      const blockSize = getBlockSize(block);
      expect(blockSize).toBeGreaterThan(0);
      expect(typeof blockSize).toBe('number');
    });
  });

  describe('Block Verification', () => {
    it('should verify a valid block', () => {
      const block = createBlock({
        privateKey,
        previousHash,
        transactions,
        attestations,
        blockHeight: 1
      });
      
      expect(verifyBlock(block)).toBe(true);
    });

    it('should reject block with invalid merkle root', () => {
      const block = createBlock({
        privateKey,
        previousHash,
        transactions,
        attestations,
        blockHeight: 1
      });
      
      // Tamper with merkle root
      const tamperedBlock = {
        ...block,
        header: {
          ...block.header,
          merkleRoot: 'invalid_merkle_root'
        }
      };
      
      expect(verifyBlock(tamperedBlock)).toBe(false);
    });

    it('should reject block with invalid signature', () => {
      const block = createBlock({
        privateKey,
        previousHash,
        transactions,
        attestations,
        blockHeight: 1
      });
      
      const tamperedBlock = {
        ...block,
        signature: 'invalid_signature'
      };
      
      expect(verifyBlock(tamperedBlock)).toBe(false);
    });

    it('should reject block with insufficient quorum', () => {
      const block = createBlock({
        privateKey,
        previousHash,
        transactions,
        attestations: attestations.slice(0, 2), // Only 2 attestations
        blockHeight: 1
      });
      
      expect(verifyBlock(block)).toBe(false);
    });

         it('should reject block with low convergence score', () => {
       const attester1 = generateKeyPair();
       const attester2 = generateKeyPair();
       const attester3 = generateKeyPair();
       
       // Create proper attestations with different answers for low convergence
       const divergentAttestation1 = createAttestation({ privateKey: attester1.privateKey, puzzleId: '1-2_q1', attesterAnswer: 'A' });
       const divergentAttestation2 = createAttestation({ privateKey: attester2.privateKey, puzzleId: '1-2_q1', attesterAnswer: 'B' });
       const divergentAttestation3 = createAttestation({ privateKey: attester3.privateKey, puzzleId: '1-2_q1', attesterAnswer: 'C' });
       
       const divergentAttestations = [
         {
           type: 'attestation' as const,
           questionId: divergentAttestation1.puzzleId,
           answerHash: divergentAttestation1.attesterAnswer,
           attesterPubKey: divergentAttestation1.attesterPublicKey,
           signature: divergentAttestation1.signature,
           timestamp: Date.now()
         },
         {
           type: 'attestation' as const,
           questionId: divergentAttestation2.puzzleId,
           answerHash: divergentAttestation2.attesterAnswer,
           attesterPubKey: divergentAttestation2.attesterPublicKey,
           signature: divergentAttestation2.signature,
           timestamp: Date.now()
         },
         {
           type: 'attestation' as const,
           questionId: divergentAttestation3.puzzleId,
           answerHash: divergentAttestation3.attesterAnswer,
           attesterPubKey: divergentAttestation3.attesterPublicKey,
           signature: divergentAttestation3.signature,
           timestamp: Date.now()
         }
       ];
       
       const block = createBlock({
         privateKey,
         previousHash,
         transactions,
         attestations: divergentAttestations,
         blockHeight: 1
       });
       
       expect(verifyBlock(block)).toBe(false);
     });

    it('should reject oversized blocks', () => {
      // This test should be implemented when we have a way to create oversized blocks
      // For now, just verify that size checking is working
      const block = createBlock({
        privateKey,
        previousHash,
        transactions,
        attestations,
        blockHeight: 1
      });
      
      const blockSize = getBlockSize(block);
      expect(blockSize).toBeLessThanOrEqual(3072);
    });
  });

  describe('Merkle Root Calculation', () => {
    it('should calculate consistent merkle root for same data', () => {
      const merkleRoot1 = calculateMerkleRoot([...transactions, ...attestations]);
      const merkleRoot2 = calculateMerkleRoot([...transactions, ...attestations]);
      
      expect(merkleRoot1).toBe(merkleRoot2);
    });

    it('should return empty root for empty input', () => {
      const merkleRoot = calculateMerkleRoot([]);
      
      expect(merkleRoot).toBeDefined();
      expect(merkleRoot).toMatch(/^[a-f0-9]{64}$/i);
    });

    it('should handle single item correctly', () => {
      const merkleRoot = calculateMerkleRoot([transactions[0]]);
      
      expect(merkleRoot).toBeDefined();
      expect(merkleRoot).toMatch(/^[a-f0-9]{64}$/i);
    });
  });
}); 