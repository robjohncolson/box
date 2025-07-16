import { beforeAll, describe, expect, it, vi } from 'vitest';
import { generateKeyPair } from '../src/crypto/secp256k1.js';
import { keyPairFromMnemonic } from '../src/crypto/keys.js';
import { 
  CompletionTransaction, 
  TransactionBatch,
  MCQCompletionData,
  FRQCompletionData,
  createMCQCompletionTransaction,
  createFRQCompletionTransaction,
  createTransactionBatch,
  validateCompletionTransaction,
  validateTransactionBatch,
  validateMCQTransaction,
  validateFRQTransaction,
  isMCQTransaction,
  isFRQTransaction,
  hashMCQOption,
  TransactionStore
} from '../src/tx.js';
import type { KeyPair } from '../src/types/index.js';

describe('Completion Transactions', () => {
  let keyPair1: KeyPair;
  let keyPair2: KeyPair;
  let testMnemonic: string;

  beforeAll(() => {
    // Generate test key pairs
    keyPair1 = generateKeyPair();
    keyPair2 = generateKeyPair();
    
    // Test mnemonic for deterministic testing
    testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  });

  describe('MCQ Hash Function', () => {
    it('should hash MCQ options consistently', () => {
      const optionA = hashMCQOption('A');
      const optionB = hashMCQOption('B');
      const optionC = hashMCQOption('C');
      
      expect(optionA).toHaveLength(64); // SHA-256 hex length
      expect(optionB).toHaveLength(64);
      expect(optionC).toHaveLength(64);
      
      // Different options should produce different hashes
      expect(optionA).not.toBe(optionB);
      expect(optionB).not.toBe(optionC);
      expect(optionA).not.toBe(optionC);
      
      // Same option should produce same hash
      expect(hashMCQOption('A')).toBe(optionA);
    });
    
    it('should produce valid hex format', () => {
      const hash = hashMCQOption('D');
      expect(hash).toMatch(/^[a-fA-F0-9]{64}$/);
    });
  });

  describe('MCQ Transaction Creation', () => {
    it('should create valid MCQ completion transaction', () => {
      const mcqData: MCQCompletionData = {
        questionId: 'unit1_lesson2_q1',
        selectedOption: 'B'
      };
      
      const transaction = createMCQCompletionTransaction(mcqData, keyPair1.privateKey);
      
      expect(transaction.type).toBe('completion');
      expect(transaction.questionId).toBe('unit1_lesson2_q1');
      expect(transaction.answerHash).toBe(hashMCQOption('B'));
      expect(transaction.answerText).toBeUndefined();
      expect(transaction.userPubKey).toBeDefined();
      expect(transaction.timestamp).toBeGreaterThan(0);
      expect(transaction.signature).toHaveLength(128);
    });
    
    it('should create different signatures for different questions', () => {
      const mcqData1: MCQCompletionData = {
        questionId: 'unit1_lesson2_q1',
        selectedOption: 'A'
      };
      
      const mcqData2: MCQCompletionData = {
        questionId: 'unit1_lesson2_q2',
        selectedOption: 'A'
      };
      
      const tx1 = createMCQCompletionTransaction(mcqData1, keyPair1.privateKey);
      const tx2 = createMCQCompletionTransaction(mcqData2, keyPair1.privateKey);
      
      expect(tx1.signature).not.toBe(tx2.signature);
    });
    
    it('should create different signatures for different answers', () => {
      const mcqData1: MCQCompletionData = {
        questionId: 'unit1_lesson2_q1',
        selectedOption: 'A'
      };
      
      const mcqData2: MCQCompletionData = {
        questionId: 'unit1_lesson2_q1',
        selectedOption: 'B'
      };
      
      const tx1 = createMCQCompletionTransaction(mcqData1, keyPair1.privateKey);
      const tx2 = createMCQCompletionTransaction(mcqData2, keyPair1.privateKey);
      
      expect(tx1.signature).not.toBe(tx2.signature);
      expect(tx1.answerHash).not.toBe(tx2.answerHash);
    });
  });

  describe('FRQ Transaction Creation', () => {
    it('should create valid FRQ completion transaction', () => {
      const frqData: FRQCompletionData = {
        questionId: 'unit2_lesson3_frq1',
        responseText: 'The mean of the distribution is 85 with a standard deviation of 12.'
      };
      
      const transaction = createFRQCompletionTransaction(frqData, keyPair1.privateKey);
      
      expect(transaction.type).toBe('completion');
      expect(transaction.questionId).toBe('unit2_lesson3_frq1');
      expect(transaction.answerText).toBe('The mean of the distribution is 85 with a standard deviation of 12.');
      expect(transaction.answerHash).toBeUndefined();
      expect(transaction.userPubKey).toBeDefined();
      expect(transaction.timestamp).toBeGreaterThan(0);
      expect(transaction.signature).toHaveLength(128);
    });
    
    it('should handle different FRQ responses', () => {
      const frqData1: FRQCompletionData = {
        questionId: 'unit2_lesson3_frq1',
        responseText: 'Response 1'
      };
      
      const frqData2: FRQCompletionData = {
        questionId: 'unit2_lesson3_frq1',
        responseText: 'Response 2'
      };
      
      const tx1 = createFRQCompletionTransaction(frqData1, keyPair1.privateKey);
      const tx2 = createFRQCompletionTransaction(frqData2, keyPair1.privateKey);
      
      expect(tx1.signature).not.toBe(tx2.signature);
      expect(tx1.answerText).not.toBe(tx2.answerText);
    });
  });

  describe('Transaction Type Guards', () => {
    it('should correctly identify MCQ transactions', () => {
      const mcqData: MCQCompletionData = {
        questionId: 'unit1_lesson2_q1',
        selectedOption: 'C'
      };
      
      const mcqTransaction = createMCQCompletionTransaction(mcqData, keyPair1.privateKey);
      
      expect(isMCQTransaction(mcqTransaction)).toBe(true);
      expect(isFRQTransaction(mcqTransaction)).toBe(false);
    });
    
    it('should correctly identify FRQ transactions', () => {
      const frqData: FRQCompletionData = {
        questionId: 'unit2_lesson3_frq1',
        responseText: 'This is a free response answer.'
      };
      
      const frqTransaction = createFRQCompletionTransaction(frqData, keyPair1.privateKey);
      
      expect(isFRQTransaction(frqTransaction)).toBe(true);
      expect(isMCQTransaction(frqTransaction)).toBe(false);
    });
  });

  describe('Transaction Validation', () => {
    it('should validate valid MCQ transactions', () => {
      const mcqData: MCQCompletionData = {
        questionId: 'unit1_lesson2_q1',
        selectedOption: 'A'
      };
      
      const transaction = createMCQCompletionTransaction(mcqData, keyPair1.privateKey);
      
      expect(validateCompletionTransaction(transaction)).toBe(true);
      expect(validateMCQTransaction(transaction)).toBe(true);
      expect(validateFRQTransaction(transaction)).toBe(false);
    });
    
    it('should validate valid FRQ transactions', () => {
      const frqData: FRQCompletionData = {
        questionId: 'unit2_lesson3_frq1',
        responseText: 'Valid response text.'
      };
      
      const transaction = createFRQCompletionTransaction(frqData, keyPair1.privateKey);
      
      expect(validateCompletionTransaction(transaction)).toBe(true);
      expect(validateFRQTransaction(transaction)).toBe(true);
      expect(validateMCQTransaction(transaction)).toBe(false);
    });
    
    it('should reject transactions with invalid structure', () => {
      const invalidTx1 = {
        type: 'invalid',
        questionId: 'unit1_lesson2_q1',
        answerHash: hashMCQOption('A'),
        userPubKey: keyPair1.publicKey.hex,
        timestamp: Date.now(),
        signature: 'a'.repeat(128)
      } as unknown as CompletionTransaction;
      
      expect(validateCompletionTransaction(invalidTx1)).toBe(false);
    });
    
    it('should reject transactions with both answerHash and answerText', () => {
      const invalidTx = {
        type: 'completion',
        questionId: 'unit1_lesson2_q1',
        answerHash: hashMCQOption('A'),
        answerText: 'Invalid dual response',
        userPubKey: keyPair1.publicKey.hex,
        timestamp: Date.now(),
        signature: 'a'.repeat(128)
      } as CompletionTransaction;
      
      expect(validateCompletionTransaction(invalidTx)).toBe(false);
    });
    
    it('should reject transactions with neither answerHash nor answerText', () => {
      const invalidTx = {
        type: 'completion',
        questionId: 'unit1_lesson2_q1',
        userPubKey: keyPair1.publicKey.hex,
        timestamp: Date.now(),
        signature: 'a'.repeat(128)
      } as CompletionTransaction;
      
      expect(validateCompletionTransaction(invalidTx)).toBe(false);
    });
    
    it('should reject MCQ transactions with invalid hash format', () => {
      const invalidTx = {
        type: 'completion',
        questionId: 'unit1_lesson2_q1',
        answerHash: 'invalid-hash',
        userPubKey: keyPair1.publicKey.hex,
        timestamp: Date.now(),
        signature: 'a'.repeat(128)
      } as CompletionTransaction;
      
      expect(validateCompletionTransaction(invalidTx)).toBe(false);
      expect(validateMCQTransaction(invalidTx)).toBe(false);
    });
    
    it('should reject FRQ transactions with empty text', () => {
      const invalidTx = {
        type: 'completion',
        questionId: 'unit2_lesson3_frq1',
        answerText: '   ',
        userPubKey: keyPair1.publicKey.hex,
        timestamp: Date.now(),
        signature: 'a'.repeat(128)
      } as CompletionTransaction;
      
      expect(validateCompletionTransaction(invalidTx)).toBe(false);
      expect(validateFRQTransaction(invalidTx)).toBe(false);
    });
    
    it('should reject transactions with future timestamps', () => {
      const invalidTx = {
        type: 'completion',
        questionId: 'unit1_lesson2_q1',
        answerHash: hashMCQOption('A'),
        userPubKey: keyPair1.publicKey.hex,
        timestamp: Date.now() + 1000000,
        signature: 'a'.repeat(128)
      } as CompletionTransaction;
      
      expect(validateCompletionTransaction(invalidTx)).toBe(false);
    });
    
    it('should reject transactions with old timestamps', () => {
      const invalidTx = {
        type: 'completion',
        questionId: 'unit1_lesson2_q1',
        answerHash: hashMCQOption('A'),
        userPubKey: keyPair1.publicKey.hex,
        timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
        signature: 'a'.repeat(128)
      } as CompletionTransaction;
      
      expect(validateCompletionTransaction(invalidTx)).toBe(false);
    });
  });

  describe('Transaction Batching', () => {
    it('should create valid transaction batch with mixed MCQ and FRQ', () => {
      const mcqData1: MCQCompletionData = {
        questionId: 'unit1_lesson2_q1',
        selectedOption: 'A'
      };
      
      const mcqData2: MCQCompletionData = {
        questionId: 'unit1_lesson2_q2',
        selectedOption: 'B'
      };
      
      const frqData1: FRQCompletionData = {
        questionId: 'unit1_lesson2_frq1',
        responseText: 'First FRQ response'
      };
      
      const frqData2: FRQCompletionData = {
        questionId: 'unit1_lesson2_frq2',
        responseText: 'Second FRQ response'
      };
      
      const transactions = [
        createMCQCompletionTransaction(mcqData1, keyPair1.privateKey),
        createMCQCompletionTransaction(mcqData2, keyPair1.privateKey),
        createFRQCompletionTransaction(frqData1, keyPair1.privateKey),
        createFRQCompletionTransaction(frqData2, keyPair1.privateKey)
      ];
      
      const batch = createTransactionBatch(transactions, keyPair1.privateKey);
      
      expect(batch.transactions).toHaveLength(4);
      expect(batch.batchId).toHaveLength(32);
      expect(batch.batchSignature).toHaveLength(128);
      expect(batch.userPubKey).toBeDefined();
      expect(batch.timestamp).toBeGreaterThan(0);
    });
    
    it('should create batch with maximum 10 transactions', () => {
      const transactions: CompletionTransaction[] = [];
      
      for (let i = 0; i < 10; i++) {
        const mcqData: MCQCompletionData = {
          questionId: `unit1_lesson2_q${i}`,
          selectedOption: 'A'
        };
        transactions.push(createMCQCompletionTransaction(mcqData, keyPair1.privateKey));
      }
      
      const batch = createTransactionBatch(transactions, keyPair1.privateKey);
      expect(batch.transactions).toHaveLength(10);
      expect(validateTransactionBatch(batch)).toBe(true);
    });
    
    it('should reject batch with more than 10 transactions', () => {
      const transactions: CompletionTransaction[] = [];
      
      for (let i = 0; i < 11; i++) {
        const mcqData: MCQCompletionData = {
          questionId: `unit1_lesson2_q${i}`,
          selectedOption: 'A'
        };
        transactions.push(createMCQCompletionTransaction(mcqData, keyPair1.privateKey));
      }
      
      expect(() => createTransactionBatch(transactions, keyPair1.privateKey)).toThrow('Batch cannot contain more than 10 transactions');
    });
    
    it('should reject empty batch', () => {
      expect(() => createTransactionBatch([], keyPair1.privateKey)).toThrow('Batch must contain at least one transaction');
    });
    
    it('should reject batch with transactions from different users', () => {
      const mcqData1: MCQCompletionData = {
        questionId: 'unit1_lesson2_q1',
        selectedOption: 'A'
      };
      
      const mcqData2: MCQCompletionData = {
        questionId: 'unit1_lesson2_q2',
        selectedOption: 'B'
      };
      
      const tx1 = createMCQCompletionTransaction(mcqData1, keyPair1.privateKey);
      const tx2 = createMCQCompletionTransaction(mcqData2, keyPair2.privateKey);
      
      expect(() => createTransactionBatch([tx1, tx2], keyPair1.privateKey)).toThrow('All transactions in batch must be from same user');
    });
  });

  describe('Batch Validation', () => {
    it('should validate valid batch', () => {
      const mcqData: MCQCompletionData = {
        questionId: 'unit1_lesson2_q1',
        selectedOption: 'A'
      };
      
      const transaction = createMCQCompletionTransaction(mcqData, keyPair1.privateKey);
      const batch = createTransactionBatch([transaction], keyPair1.privateKey);
      
      expect(validateTransactionBatch(batch)).toBe(true);
    });
    
    it('should reject batch with invalid transactions', () => {
      const invalidTx = {
        type: 'completion',
        questionId: 'unit1_lesson2_q1',
        answerHash: 'invalid-hash',
        userPubKey: keyPair1.publicKey.hex,
        timestamp: Date.now(),
        signature: 'a'.repeat(128)
      } as CompletionTransaction;
      
      const batch = {
        transactions: [invalidTx],
        batchId: 'a'.repeat(32),
        userPubKey: keyPair1.publicKey.hex,
        batchSignature: 'a'.repeat(128),
        timestamp: Date.now()
      } as TransactionBatch;
      
      expect(validateTransactionBatch(batch)).toBe(false);
    });
    
    it('should reject batch with invalid structure', () => {
      const invalidBatch = {
        transactions: [],
        batchId: 'a'.repeat(32),
        userPubKey: keyPair1.publicKey.hex,
        batchSignature: 'a'.repeat(128),
        timestamp: Date.now()
      } as TransactionBatch;
      
      expect(validateTransactionBatch(invalidBatch)).toBe(false);
    });
  });

  describe('Transaction Store', () => {
    it('should store and retrieve transactions', () => {
      const store = new TransactionStore();
      
      const mcqData: MCQCompletionData = {
        questionId: 'unit1_lesson2_q1',
        selectedOption: 'A'
      };
      
      const transaction = createMCQCompletionTransaction(mcqData, keyPair1.privateKey);
      
      store.addTransaction(transaction);
      
      expect(store.getTransactionCount()).toBe(1);
      expect(store.getTransactions()).toHaveLength(1);
      expect(store.getTransactions()[0]).toEqual(transaction);
    });
    
    it('should store and retrieve batches', () => {
      const store = new TransactionStore();
      
      const mcqData: MCQCompletionData = {
        questionId: 'unit1_lesson2_q1',
        selectedOption: 'A'
      };
      
      const transaction = createMCQCompletionTransaction(mcqData, keyPair1.privateKey);
      const batch = createTransactionBatch([transaction], keyPair1.privateKey);
      
      store.addBatch(batch);
      
      expect(store.getBatchCount()).toBe(1);
      expect(store.getBatches()).toHaveLength(1);
      expect(store.getBatches()[0]).toEqual(batch);
    });
    
    it('should reject invalid transactions', () => {
      const store = new TransactionStore();
      
      const invalidTx = {
        type: 'completion',
        questionId: 'unit1_lesson2_q1',
        answerHash: 'invalid-hash',
        userPubKey: keyPair1.publicKey.hex,
        timestamp: Date.now(),
        signature: 'a'.repeat(128)
      } as CompletionTransaction;
      
      expect(() => store.addTransaction(invalidTx)).toThrow('Invalid completion transaction');
    });
    
    it('should reject invalid batches', () => {
      const store = new TransactionStore();
      
      const invalidBatch = {
        transactions: [],
        batchId: 'a'.repeat(32),
        userPubKey: keyPair1.publicKey.hex,
        batchSignature: 'a'.repeat(128),
        timestamp: Date.now()
      } as TransactionBatch;
      
      expect(() => store.addBatch(invalidBatch)).toThrow('Invalid transaction batch');
    });
    
    it('should clear all data', () => {
      const store = new TransactionStore();
      
      const mcqData: MCQCompletionData = {
        questionId: 'unit1_lesson2_q1',
        selectedOption: 'A'
      };
      
      const transaction = createMCQCompletionTransaction(mcqData, keyPair1.privateKey);
      const batch = createTransactionBatch([transaction], keyPair1.privateKey);
      
      store.addTransaction(transaction);
      store.addBatch(batch);
      
      expect(store.getTransactionCount()).toBe(1);
      expect(store.getBatchCount()).toBe(1);
      
      store.clear();
      
      expect(store.getTransactionCount()).toBe(0);
      expect(store.getBatchCount()).toBe(0);
    });
  });
}); 