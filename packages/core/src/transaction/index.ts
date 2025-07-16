import * as secp256k1 from '@noble/secp256k1';
import { hash256 } from '../crypto/hashing.js';
import type { Transaction, CompletionTransaction, PrivateKey, TransactionBatch } from '../types/index.js';

// Re-export the Transaction type for convenience
export type { Transaction, CompletionTransaction, TransactionBatch } from '../types/index.js';

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
 * Create and sign a new transaction
 */
export function createTransaction(privateKey: PrivateKey, payload: any): Transaction {
  // Derive the public key from the private key
  const publicKey = secp256k1.getPublicKey(privateKey.bytes);
  const publicKeyHex = secp256k1.etc.bytesToHex(publicKey);
  
  // Create the data that will be signed
  const signingData = {
    publicKey: publicKeyHex,
    payload
  };
  
  const signingString = deterministicStringify(signingData);
  const signingBytes = new TextEncoder().encode(signingString);
  const hash = hash256(signingBytes);
  
  // Sign the hash
  const signature = secp256k1.sign(hash, privateKey.bytes);
  
  // Create transaction ID from the hash
  const id = secp256k1.etc.bytesToHex(hash);
  
  return {
    id,
    publicKey: publicKeyHex,
    signature: signature.toCompactHex(),
    payload,
  };
}

/**
 * Verify a transaction's signature and integrity
 */
export function verifyTransaction(transaction: Transaction): boolean {
  try {
    const { id, signature, payload, publicKey } = transaction;
    
    // Recreate the data that should have been signed
    const signingData = {
      publicKey,
      payload
    };
    
    const signingString = deterministicStringify(signingData);
    const signingBytes = new TextEncoder().encode(signingString);
    const hash = hash256(signingBytes);
    
    // Verify the transaction ID matches the hash
    const expectedId = secp256k1.etc.bytesToHex(hash);
    if (id !== expectedId) {
      return false;
    }
    
    // Verify the signature
    const sig = secp256k1.Signature.fromCompact(signature);
    const pubKeyBytes = secp256k1.etc.hexToBytes(publicKey);
    
    return secp256k1.verify(sig, hash, pubKeyBytes);
  } catch (error) {
    return false;
  }
}

export interface MCQCompletionData {
  questionId: string;
  selectedOption: string;
}

export interface FRQCompletionData {
  questionId: string;
  responseText: string;
}

export function validateMCQTransaction(tx: CompletionTransaction): boolean {
  if (tx.answerText) return false;
  if (!tx.answerHash) return false;
  const hashRegex = /^[a-fA-F0-9]{64}$/;
  return hashRegex.test(tx.answerHash);
}

export function validateFRQTransaction(tx: CompletionTransaction): boolean {
  if (tx.answerHash) return false;
  if (!tx.answerText) return false;
  return typeof tx.answerText === 'string' && tx.answerText.trim().length > 0;
}

export function hashMCQOption(option: string): string {
  const bytes = new TextEncoder().encode(option);
  return secp256k1.etc.bytesToHex(hash256(bytes));
}

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
  
  const signingString = deterministicStringify(transaction);
  const signingBytes = new TextEncoder().encode(signingString);
  const messageHash = hash256(signingBytes);
  const signature = secp256k1.sign(messageHash, privateKey.bytes);
  const signatureHex = signature.toCompactHex();
  
  return {
    ...transaction,
    signature: signatureHex
  };
}

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
  
  const signingString = deterministicStringify(transaction);
  const signingBytes = new TextEncoder().encode(signingString);
  const messageHash = hash256(signingBytes);
  const signature = secp256k1.sign(messageHash, privateKey.bytes);
  const signatureHex = signature.toCompactHex();
  
  return {
    ...transaction,
    signature: signatureHex
  };
}

