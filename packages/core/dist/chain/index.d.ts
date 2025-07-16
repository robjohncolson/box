import { type Block } from '../block/index.js';
/**
 * Blockchain class that manages an ordered chain of blocks
 */
export declare class Blockchain {
    private chain;
    constructor();
    /**
     * Creates the genesis block for the blockchain
     */
    private createGenesisBlock;
    /**
     * Get the latest block in the chain
     */
    getLatestBlock(): Block;
    /**
     * Get the entire blockchain
     */
    getChain(): readonly Block[];
    /**
     * Add a new block to the chain with validation
     */
    addBlock(newBlock: Block): void;
    /**
     * Replace the current chain with a new chain if it's valid and longer
     * @param newChain The new chain to potentially replace the current one
     * @returns true if the chain was replaced, false otherwise
     */
    replaceChain(newChain: readonly Block[]): boolean;
    /**
     * Validate an entire blockchain
     */
    static isValidChain(chain: readonly Block[]): boolean;
}
import { type Block as NewBlock } from '../block/index.js';
interface LeaderboardEntry {
    pubKey: string;
    totalPoints: number;
    reputationScore: number;
    convergenceRate: number;
    lastActivity: number;
    rank: number;
}
/**
 * Chain class with IndexedDB persistence and leaderboard functionality
 */
export declare class Chain {
    private storage;
    private db;
    private initialized;
    constructor();
    /**
     * Initialize IndexedDB with proper schema
     */
    private initializeIndexedDB;
    /**
     * Load data from IndexedDB storage
     */
    private loadFromStorage;
    /**
     * Persist block to IndexedDB
     */
    private persistBlock;
    /**
     * Update cached leaderboard in IndexedDB
     */
    private cacheLeaderboard;
    /**
     * Update metadata in IndexedDB
     */
    private updateMetadata;
    /**
     * Validate chain continuity
     */
    private validateChainContinuity;
    /**
     * Check if leaderboard cache is valid
     */
    private isLeaderboardCacheValid;
    /**
     * Calculate points for a completion transaction
     */
    private getTransactionPoints;
    /**
     * Get last activity timestamp for a user
     */
    private getLastActivity;
    /**
     * Calculate consistency factor for reputation scoring
     */
    private calculateConsistencyFactor;
    /**
     * Calculate reputation score from user stats
     */
    private calculateReputationScore;
    /**
     * Calculate leaderboard from chain blocks
     */
    private calculateLeaderboard;
    /**
     * Append a new block to the chain with persistence
     */
    appendBlock(block: NewBlock): Promise<boolean>;
    /**
     * Update leaderboard cache
     */
    private updateLeaderboard;
    /**
     * Get current leaderboard with caching
     */
    getLeaderboard(): Promise<LeaderboardEntry[]>;
    /**
     * Get user's individual stats
     */
    getUserStats(pubKey: string): Promise<LeaderboardEntry | null>;
    /**
     * Get chain metadata
     */
    getMetadata(): {
        chainHeight: number;
        lastUpdate: number;
        totalTransactions: number;
    };
    /**
     * Get all blocks in the chain
     */
    getBlocks(): NewBlock[];
    /**
     * Get the latest block
     */
    getLatestBlock(): NewBlock | null;
    /**
     * Clear all data (for testing)
     */
    clear(): Promise<void>;
}
export {};
//# sourceMappingURL=index.d.ts.map