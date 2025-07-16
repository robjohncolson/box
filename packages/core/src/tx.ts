import { hash256 } from './crypto/hashing.js';
import { sign } from './crypto/secp256k1.js';
import type { PrivateKey, CompletionTransaction } from './types/index.js';
import * as secp256k1 from '@noble/secp256k1';

// Batch transaction interface  
export interface TransactionBatch {
  transactions: CompletionTransaction[];
  batchId: string;
  userPubKey: string;
  batchSignature: string;
  timestamp: number;
}

// MCQ completion data
export interface MCQCompletionData {
  questionId: string;
  selectedOption: string;  // A, B, C, D, E
}

// FRQ completion data
export interface FRQCompletionData {
  questionId: string;
  responseText: string;
}

// Type guards
export function isMCQTransaction(tx: CompletionTransaction): boolean {
  return tx.answerHash !== undefined && tx.answerText === undefined;
}

export function isFRQTransaction(tx: CompletionTransaction): boolean {
  return tx.answerText !== undefined && tx.answerHash === undefined;
}

// Validation functions
export function validateMCQTransaction(tx: CompletionTransaction): boolean {
  if (!isMCQTransaction(tx)) return false;
  
  // Check answerHash format (SHA-256 hex should be 64 characters)
  const hashRegex = /^[a-fA-F0-9]{64}$/;
  return hashRegex.test(tx.answerHash!);
}

export function validateFRQTransaction(tx: CompletionTransaction): boolean {
  if (!isFRQTransaction(tx)) return false;
  
  // Check answerText is non-empty
  return tx.answerText!.trim().length > 0;
}

// Hash function for MCQ options
export function hashMCQOption(option: string): string {
  const optionBytes = new TextEncoder().encode(option);
  const hashBytes = hash256(optionBytes);
  return Array.from(hashBytes).map((b: number) => b.toString(16).padStart(2, '0')).join('');
}

// Create completion transaction for MCQ
export function createMCQCompletionTransaction(
  data: MCQCompletionData,
  privateKey: PrivateKey
): CompletionTransaction {
  const answerHash = hashMCQOption(data.selectedOption);
  const timestamp = Date.now();
  const userPubKey = secp256k1.etc.bytesToHex(secp256k1.getPublicKey(privateKey.bytes));
  
  const transaction: Omit<CompletionTransaction, 'signature'> = {
    type: 'completion',
    questionId: data.questionId,
    answerHash,
    userPubKey,
    timestamp
  };
  
  // Create signature
  const messageHash = createTransactionHash(transaction);
  const signature = sign(messageHash, privateKey);
  const signatureHex = signature.r.toString(16).padStart(64, '0') + 
                      signature.s.toString(16).padStart(64, '0');
  
  return {
    ...transaction,
    signature: signatureHex
  };
}

// Create completion transaction for FRQ
export function createFRQCompletionTransaction(
  data: FRQCompletionData,
  privateKey: PrivateKey
): CompletionTransaction {
  const timestamp = Date.now();
  const userPubKey = secp256k1.etc.bytesToHex(secp256k1.getPublicKey(privateKey.bytes));
  
  const transaction: Omit<CompletionTransaction, 'signature'> = {
    type: 'completion',
    questionId: data.questionId,
    answerText: data.responseText,
    userPubKey,
    timestamp
  };
  
  // Create signature
  const messageHash = createTransactionHash(transaction);
  const signature = sign(messageHash, privateKey);
  const signatureHex = signature.r.toString(16).padStart(64, '0') + 
                      signature.s.toString(16).padStart(64, '0');
  
  return {
    ...transaction,
    signature: signatureHex
  };
}

// Create transaction hash for signing
function createTransactionHash(transaction: Omit<CompletionTransaction, 'signature'>): Uint8Array {
  const data = {
    type: transaction.type,
    questionId: transaction.questionId,
    answerHash: transaction.answerHash,
    answerText: transaction.answerText,
    userPubKey: transaction.userPubKey,
    timestamp: transaction.timestamp
  };
  
  const jsonString = JSON.stringify(data);
  const messageBytes = new TextEncoder().encode(jsonString);
  return hash256(messageBytes);
}

// Validate individual completion transaction
export function validateCompletionTransaction(tx: CompletionTransaction): boolean {
  // Basic structure validation
  if (tx.type !== 'completion') return false;
  if (!tx.questionId || typeof tx.questionId !== 'string') return false;
  if (!tx.userPubKey || typeof tx.userPubKey !== 'string') return false;
  if (!tx.timestamp || typeof tx.timestamp !== 'number') return false;
  if (!tx.signature || typeof tx.signature !== 'string') return false;
  
  // Validate timestamp is reasonable (within last 24 hours and not in future)
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  if (tx.timestamp > now || tx.timestamp < now - dayMs) return false;
  
  // Validate question type specific fields
  if (tx.answerHash && tx.answerText) return false; // Can't have both
  if (!tx.answerHash && !tx.answerText) return false; // Must have one
  
  if (tx.answerHash && !validateMCQTransaction(tx)) return false;
  if (tx.answerText && !validateFRQTransaction(tx)) return false;
  
  // TODO: Add signature verification once we have proper key derivation
  // For now, just check signature format (128 hex chars)
  const signatureRegex = /^[a-fA-F0-9]{128}$/;
  return signatureRegex.test(tx.signature);
}

