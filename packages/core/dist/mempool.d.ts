import { type TransactionBatch } from './transaction/index';
import type { CompletionTransaction } from './types/index.js';
export interface ActivityData {
    id: string;
    title: string;
    unitId: string;
    activities: Activity[];
}
export interface Activity {
    id: string;
    type: string;
    title: string;
    contribution: number;
}
export interface MempoolEntry {
    transaction: CompletionTransaction;
    points: number;
    timestamp: number;
}
/**
 * Find activity by question ID across all lessons
 */
export declare function findActivityByQuestionId(questionId: string): Activity | null;
/**
 * Calculate points for a completed question based on activity contribution
 */
export declare function calculatePoints(questionId: string, questionType: 'MCQ' | 'FRQ'): number;
/**
 * Mempool class for managing completion transactions and mining eligibility
 */
export declare class Mempool {
    private entries;
    private readonly userPubKey;
    private readonly miningThreshold;
    constructor(userPubKey: string, miningThreshold?: number);
    /**
     * Add a completion transaction to the mempool
     */
    addTransaction(transaction: CompletionTransaction): void;
    /**
     * Get total accumulated points
     */
    getTotalPoints(): number;
    /**
     * Get number of transactions in mempool
     */
    getTransactionCount(): number;
    /**
     * Check if user is eligible for mining
     */
    isMiningEligible(): boolean;
    /**
     * Prepare transaction batch for mining (if eligible)
     */
    prepareBatch(): TransactionBatch | null;
    /**
     * Clear all transactions from mempool (after successful mining)
     */
    clear(): void;
    /**
     * Get all mempool entries (for debugging/UI)
     */
    getEntries(): MempoolEntry[];
    /**
     * Get mining threshold
     */
    getMiningThreshold(): number;
    /**
     * Get user public key
     */
    getUserPubKey(): string;
}
/**
 * Factory function to create a mempool instance
 */
export declare function createMempool(userPubKey: string, miningThreshold?: number): Mempool;
/**
 * Get lessons data (placeholder for real implementation)
 */
export declare function getLessonsData(): ActivityData[];
//# sourceMappingURL=mempool.d.ts.map