export function validateCompletionTransaction(tx: CompletionTransaction): boolean {
  // Basic structure validation
  if (tx.type !== 'completion') return false;
  if (!tx.questionId || typeof tx.questionId !== 'string') return false;
  if (!tx.userPubKey || typeof tx.userPubKey !== 'string') return false;
  if (!tx.timestamp || typeof tx.timestamp !== 'number') return false;
  if (!tx.signature || typeof tx.signature !== 'string') return false;
  
  // Validate timestamp is reasonable
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  if (tx.timestamp > now || tx.timestamp < now - dayMs) return false;
  
  // Validate fields
  if (tx.answerHash && tx.answerText) return false;
  if (!tx.answerHash && !tx.answerText) return false;
  
  if (tx.answerHash && !validateMCQTransaction(tx)) return false;
  if (tx.answerText && !validateFRQTransaction(tx)) return false;
  
  // Verify signature
  const transactionWithoutSig: Omit<CompletionTransaction, 'signature'> = {
    type: tx.type,
    questionId: tx.questionId,
    userPubKey: tx.userPubKey,
    ...(tx.answerHash !== undefined ? { answerHash: tx.answerHash } : {}),
    ...(tx.answerText !== undefined ? { answerText: tx.answerText } : {}),
    timestamp: tx.timestamp
  };
  const signingString = deterministicStringify(transactionWithoutSig);
  const signingBytes = new TextEncoder().encode(signingString);
  const messageHash = hash256(signingBytes);
  const sig = secp256k1.Signature.fromCompact(tx.signature);
  const pubKeyBytes = secp256k1.etc.hexToBytes(tx.userPubKey);
  return secp256k1.verify(sig, messageHash, pubKeyBytes);
}

export function isMCQTransaction(tx: CompletionTransaction): boolean {
  return !!tx.answerHash && !tx.answerText;
}

export function isFRQTransaction(tx: CompletionTransaction): boolean {
  return !!tx.answerText && !tx.answerHash;
}

export function createTransactionBatch(transactions: CompletionTransaction[], privateKey: PrivateKey): TransactionBatch {
  if (transactions.length === 0) throw new Error('Batch must contain at least one transaction');
  if (transactions.length >10) throw new Error('Batch cannot contain more than 10 transactions');
  const userPubKey = transactions[0].userPubKey;
  for (const tx of transactions) {
    if (tx.userPubKey !== userPubKey) throw new Error('All transactions in batch must be from same user');
    if (!validateCompletionTransaction(tx)) throw new Error('Invalid transaction in batch');
  }
  const timestamp = Date.now();
  const batchData = {
    transactions,
    userPubKey,
    timestamp
  };
  const signingString = deterministicStringify(batchData);
  const signingBytes = new TextEncoder().encode(signingString);
  const hash = hash256(signingBytes);
  const signature = secp256k1.sign(hash, privateKey.bytes);
  const batchId = secp256k1.etc.bytesToHex(hash);
  return {
    transactions,
    batchId,
    userPubKey,
    batchSignature: signature.toCompactHex(),
    timestamp
  };
}

export function validateTransactionBatch(batch: TransactionBatch): boolean {
  if (batch.transactions.length === 0) return false;
  if (batch.transactions.length >10) return false;
  const user = batch.userPubKey;
  for (const tx of batch.transactions) {
    if (tx.userPubKey !== user) return false;
    if (!validateCompletionTransaction(tx)) return false;
  }
  // Verify batch signature
  const batchWithoutSig = {
    transactions: batch.transactions,
    userPubKey: batch.userPubKey,
    timestamp: batch.timestamp
  };
  const signingString = deterministicStringify(batchWithoutSig);
  const signingBytes = new TextEncoder().encode(signingString);
  const messageHash = hash256(signingBytes);
  const expectedBatchId = secp256k1.etc.bytesToHex(messageHash);
  if (batch.batchId !== expectedBatchId) return false;
  const sig = secp256k1.Signature.fromCompact(batch.batchSignature);
  const pubKeyBytes = secp256k1.etc.hexToBytes(batch.userPubKey);
  return secp256k1.verify(sig, messageHash, pubKeyBytes);
}

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
  getTransactionCount(): number {
    return this.transactions.length;
  }
  getBatchCount(): number {
    return this.batches.length;
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
} 