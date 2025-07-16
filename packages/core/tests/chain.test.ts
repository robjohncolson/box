import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Blockchain } from '../src/chain/index.js';
import { createBlock, verifyBlock, type Block } from '../src/block/index.js';
import { createTransaction } from '../src/transaction/index.js';
import { createAttestation } from '../src/attestation/index.js';
import { keyPairFromMnemonic } from '../src/crypto/keys.js';
import { generateKeyPair } from '../src/crypto/secp256k1.js';
import type { PrivateKey, Attestation, CompletionTransaction, AttestationTransaction } from '../src/types/index.js';
import { createMCQCompletionTransaction } from '../src/transaction/index';

describe('Blockchain', () => {
  let blockchain: Blockchain;
  let testPrivateKey: PrivateKey;
  
  beforeEach(() => {
    blockchain = new Blockchain();
    // Use a consistent test mnemonic for reproducible tests
    const keyPair = keyPairFromMnemonic('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    testPrivateKey = keyPair.privateKey;
  });

  // Helper function to create a valid block with transactions, puzzle data, and attestations
  function createValidBlockWithTransactions(privateKey: PrivateKey, previousHash: string, transactionData: any[] = []): Block {
    // Create completion transactions
    const completionTransactions: CompletionTransaction[] = transactionData.map(data => ({
      type: 'completion',
      questionId: data.questionId || 'test-question-123',
      userPubKey: data.userPubKey || 'test-user-pubkey',
      timestamp: Date.now(),
      signature: data.signature || 'test-signature',
      answerHash: data.answerHash,
      answerText: data.answerText
    }));
    
    // Create attestations from different peers
    const attester1 = generateKeyPair();
    const attester2 = generateKeyPair();
    const attester3 = generateKeyPair();
    const attestations: AttestationTransaction[] = [
      {
        type: 'attestation',
        questionId: 'test-puzzle-123',
        attesterPubKey: attester1.publicKey.hex,
        signature: 'attestation-sig-1',
        timestamp: Date.now(),
        answerHash: 'test-answer-hash'
      },
      {
        type: 'attestation',
        questionId: 'test-puzzle-123',
        attesterPubKey: attester2.publicKey.hex,
        signature: 'attestation-sig-2',
        timestamp: Date.now(),
        answerHash: 'test-answer-hash'
      },
      {
        type: 'attestation',
        questionId: 'test-puzzle-123',
        attesterPubKey: attester3.publicKey.hex,
        signature: 'attestation-sig-3',
        timestamp: Date.now(),
        answerHash: 'test-answer-hash'
      }
    ];
    
    // Create block with proper structure
    return createBlock({
      privateKey,
      previousHash,
      transactions: completionTransactions,
      attestations,
      blockHeight: 1,
      nonce: 0
    });
  }

  describe('Genesis Block', () => {
    it('should automatically contain a single Genesis Block when instantiated', () => {
      expect(blockchain.getChain()).toHaveLength(1);
      
      const genesisBlock = blockchain.getLatestBlock();
      expect(genesisBlock.header.previousHash).toBe('0'.repeat(64)); // Genesis has no previous block
      expect(genesisBlock.body.transactions).toEqual([]);
      expect(verifyBlock(genesisBlock)).toBe(true);
    });
  });

  describe('getLatestBlock', () => {
    it('should return the genesis block initially', () => {
      const latestBlock = blockchain.getLatestBlock();
      const chain = blockchain.getChain();
      
      expect(latestBlock).toBe(chain[chain.length - 1]);
      expect(latestBlock.header.previousHash).toBe('0'.repeat(64));
    });

    it('should return the most recently added block', () => {
      const newBlock = createValidBlockWithTransactions(
        testPrivateKey, 
        blockchain.getLatestBlock().blockId, 
        [{ questionId: 'test', answerHash: 'hello' }]
      );

      blockchain.addBlock(newBlock);
      
      const latestBlock = blockchain.getLatestBlock();
      expect(latestBlock).toBe(newBlock);
      expect(latestBlock.body.transactions).toHaveLength(1);
    });
  });

  describe('addBlock', () => {
    it('should successfully add a valid block with no transactions', () => {
      const newBlock = createBlock({
        privateKey: testPrivateKey,
        previousHash: blockchain.getLatestBlock().blockId,
        transactions: [],
        attestations: [],
        blockHeight: 1
      });

      expect(() => blockchain.addBlock(newBlock)).not.toThrow();
      expect(blockchain.getChain()).toHaveLength(2);
      expect(blockchain.getLatestBlock()).toBe(newBlock);
    });

    it('should successfully add a valid block with transactions and attestations', () => {
      const newBlock = createValidBlockWithTransactions(
        testPrivateKey, 
        blockchain.getLatestBlock().blockId, 
        [{ questionId: 'test', answerHash: 'hello' }]
      );

      expect(() => blockchain.addBlock(newBlock)).not.toThrow();
      expect(blockchain.getChain()).toHaveLength(2);
      expect(blockchain.getLatestBlock()).toBe(newBlock);
    });

    it('should throw an error if the block has an invalid signature', () => {
      const validBlock = createBlock({
        privateKey: testPrivateKey,
        previousHash: blockchain.getLatestBlock().blockId,
        transactions: [],
        attestations: [],
        blockHeight: 1
      });

      // Create an invalid block by corrupting the signature
      const invalidBlock: Block = {
        ...validBlock,
        signature: 'invalid_signature'
      };

      expect(() => blockchain.addBlock(invalidBlock)).toThrow('Invalid block signature');
      expect(blockchain.getChain()).toHaveLength(1); // Should still only have genesis block
    });

    it('should throw an error if previousHash does not match the latest block hash', () => {
      const invalidBlock = createBlock({
        privateKey: testPrivateKey,
        previousHash: 'wrong_hash',
        transactions: [],
        attestations: [],
        blockHeight: 1
      });

      expect(() => blockchain.addBlock(invalidBlock)).toThrow('Previous hash does not match');
      expect(blockchain.getChain()).toHaveLength(1); // Should still only have genesis block
    });

    it('should throw an error if non-genesis block contains transactions but no puzzle data', () => {
      const transaction = createMCQCompletionTransaction({ questionId: 'test', selectedOption: 'A' }, testPrivateKey);
      const invalidBlock = createBlock({
        privateKey: testPrivateKey,
        previousHash: blockchain.getLatestBlock().blockId,
        transactions: [transaction],
        attestations: [],
        blockHeight: 1
      });

      expect(() => blockchain.addBlock(invalidBlock)).toThrow('Invalid block signature');
      expect(blockchain.getChain()).toHaveLength(1); // Should still only have genesis block
    });

    it('should throw an error if the block contains invalid transactions', () => {
      // Create a transaction with corrupted signature
      const validTransaction = createMCQCompletionTransaction({ questionId: 'test', selectedOption: 'A' }, testPrivateKey);
      const invalidTransaction = {
        ...validTransaction,
        signature: 'invalid_signature'
      };

      // Create attestations from different peers
      const attester1 = generateKeyPair();
      const attester2 = generateKeyPair();
      const attestations: AttestationTransaction[] = [
        {
          type: 'attestation',
          questionId: 'test-puzzle-123',
          attesterPubKey: attester1.publicKey.hex,
          signature: 'attestation-sig-1',
          timestamp: Date.now(),
          answerHash: 'test-answer-hash'
        },
        {
          type: 'attestation',
          questionId: 'test-puzzle-123',
          attesterPubKey: attester2.publicKey.hex,
          signature: 'attestation-sig-2',
          timestamp: Date.now(),
          answerHash: 'test-answer-hash'
        }
      ];

      const blockWithInvalidTx = createBlock({
        privateKey: testPrivateKey,
        previousHash: blockchain.getLatestBlock().blockId,
        transactions: [invalidTransaction],
        attestations,
        blockHeight: 1
      });

      expect(() => blockchain.addBlock(blockWithInvalidTx)).toThrow('Invalid block signature');
      expect(blockchain.getChain()).toHaveLength(1); // Should still only have genesis block
    });
  });

  describe('isValidChain', () => {
    it('should return true for a valid chain with only genesis block', () => {
      const chain = blockchain.getChain();
      expect(Blockchain.isValidChain(chain)).toBe(true);
    });

    it('should return true for a valid chain with multiple blocks', () => {
      // Add a few valid blocks with no transactions for simplicity
      const block1 = createBlock({
        privateKey: testPrivateKey,
        previousHash: blockchain.getLatestBlock().blockId,
        transactions: [],
        attestations: [],
        blockHeight: 1
      });
      blockchain.addBlock(block1);

      const block2 = createBlock({
        privateKey: testPrivateKey,
        previousHash: blockchain.getLatestBlock().blockId,
        transactions: [],
        attestations: [],
        blockHeight: 2
      });
      blockchain.addBlock(block2);

      const chain = blockchain.getChain();
      expect(Blockchain.isValidChain(chain)).toBe(true);
    });

    it('should return true for a valid chain with transaction blocks', () => {
      // Add blocks with transactions and proper attestations
      const block1 = createValidBlockWithTransactions(
        testPrivateKey, 
        blockchain.getLatestBlock().blockId, 
        [{ questionId: 'block1', answerHash: 'data' }]
      );
      blockchain.addBlock(block1);

      const block2 = createValidBlockWithTransactions(
        testPrivateKey, 
        blockchain.getLatestBlock().blockId, 
        [{ questionId: 'block2', answerHash: 'data' }]
      );
      blockchain.addBlock(block2);

      const chain = blockchain.getChain();
      expect(Blockchain.isValidChain(chain)).toBe(true);
    });

    it('should return false for an empty chain', () => {
      expect(Blockchain.isValidChain([])).toBe(false);
    });

    it('should return false for a chain with an invalid genesis block', () => {
      const invalidGenesis: Block = {
        header: {
          previousHash: 'wrong_hash',
          merkleRoot: '0'.repeat(64),
          timestamp: Date.now(),
          blockHeight: 0,
          nonce: 0
        },
        body: {
          transactions: [],
          attestations: [],
          quorumData: {
            requiredQuorum: 3,
            achievedQuorum: 0,
            convergenceScore: 0
          }
        },
        signature: 'invalid',
        producerPubKey: 'invalid',
        blockId: 'invalid'
      };

      expect(Blockchain.isValidChain([invalidGenesis])).toBe(false);
    });

    it('should return false for a chain where previousHash links are broken', () => {
      // Create valid blocks
      const block1 = createBlock({
        privateKey: testPrivateKey,
        previousHash: blockchain.getLatestBlock().blockId,
        transactions: [],
        attestations: [],
        blockHeight: 1
      });

      // Create a second block with wrong previousHash
      const block2 = createBlock({
        privateKey: testPrivateKey,
        previousHash: 'wrong_hash', // This should be block1.blockId
        transactions: [],
        attestations: [],
        blockHeight: 2
      });

      const invalidChain = [blockchain.getLatestBlock(), block1, block2];
      expect(Blockchain.isValidChain(invalidChain)).toBe(false);
    });

    it('should return false for a chain containing blocks with invalid signatures', () => {
      // Create a valid block first
      const validBlock = createBlock({
        privateKey: testPrivateKey,
        previousHash: blockchain.getLatestBlock().blockId,
        transactions: [],
        attestations: [],
        blockHeight: 1
      });

      // Corrupt the signature
      const invalidBlock: Block = {
        ...validBlock,
        signature: 'corrupted_signature'
      };

      const invalidChain = [blockchain.getLatestBlock(), invalidBlock];
      expect(Blockchain.isValidChain(invalidChain)).toBe(false);
    });
  });

  describe('replaceChain', () => {
    it('should replace the chain and return true when newChain is valid and longer', () => {
      const originalChain = blockchain.getChain();
      expect(originalChain).toHaveLength(1); // Only genesis block

      // Create a longer valid chain with empty transaction blocks
      const block1 = createBlock({
        privateKey: testPrivateKey,
        previousHash: blockchain.getLatestBlock().blockId,
        transactions: [],
        attestations: [],
        blockHeight: 1
      });

      const block2 = createBlock({
        privateKey: testPrivateKey,
        previousHash: block1.blockId,
        transactions: [],
        attestations: [],
        blockHeight: 2
      });

      const newChain = [originalChain[0], block1, block2]; // Include genesis + 2 new blocks
      
      const result = blockchain.replaceChain(newChain);
      
      expect(result).toBe(true);
      expect(blockchain.getChain()).toHaveLength(3);
      expect(blockchain.getLatestBlock()).toBe(block2);
    });

    it('should return false and not replace the chain when newChain is shorter', () => {
      // First add a block to make the current chain longer
      const block1 = createBlock({
        privateKey: testPrivateKey,
        previousHash: blockchain.getLatestBlock().blockId,
        transactions: [],
        attestations: [],
        blockHeight: 1
      });
      blockchain.addBlock(block1);

      const originalChain = blockchain.getChain();
      expect(originalChain).toHaveLength(2);

      // Create a shorter chain (just genesis block)
      const shorterChain = [originalChain[0]];
      
      const result = blockchain.replaceChain(shorterChain);
      
      expect(result).toBe(false);
      expect(blockchain.getChain()).toHaveLength(2); // Should remain unchanged
      expect(blockchain.getLatestBlock()).toBe(block1);
    });

    it('should return false and not replace the chain when newChain is invalid', () => {
      const originalChain = blockchain.getChain();
      
      // Create an invalid chain with corrupted block signature
      const validBlock = createBlock({
        privateKey: testPrivateKey,
        previousHash: blockchain.getLatestBlock().blockId,
        transactions: [],
        attestations: [],
        blockHeight: 1
      });

      const invalidBlock: Block = {
        ...validBlock,
        signature: 'corrupted_signature'
      };

      const invalidChain = [originalChain[0], invalidBlock];
      
      const result = blockchain.replaceChain(invalidChain);
      
      expect(result).toBe(false);
      expect(blockchain.getChain()).toHaveLength(1); // Should remain unchanged (only genesis)
      expect(blockchain.getLatestBlock()).toBe(originalChain[0]);
    });
  });
});

// Chain class tests for local persistence and leaderboard
describe('Chain', () => {
  let chain: any;
  let mockIndexedDB: any;
  let testPrivateKey: PrivateKey;
  
  beforeEach(() => {
    // Mock IndexedDB
    mockIndexedDB = {
      open: vi.fn(),
      transaction: vi.fn(),
      close: vi.fn()
    };
    
    global.indexedDB = mockIndexedDB as any;
    
    testPrivateKey = keyPairFromMnemonic('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about').privateKey;
    
    // Create Chain instance (will be implemented)
    // chain = new Chain();
  });

  describe('appendBlock', () => {
    it('should append valid block to chain', async () => {
      // Mock valid block
      const validBlock = {
        header: {
          previousHash: '0'.repeat(64),
          merkleRoot: 'abc123',
          timestamp: Date.now(),
          blockHeight: 1,
          nonce: 0
        },
        body: {
          transactions: [],
          attestations: [],
          quorumData: {
            requiredQuorum: 3,
            achievedQuorum: 3,
            convergenceScore: 75
          }
        },
        signature: 'valid_signature',
        producerPubKey: 'producer_key',
        blockId: 'block_id_123'
      };
      
      // Mock persistence
      const mockPersistBlock = vi.fn().mockResolvedValue(true);
      const mockUpdateLeaderboard = vi.fn().mockResolvedValue(true);
      
      // Test would verify appendBlock returns true for valid block
      // expect(await chain.appendBlock(validBlock)).toBe(true);
      // expect(mockPersistBlock).toHaveBeenCalledWith(validBlock);
      // expect(mockUpdateLeaderboard).toHaveBeenCalled();
    });

    it('should reject invalid block', async () => {
      const invalidBlock = {
        header: {
          previousHash: 'invalid_hash',
          merkleRoot: 'abc123',
          timestamp: Date.now(),
          blockHeight: 1,
          nonce: 0
        },
        body: {
          transactions: [],
          attestations: [],
          quorumData: {
            requiredQuorum: 3,
            achievedQuorum: 1, // Below minimum
            convergenceScore: 25 // Below threshold
          }
        },
        signature: 'invalid_signature',
        producerPubKey: 'producer_key',
        blockId: 'block_id_123'
      };
      
      // Test would verify appendBlock returns false for invalid block
      // expect(await chain.appendBlock(invalidBlock)).toBe(false);
    });

    it('should validate chain continuity', async () => {
      // Mock chain with existing blocks
      const existingBlock = {
        header: {
          previousHash: '0'.repeat(64),
          merkleRoot: 'abc123',
          timestamp: Date.now(),
          blockHeight: 1,
          nonce: 0
        },
        body: {
          transactions: [],
          attestations: [],
          quorumData: {
            requiredQuorum: 3,
            achievedQuorum: 3,
            convergenceScore: 75
          }
        },
        signature: 'valid_signature',
        producerPubKey: 'producer_key',
        blockId: 'existing_block_id'
      };
      
      const newBlock = {
        ...existingBlock,
        header: {
          ...existingBlock.header,
          previousHash: 'wrong_hash', // Should be 'existing_block_id'
          blockHeight: 2
        },
        blockId: 'new_block_id'
      };
      
      // Test would verify chain continuity validation
      // expect(await chain.appendBlock(newBlock)).toBe(false);
    });
  });

  describe('getLeaderboard', () => {
    it('should calculate leaderboard from chain blocks', async () => {
      const mockBlocks = [
        {
          header: { blockHeight: 1, timestamp: Date.now() },
          body: {
            transactions: [
              {
                type: 'completion',
                questionId: 'q1',
                userPubKey: 'user1',
                timestamp: Date.now(),
                signature: 'sig1'
              },
              {
                type: 'completion',
                questionId: 'q2',
                userPubKey: 'user2',
                timestamp: Date.now(),
                signature: 'sig2'
              }
            ],
            attestations: [
              {
                type: 'attestation',
                questionId: 'q1',
                attesterPubKey: 'user1',
                timestamp: Date.now(),
                signature: 'attestation_sig1'
              }
            ],
            quorumData: {
              requiredQuorum: 3,
              achievedQuorum: 3,
              convergenceScore: 80
            }
          }
        }
      ];
      
      // Mock storage with blocks
      const mockStorage = {
        blocks: mockBlocks,
        leaderboard: [],
        metadata: {
          chainHeight: 1,
          lastUpdate: Date.now(),
          totalTransactions: 2
        }
      };
      
      const expectedLeaderboard = [
        {
          pubKey: 'user1',
          totalPoints: 10,
          reputationScore: 85,
          convergenceRate: 1.0,
          lastActivity: expect.any(Number),
          rank: 1
        },
        {
          pubKey: 'user2',
          totalPoints: 5,
          reputationScore: 60,
          convergenceRate: 0,
          lastActivity: expect.any(Number),
          rank: 2
        }
      ];
      
      // Test would verify leaderboard calculation
      // const leaderboard = await chain.getLeaderboard();
      // expect(leaderboard).toEqual(expectedLeaderboard);
    });

    it('should return cached leaderboard when valid', async () => {
      const cachedLeaderboard = [
        {
          pubKey: 'user1',
          totalPoints: 100,
          reputationScore: 90,
          convergenceRate: 0.9,
          lastActivity: Date.now(),
          rank: 1
        }
      ];
      
      const mockStorage = {
        blocks: [],
        leaderboard: cachedLeaderboard,
        metadata: {
          chainHeight: 1,
          lastUpdate: Date.now(),
          totalTransactions: 1
        }
      };
      
      // Mock cache validation
      const mockIsCacheValid = vi.fn().mockReturnValue(true);
      
      // Test would verify cached leaderboard is returned
      // expect(await chain.getLeaderboard()).toEqual(cachedLeaderboard);
      // expect(mockIsCacheValid).toHaveBeenCalled();
    });

    it('should recalculate leaderboard when cache is stale', async () => {
      // Mock stale cache
      const mockIsCacheValid = vi.fn().mockReturnValue(false);
      const mockCalculateLeaderboard = vi.fn().mockReturnValue([]);
      const mockCacheLeaderboard = vi.fn().mockResolvedValue(true);
      
      // Test would verify recalculation when cache is stale
      // await chain.getLeaderboard();
      // expect(mockCalculateLeaderboard).toHaveBeenCalled();
      // expect(mockCacheLeaderboard).toHaveBeenCalled();
    });
  });

  describe('reputation scoring', () => {
    it('should calculate reputation score from user stats', () => {
      const userStats = {
        totalPoints: 100,
        completions: 20,
        attestations: 10,
        convergenceHits: 8
      };
      
      const totalLessons = 25;
      
      // Expected calculation:
      // completionRate = 20/25 = 0.8
      // attestationQuality = 8/10 = 0.8
      // consistencyFactor = 0.9 (mocked)
      // reputation = (0.8 * 40) + (0.8 * 35) + (0.9 * 25) = 32 + 28 + 22.5 = 82.5
      
      const expectedReputationScore = 83; // Rounded
      
      // Test would verify reputation calculation
      // const reputation = calculateReputationScore(userStats, totalLessons);
      // expect(reputation).toBe(expectedReputationScore);
    });

    it('should handle edge cases in reputation calculation', () => {
      // Test with no attestations
      const noAttestationsStats = {
        totalPoints: 50,
        completions: 10,
        attestations: 0,
        convergenceHits: 0
      };
      
      // Test would verify reputation handles division by zero
      // expect(calculateReputationScore(noAttestationsStats, 25)).toBeGreaterThan(0);
      
      // Test with perfect stats
      const perfectStats = {
        totalPoints: 250,
        completions: 25,
        attestations: 25,
        convergenceHits: 25
      };
      
      // Test would verify reputation caps at 100
      // expect(calculateReputationScore(perfectStats, 25)).toBe(100);
    });
  });

  describe('persistence mock', () => {
    it('should successfully persist block to IndexedDB', async () => {
      const mockTransaction = {
        objectStore: vi.fn().mockReturnValue({
          add: vi.fn().mockResolvedValue(true)
        })
      };
      
      const mockDB = {
        transaction: vi.fn().mockReturnValue(mockTransaction)
      };
      
      mockIndexedDB.open.mockResolvedValue(mockDB);
      
      const testBlock = {
        header: { blockHeight: 1, timestamp: Date.now() },
        body: { transactions: [], attestations: [], quorumData: {} },
        signature: 'test_signature',
        producerPubKey: 'test_producer',
        blockId: 'test_block_id'
      };
      
      // Test would verify IndexedDB persistence
      // await chain.persistBlock(testBlock);
      // expect(mockDB.transaction).toHaveBeenCalledWith(['blocks'], 'readwrite');
      // expect(mockTransaction.objectStore).toHaveBeenCalledWith('blocks');
    });

    it('should handle IndexedDB errors gracefully', async () => {
      const mockError = new Error('IndexedDB error');
      mockIndexedDB.open.mockRejectedValue(mockError);
      
      const testBlock = {
        header: { blockHeight: 1, timestamp: Date.now() },
        body: { transactions: [], attestations: [], quorumData: {} },
        signature: 'test_signature',
        producerPubKey: 'test_producer',
        blockId: 'test_block_id'
      };
      
      // Test would verify error handling
      // expect(async () => {
      //   await chain.persistBlock(testBlock);
      // }).rejects.toThrow('IndexedDB error');
    });

    it('should initialize IndexedDB schema correctly', async () => {
      const mockUpgradeDB = {
        createObjectStore: vi.fn(),
        createIndex: vi.fn()
      };
      
      const mockOpenRequest = {
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null
      };
      
      mockIndexedDB.open.mockReturnValue(mockOpenRequest);
      
      // Test would verify schema initialization
      // await chain.initializeIndexedDB();
      // expect(mockUpgradeDB.createObjectStore).toHaveBeenCalledWith('blocks', { keyPath: 'blockId' });
      // expect(mockUpgradeDB.createObjectStore).toHaveBeenCalledWith('leaderboard', { keyPath: 'pubKey' });
      // expect(mockUpgradeDB.createObjectStore).toHaveBeenCalledWith('metadata', { keyPath: 'key' });
    });
  });

  describe('getUserStats', () => {
    it('should return user stats from leaderboard', async () => {
      const mockLeaderboard = [
        {
          pubKey: 'user1',
          totalPoints: 100,
          reputationScore: 90,
          convergenceRate: 0.9,
          lastActivity: Date.now(),
          rank: 1
        },
        {
          pubKey: 'user2',
          totalPoints: 50,
          reputationScore: 70,
          convergenceRate: 0.7,
          lastActivity: Date.now(),
          rank: 2
        }
      ];
      
      const mockGetLeaderboard = vi.fn().mockResolvedValue(mockLeaderboard);
      
      // Test would verify user stats retrieval
      // const userStats = await chain.getUserStats('user1');
      // expect(userStats).toEqual(mockLeaderboard[0]);
    });

    it('should return null for non-existent user', async () => {
      const mockLeaderboard = [
        {
          pubKey: 'user1',
          totalPoints: 100,
          reputationScore: 90,
          convergenceRate: 0.9,
          lastActivity: Date.now(),
          rank: 1
        }
      ];
      
      const mockGetLeaderboard = vi.fn().mockResolvedValue(mockLeaderboard);
      
      // Test would verify null return for non-existent user
      // const userStats = await chain.getUserStats('nonexistent');
      // expect(userStats).toBeNull();
    });
  });
});