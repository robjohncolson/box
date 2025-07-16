import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { generateKeyPair } from '../src/crypto/secp256k1.js';
import { 
  createMCQCompletionTransaction,
  createFRQCompletionTransaction,
  createTransactionBatch,
  type CompletionTransaction,
  type MCQCompletionData,
  type FRQCompletionData
} from '../src/transaction/index';
import { 
  Mempool, 
  calculatePoints, 
  findActivityByQuestionId,
  type MempoolEntry,
  type ActivityData
} from '../src/mempool.js';
import type { KeyPair } from '../src/types/index.js';

describe('Mempool System', () => {
  let keyPair1: KeyPair;
  let keyPair2: KeyPair;
  let mempool: Mempool;

  beforeAll(() => {
    keyPair1 = generateKeyPair();
    keyPair2 = generateKeyPair();
  });

  beforeEach(() => {
    mempool = new Mempool(keyPair1.publicKey.hex, 50); // 50 points threshold
  });

  describe('Point Calculation', () => {
    it('should calculate points correctly for quiz activities', () => {
      const points = calculatePoints('1-2_q1', 'MCQ');
      expect(points).toBe(50); // 0.5 * 100
    });

    it('should calculate points correctly for video activities', () => {
      const points = calculatePoints('1-2_video_1', 'MCQ');
      expect(points).toBe(30); // 0.3 * 100
    });

    it('should calculate points correctly for blooket activities', () => {
      const points = calculatePoints('1-2_blooket', 'MCQ');
      expect(points).toBe(15); // 0.15 * 100
    });

    it('should calculate points correctly for origami activities', () => {
      const points = calculatePoints('1-2_origami', 'MCQ');
      expect(points).toBe(5); // 0.05 * 100
    });

    it('should handle fractional contributions correctly', () => {
      const points = calculatePoints('1-capstone_q1', 'MCQ');
      expect(points).toBe(16); // Math.floor(0.16666666666666666 * 100)
    });

    it('should return 0 for unknown question IDs', () => {
      const points = calculatePoints('unknown_question', 'MCQ');
      expect(points).toBe(0);
    });

    it('should distinguish between MCQ and FRQ types', () => {
      const mcqPoints = calculatePoints('1-2_q1', 'MCQ');
      const frqPoints = calculatePoints('1-2_q1', 'FRQ');
      
      expect(mcqPoints).toBe(50);
      expect(frqPoints).toBe(60); // 50 * 1.2 multiplier for FRQ
    });
  });

  describe('Activity Lookup', () => {
    it('should find activities by question ID', () => {
      const activity = findActivityByQuestionId('1-2_q1');
      expect(activity).toBeDefined();
      expect(activity?.id).toBe('1-2_q1');
      expect(activity?.type).toBe('quiz');
      expect(activity?.contribution).toBe(0.5);
    });

    it('should return null for unknown question IDs', () => {
      const activity = findActivityByQuestionId('unknown_question');
      expect(activity).toBeNull();
    });
  });

  describe('Mempool Transaction Management', () => {
    it('should add MCQ transactions correctly', () => {
      const mcqData: MCQCompletionData = {
        questionId: '1-2_q1',
        selectedOption: 'A'
      };

      const transaction = createMCQCompletionTransaction(mcqData, keyPair1.privateKey);
      mempool.addTransaction(transaction);

      expect(mempool.getTransactionCount()).toBe(1);
      expect(mempool.getTotalPoints()).toBe(50);
    });

    it('should add FRQ transactions correctly', () => {
      const frqData: FRQCompletionData = {
        questionId: '1-2_q1',
        responseText: 'This is my answer to the free response question.'
      };

      const transaction = createFRQCompletionTransaction(frqData, keyPair1.privateKey);
      mempool.addTransaction(transaction);

      expect(mempool.getTransactionCount()).toBe(1);
      expect(mempool.getTotalPoints()).toBe(60); // FRQ gets 1.2x multiplier
    });

    it('should accumulate points from multiple transactions', () => {
      const mcqData: MCQCompletionData = {
        questionId: '1-2_q1',
        selectedOption: 'A'
      };

      const frqData: FRQCompletionData = {
        questionId: '1-3_q1',
        responseText: 'This is my FRQ answer.'
      };

      const mcqTx = createMCQCompletionTransaction(mcqData, keyPair1.privateKey);
      const frqTx = createFRQCompletionTransaction(frqData, keyPair1.privateKey);

      mempool.addTransaction(mcqTx);
      mempool.addTransaction(frqTx);

      expect(mempool.getTransactionCount()).toBe(2);
      expect(mempool.getTotalPoints()).toBe(110); // 50 + 60
    });

    it('should handle transactions with zero points', () => {
      const mcqData: MCQCompletionData = {
        questionId: 'unknown_question',
        selectedOption: 'A'
      };

      const transaction = createMCQCompletionTransaction(mcqData, keyPair1.privateKey);
      mempool.addTransaction(transaction);

      expect(mempool.getTransactionCount()).toBe(1);
      expect(mempool.getTotalPoints()).toBe(0);
    });

    it('should reject transactions from different users', () => {
      const mcqData: MCQCompletionData = {
        questionId: '1-2_q1',
        selectedOption: 'A'
      };

      const transaction = createMCQCompletionTransaction(mcqData, keyPair2.privateKey);
      
      expect(() => mempool.addTransaction(transaction)).toThrow('Transaction must be from the same user');
    });
  });

  describe('Mining Eligibility', () => {
    it('should not be eligible when below threshold', () => {
      const mcqData: MCQCompletionData = {
        questionId: '1-2_video_1', // 30 points
        selectedOption: 'A'
      };

      const transaction = createMCQCompletionTransaction(mcqData, keyPair1.privateKey);
      mempool.addTransaction(transaction);

      expect(mempool.isMiningEligible()).toBe(false);
    });

    it('should be eligible when reaching threshold', () => {
      // Add quiz transaction worth 50 points
      const mcqData: MCQCompletionData = {
        questionId: '1-2_q1',
        selectedOption: 'A'
      };

      const transaction = createMCQCompletionTransaction(mcqData, keyPair1.privateKey);
      mempool.addTransaction(transaction);

      expect(mempool.isMiningEligible()).toBe(true);
    });

    it('should be eligible when exceeding threshold', () => {
      // Add multiple transactions totaling over 50 points
      const transactions = [
        createMCQCompletionTransaction({ questionId: '1-2_q1', selectedOption: 'A' }, keyPair1.privateKey), // 50 points
        createMCQCompletionTransaction({ questionId: '1-2_video_1', selectedOption: 'A' }, keyPair1.privateKey), // 30 points
        createMCQCompletionTransaction({ questionId: '1-2_blooket', selectedOption: 'A' }, keyPair1.privateKey) // 15 points
      ];

      transactions.forEach(tx => mempool.addTransaction(tx));

      expect(mempool.getTotalPoints()).toBe(95);
      expect(mempool.isMiningEligible()).toBe(true);
    });

    it('should work with custom threshold', () => {
      const customMempool = new Mempool(keyPair1.publicKey.hex, 100); // 100 points threshold
      
      const mcqData: MCQCompletionData = {
        questionId: '1-2_q1',
        selectedOption: 'A'
      };

      const transaction = createMCQCompletionTransaction(mcqData, keyPair1.privateKey);
      customMempool.addTransaction(transaction);

      expect(customMempool.getTotalPoints()).toBe(50);
      expect(customMempool.isMiningEligible()).toBe(false);
    });
  });

  describe('Batch Preparation', () => {
    it('should prepare batch when eligible', () => {
      const mcqData: MCQCompletionData = {
        questionId: '1-2_q1',
        selectedOption: 'A'
      };

      const transaction = createMCQCompletionTransaction(mcqData, keyPair1.privateKey);
      mempool.addTransaction(transaction);

      const batch = mempool.prepareBatch();
      expect(batch).toBeDefined();
      expect(batch?.transactions).toHaveLength(1);
      expect(batch?.userPubKey).toBe(keyPair1.publicKey.hex);
    });

    it('should return null when not eligible', () => {
      const mcqData: MCQCompletionData = {
        questionId: '1-2_video_1', // 30 points - below threshold
        selectedOption: 'A'
      };

      const transaction = createMCQCompletionTransaction(mcqData, keyPair1.privateKey);
      mempool.addTransaction(transaction);

      const batch = mempool.prepareBatch();
      expect(batch).toBeNull();
    });

    it('should include all transactions in batch', () => {
      const transactions = [
        createMCQCompletionTransaction({ questionId: '1-2_q1', selectedOption: 'A' }, keyPair1.privateKey),
        createMCQCompletionTransaction({ questionId: '1-3_q1', selectedOption: 'B' }, keyPair1.privateKey)
      ];

      transactions.forEach(tx => mempool.addTransaction(tx));

      const batch = mempool.prepareBatch();
      expect(batch?.transactions).toHaveLength(2);
    });
  });

  describe('Clear Operations', () => {
    it('should clear all transactions and reset points', () => {
      const transactions = [
        createMCQCompletionTransaction({ questionId: '1-2_q1', selectedOption: 'A' }, keyPair1.privateKey),
        createMCQCompletionTransaction({ questionId: '1-3_q1', selectedOption: 'B' }, keyPair1.privateKey)
      ];

      transactions.forEach(tx => mempool.addTransaction(tx));

      expect(mempool.getTransactionCount()).toBe(2);
      expect(mempool.getTotalPoints()).toBe(100);

      mempool.clear();

      expect(mempool.getTransactionCount()).toBe(0);
      expect(mempool.getTotalPoints()).toBe(0);
      expect(mempool.isMiningEligible()).toBe(false);
    });

    it('should allow new transactions after clearing', () => {
      // Add and clear
      const transaction1 = createMCQCompletionTransaction({ questionId: '1-2_q1', selectedOption: 'A' }, keyPair1.privateKey);
      mempool.addTransaction(transaction1);
      mempool.clear();

      // Add new transaction
      const transaction2 = createMCQCompletionTransaction({ questionId: '1-3_q1', selectedOption: 'B' }, keyPair1.privateKey);
      mempool.addTransaction(transaction2);

      expect(mempool.getTransactionCount()).toBe(1);
      expect(mempool.getTotalPoints()).toBe(50);
    });
  });

  describe('Entry Management', () => {
    it('should track entry timestamps', () => {
      const beforeTime = Date.now();
      
      const mcqData: MCQCompletionData = {
        questionId: '1-2_q1',
        selectedOption: 'A'
      };

      const transaction = createMCQCompletionTransaction(mcqData, keyPair1.privateKey);
      mempool.addTransaction(transaction);

      const afterTime = Date.now();
      const entries = mempool.getEntries();
      
      expect(entries).toHaveLength(1);
      expect(entries[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(entries[0].timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should store correct points for each entry', () => {
      const mcqData: MCQCompletionData = {
        questionId: '1-2_q1',
        selectedOption: 'A'
      };

      const transaction = createMCQCompletionTransaction(mcqData, keyPair1.privateKey);
      mempool.addTransaction(transaction);

      const entries = mempool.getEntries();
      expect(entries[0].points).toBe(50);
      expect(entries[0].transaction).toBe(transaction);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty mempool correctly', () => {
      expect(mempool.getTransactionCount()).toBe(0);
      expect(mempool.getTotalPoints()).toBe(0);
      expect(mempool.isMiningEligible()).toBe(false);
      expect(mempool.prepareBatch()).toBeNull();
    });

    it('should handle mempool with threshold of 0', () => {
      const zeroThresholdMempool = new Mempool(keyPair1.publicKey.hex, 0);
      
      // Even with 0 threshold, should be eligible immediately
      expect(zeroThresholdMempool.isMiningEligible()).toBe(true);
      
      // Adding transaction should maintain eligibility
      const transaction = createMCQCompletionTransaction({ questionId: '1-2_origami', selectedOption: 'A' }, keyPair1.privateKey);
      zeroThresholdMempool.addTransaction(transaction);
      
      expect(zeroThresholdMempool.isMiningEligible()).toBe(true);
    });

    it('should handle very high thresholds', () => {
      const highThresholdMempool = new Mempool(keyPair1.publicKey.hex, 1000);
      
      // Add multiple high-value transactions
      const transactions = [
        createMCQCompletionTransaction({ questionId: '1-2_q1', selectedOption: 'A' }, keyPair1.privateKey), // 50
        createMCQCompletionTransaction({ questionId: '1-3_q1', selectedOption: 'B' }, keyPair1.privateKey), // 50
        createFRQCompletionTransaction({ questionId: '1-2_q1', responseText: 'Answer' }, keyPair1.privateKey) // 60
      ];

      transactions.forEach(tx => highThresholdMempool.addTransaction(tx));

      expect(highThresholdMempool.getTotalPoints()).toBe(160);
      expect(highThresholdMempool.isMiningEligible()).toBe(false);
    });
  });
}); 