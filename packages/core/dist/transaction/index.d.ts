import type { Transaction, CompletionTransaction, PrivateKey, TransactionBatch } from '../types/index.js';
export type { Transaction, CompletionTransaction, TransactionBatch } from '../types/index.js';
/**
 * Create and sign a new transaction
 */
export declare function createTransaction(privateKey: PrivateKey, payload: any): Transaction;
/**
 * Verify a transaction's signature and integrity
 */
export declare function verifyTransaction(transaction: Transaction): boolean;
export interface MCQCompletionData {
    questionId: string;
    selectedOption: string;
}
export interface FRQCompletionData {
    questionId: string;
    responseText: string;
}
export declare function validateMCQTransaction(tx: CompletionTransaction): boolean;
export declare function validateFRQTransaction(tx: CompletionTransaction): boolean;
export declare function hashMCQOption(option: string): string;
export declare function createMCQCompletionTransaction(data: MCQCompletionData, privateKey: PrivateKey): CompletionTransaction;
export declare function createFRQCompletionTransaction(data: FRQCompletionData, privateKey: PrivateKey): CompletionTransaction;
export declare function validateCompletionTransaction(tx: CompletionTransaction): boolean;
export declare function isMCQTransaction(tx: CompletionTransaction): boolean;
export declare function isFRQTransaction(tx: CompletionTransaction): boolean;
export declare function createTransactionBatch(transactions: CompletionTransaction[], privateKey: PrivateKey): TransactionBatch;
export declare function validateTransactionBatch(batch: TransactionBatch): boolean;
export declare class TransactionStore {
    private transactions;
    private batches;
    addTransaction(tx: CompletionTransaction): void;
    addBatch(batch: TransactionBatch): void;
    getTransactionCount(): number;
    getBatchCount(): number;
    getTransactions(): CompletionTransaction[];
    getBatches(): TransactionBatch[];
    clear(): void;
}
//# sourceMappingURL=index.d.ts.map