// Create transaction batch
export function createTransactionBatch(
  transactions: CompletionTransaction[],
  privateKey: PrivateKey
): TransactionBatch {
  if (transactions.length === 0) {
    throw new Error('Batch must contain at least one transaction');
  }
  
  if (transactions.length > 10) {
    throw new Error('Batch cannot contain more than 10 transactions');
  }
  
  // Validate all transactions are from same user
  const userPubKey = transactions[0].userPubKey;
  if (!transactions.every(tx => tx.userPubKey === userPubKey)) {
    throw new Error('All transactions in batch must be from same user');
  }
  
  const timestamp = Date.now();
  const batchId = generateBatchId(transactions, timestamp);
  
  // Create batch signature
  const batchData = {
    transactions: transactions.map(tx => ({
      type: tx.type,
      questionId: tx.questionId,
      answerHash: tx.answerHash,
      answerText: tx.answerText,
      timestamp: tx.timestamp
    })),
    batchId,
    userPubKey,
    timestamp
  };
  
  const batchHash = hash256(new TextEncoder().encode(JSON.stringify(batchData)));
  const signature = sign(batchHash, privateKey);
  const batchSignature = signature.r.toString(16).padStart(64, '0') + 
                        signature.s.toString(16).padStart(64, '0');
  
  return {
    transactions,
    batchId,
    userPubKey,
    batchSignature,
    timestamp
  };
}

// Generate batch ID
function generateBatchId(transactions: CompletionTransaction[], timestamp: number): string {
  const data = {
    questionIds: transactions.map(tx => tx.questionId).sort(),
    userPubKey: transactions[0].userPubKey,
    timestamp
  };
  
  const hashBytes = hash256(new TextEncoder().encode(JSON.stringify(data)));
  return Array.from(hashBytes.slice(0, 16)).map((b: number) => b.toString(16).padStart(2, '0')).join('');
}

// Validate transaction batch
export function validateTransactionBatch(batch: TransactionBatch): boolean {
  // Basic structure validation
  if (!batch.transactions || !Array.isArray(batch.transactions)) return false;
  if (batch.transactions.length === 0 || batch.transactions.length > 10) return false;
  if (!batch.batchId || typeof batch.batchId !== 'string') return false;
  if (!batch.userPubKey || typeof batch.userPubKey !== 'string') return false;
  if (!batch.batchSignature || typeof batch.batchSignature !== 'string') return false;
  if (!batch.timestamp || typeof batch.timestamp !== 'number') return false;
  
  // Validate all individual transactions
  for (const tx of batch.transactions) {
    if (!validateCompletionTransaction(tx)) return false;
  }
  
  // Validate all transactions are from same user
  const userPubKey = batch.transactions[0].userPubKey;
  if (!batch.transactions.every(tx => tx.userPubKey === userPubKey)) return false;
  if (batch.userPubKey !== userPubKey) return false;
  
  // Validate batch signature format
  const signatureRegex = /^[a-fA-F0-9]{128}$/;
  if (!signatureRegex.test(batch.batchSignature)) return false;
  
  // Validate batch ID format (32 hex chars)
  const batchIdRegex = /^[a-fA-F0-9]{32}$/;
  if (!batchIdRegex.test(batch.batchId)) return false;
  
  return true;
}

// In-memory storage for local preparation
export class TransactionStore {
  private transactions: CompletionTransaction[] = [];
  private batches: TransactionBatch[] = [];
  
  addTransaction(tx: CompletionTransaction): void {
    if (!validateCompletionTransaction(tx)) {
      throw new Error('Invalid completion transaction');
    }
    this.transactions.push(tx);
  }
  
  addBatch(batch: TransactionBatch): void {
    if (!validateTransactionBatch(batch)) {
      throw new Error('Invalid transaction batch');
    }
    this.batches.push(batch);
  }
  
  getTransactions(): CompletionTransaction[] {
    return [...this.transactions];
  }
  
  getBatches(): TransactionBatch[] {
    return [...this.batches];
  }
  
  clear(): void {
    this.transactions = [];
    this.batches = [];
  }
  
  getTransactionCount(): number {
    return this.transactions.length;
  }
  
  getBatchCount(): number {
    return this.batches.length;
  }
} 