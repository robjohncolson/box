import type { PrivateKey } from './types/index.js';
export interface CompletionTransaction {
    type: 'completion';
    questionId: string;
    answerHash?: string;
    answerText?: string;
    userPubKey: string;
    timestamp: number;
    signature: string;
}
export interface TransactionBatch {
    transactions: CompletionTransaction[];
    batchId: string;
    userPubKey: string;
    batchSignature: string;
    timestamp: number;
}
export interface MCQCompletionData {
    questionId: string;
    selectedOption: string;
}
export interface FRQCompletionData {
    questionId: string;
    responseText: string;
}
export declare function isMCQTransaction(tx: CompletionTransaction): boolean;
export declare function isFRQTransaction(tx: CompletionTransaction): boolean;
export declare function validateMCQTransaction(tx: CompletionTransaction): boolean;
export declare function validateFRQTransaction(tx: CompletionTransaction): boolean;
export declare function hashMCQOption(option: string): string;
export declare function createMCQCompletionTransaction(data: MCQCompletionData, privateKey: PrivateKey): CompletionTransaction;
export declare function createFRQCompletionTransaction(data: FRQCompletionData, privateKey: PrivateKey): CompletionTransaction;
export declare function validateCompletionTransaction(tx: CompletionTransaction): boolean;
export declare function createTransactionBatch(transactions: CompletionTransaction[], privateKey: PrivateKey): TransactionBatch;
export declare function validateTransactionBatch(batch: TransactionBatch): boolean;
export declare class TransactionStore {
    private transactions;
    private batches;
    addTransaction(tx: CompletionTransaction): void;
    addBatch(batch: TransactionBatch): void;
    getTransactions(): CompletionTransaction[];
    getBatches(): TransactionBatch[];
    clear(): void;
    getTransactionCount(): number;
    getBatchCount(): number;
}
//# sourceMappingURL=tx.d.ts.map