import { createBlock, verifyBlock } from '../block/index.js';
import { keyPairFromMnemonic } from '../crypto/keys.js';
/**
 * Blockchain class that manages an ordered chain of blocks
 */
export class Blockchain {
    chain;
    constructor() {
        this.chain = [this.createGenesisBlock()];
    }
    /**
     * Creates the genesis block for the blockchain
     */
    createGenesisBlock() {
        // Use a deterministic key pair for the genesis block
        const genesisKeyPair = keyPairFromMnemonic('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
        return createBlock({
            privateKey: genesisKeyPair.privateKey,
            previousHash: '0'.repeat(64),
            transactions: [],
            attestations: [],
            blockHeight: 0
        });
    }
    /**
     * Get the latest block in the chain
     */
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }
    /**
     * Get the entire blockchain
     */
    getChain() {
        return [...this.chain]; // Return a copy to prevent external mutation
    }
    /**
     * Add a new block to the chain with validation
     */
    addBlock(newBlock) {
        // Validate the block's signature and integrity
        if (!verifyBlock(newBlock)) {
            throw new Error('Invalid block signature');
        }
        // Validate that the previousHash matches the latest block's ID
        const latestBlock = this.getLatestBlock();
        if (newBlock.header.previousHash !== latestBlock.blockId) {
            throw new Error('Previous hash does not match');
        }
        // If all validations pass, add the block to the chain
        this.chain.push(newBlock);
    }
    /**
     * Replace the current chain with a new chain if it's valid and longer
     * @param newChain The new chain to potentially replace the current one
     * @returns true if the chain was replaced, false otherwise
     */
    replaceChain(newChain) {
        // Don't replace if the new chain is not longer than the current chain
        if (newChain.length <= this.chain.length) {
            return false;
        }
        // Don't replace if the new chain is not valid
        if (!Blockchain.isValidChain(newChain)) {
            return false;
        }
        // Replace the chain and return true
        this.chain = [...newChain];
        return true;
    }
    /**
     * Validate an entire blockchain
     */
    static isValidChain(chain) {
        // Chain must not be empty
        if (chain.length === 0) {
            return false;
        }
        // Validate genesis block
        const genesisBlock = chain[0];
        if (genesisBlock.header.previousHash !== '0'.repeat(64)) {
            return false;
        }
        // Validate each block's signature and integrity
        for (const block of chain) {
            if (!verifyBlock(block)) {
                return false;
            }
        }
        // Validate chain links (previousHash should match previous block's ID)
        for (let i = 1; i < chain.length; i++) {
            const currentBlock = chain[i];
            const previousBlock = chain[i - 1];
            if (currentBlock.header.previousHash !== previousBlock.blockId) {
                return false;
            }
        }
        return true;
    }
}
// New Chain class for local persistence and leaderboard
import { verifyBlock as verifyNewBlock } from '../block/index.js';
const DB_NAME = 'APStatsChain';
const DB_VERSION = 1;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
/**
 * Chain class with IndexedDB persistence and leaderboard functionality
 */
export class Chain {
    storage;
    db = null;
    initialized = false;
    constructor() {
        this.storage = {
            blocks: [],
            leaderboard: [],
            metadata: {
                chainHeight: 0,
                lastUpdate: 0,
                totalTransactions: 0
            }
        };
        this.initializeIndexedDB();
    }
    /**
     * Initialize IndexedDB with proper schema
     */
    async initializeIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'));
            };
            request.onsuccess = () => {
                this.db = request.result;
                this.initialized = true;
                this.loadFromStorage().then(() => resolve());
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // Create blocks store
                const blocksStore = db.createObjectStore('blocks', { keyPath: 'blockId' });
                blocksStore.createIndex('blockHeight', 'header.blockHeight');
                blocksStore.createIndex('timestamp', 'header.timestamp');
                blocksStore.createIndex('producerPubKey', 'producerPubKey');
                // Create leaderboard store
                const leaderboardStore = db.createObjectStore('leaderboard', { keyPath: 'pubKey' });
                leaderboardStore.createIndex('rank', 'rank');
                leaderboardStore.createIndex('totalPoints', 'totalPoints');
                leaderboardStore.createIndex('reputationScore', 'reputationScore');
                // Create metadata store
                db.createObjectStore('metadata', { keyPath: 'key' });
            };
        });
    }
    /**
     * Load data from IndexedDB storage
     */
    async loadFromStorage() {
        if (!this.db)
            return;
        try {
            const transaction = this.db.transaction(['blocks', 'leaderboard', 'metadata'], 'readonly');
            // Load blocks
            const blocksRequest = transaction.objectStore('blocks').getAll();
            const blocksResult = await new Promise((resolve, reject) => {
                blocksRequest.onsuccess = () => resolve(blocksRequest.result);
                blocksRequest.onerror = () => reject(blocksRequest.error);
            });
            // Load leaderboard
            const leaderboardRequest = transaction.objectStore('leaderboard').getAll();
            const leaderboardResult = await new Promise((resolve, reject) => {
                leaderboardRequest.onsuccess = () => resolve(leaderboardRequest.result);
                leaderboardRequest.onerror = () => reject(leaderboardRequest.error);
            });
            // Load metadata
            const metadataRequest = transaction.objectStore('metadata').get('chain');
            const metadataResult = await new Promise((resolve, reject) => {
                metadataRequest.onsuccess = () => resolve(metadataRequest.result);
                metadataRequest.onerror = () => reject(metadataRequest.error);
            });
            // Update storage
            this.storage.blocks = blocksResult.sort((a, b) => a.header.blockHeight - b.header.blockHeight);
            this.storage.leaderboard = leaderboardResult.sort((a, b) => a.rank - b.rank);
            this.storage.metadata = metadataResult?.value || this.storage.metadata;
        }
        catch (error) {
            console.error('Error loading from storage:', error);
        }
    }
    /**
     * Persist block to IndexedDB
     */
    async persistBlock(block) {
        if (!this.db)
            throw new Error('Database not initialized');
        const transaction = this.db.transaction(['blocks'], 'readwrite');
        const store = transaction.objectStore('blocks');
        return new Promise((resolve, reject) => {
            const request = store.add(block);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    /**
     * Update cached leaderboard in IndexedDB
     */
    async cacheLeaderboard(leaderboard) {
        if (!this.db)
            return;
        const transaction = this.db.transaction(['leaderboard'], 'readwrite');
        const store = transaction.objectStore('leaderboard');
        // Clear existing leaderboard
        await new Promise((resolve, reject) => {
            const clearRequest = store.clear();
            clearRequest.onsuccess = () => resolve();
            clearRequest.onerror = () => reject(clearRequest.error);
        });
        // Add new leaderboard entries
        for (const entry of leaderboard) {
            await new Promise((resolve, reject) => {
                const request = store.add(entry);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
    }
    /**
     * Update metadata in IndexedDB
     */
    async updateMetadata() {
        if (!this.db)
            return;
        const transaction = this.db.transaction(['metadata'], 'readwrite');
        const store = transaction.objectStore('metadata');
        return new Promise((resolve, reject) => {
            const request = store.put({
                key: 'chain',
                value: this.storage.metadata
            });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    /**
     * Validate chain continuity
     */
    validateChainContinuity(block) {
        if (this.storage.blocks.length === 0) {
            // First block after genesis
            return block.header.blockHeight === 1;
        }
        const lastBlock = this.storage.blocks[this.storage.blocks.length - 1];
        // Check block height is sequential
        if (block.header.blockHeight !== lastBlock.header.blockHeight + 1) {
            return false;
        }
        // Check previous hash matches
        if (block.header.previousHash !== lastBlock.blockId) {
            return false;
        }
        return true;
    }
    /**
     * Check if leaderboard cache is valid
     */
    isLeaderboardCacheValid() {
        const now = Date.now();
        return (now - this.storage.metadata.lastUpdate) < CACHE_TTL;
    }
    /**
     * Calculate points for a completion transaction
     */
    getTransactionPoints() {
        // Base points for completing a question
        // In a real implementation, this would look up points from lesson data
        return 10;
    }
    /**
     * Get last activity timestamp for a user
     */
    getLastActivity(pubKey, chain) {
        let lastActivity = 0;
        for (const block of chain) {
            // Check transactions
            for (const transaction of block.body.transactions) {
                if (transaction.userPubKey === pubKey) {
                    lastActivity = Math.max(lastActivity, transaction.timestamp);
                }
            }
            // Check attestations
            for (const attestation of block.body.attestations) {
                if (attestation.attesterPubKey === pubKey) {
                    lastActivity = Math.max(lastActivity, attestation.timestamp);
                }
            }
        }
        return lastActivity;
    }
    /**
     * Calculate consistency factor for reputation scoring
     */
    calculateConsistencyFactor(stats) {
        // Simple consistency factor based on completion rate
        // In a real implementation, this would consider time gaps, patterns, etc.
        const baseConsistency = Math.min(stats.completions / 100, 1.0);
        const attestationConsistency = stats.attestations > 0 ?
            Math.min(stats.attestations / 50, 1.0) : 0;
        return (baseConsistency + attestationConsistency) / 2;
    }
    /**
     * Calculate reputation score from user stats
     */
    calculateReputationScore(stats) {
        const totalLessons = 89; // From AP Stats curriculum
        // Base reputation from completion consistency
        const completionRate = stats.completions / totalLessons;
        // Attestation quality factor
        const attestationQuality = stats.attestations > 0 ?
            stats.convergenceHits / stats.attestations : 0;
        // Consistency over time (prevents gaming)
        const consistencyFactor = this.calculateConsistencyFactor(stats);
        // Weighted reputation score (0-100)
        const reputation = Math.min(100, (completionRate * 40) +
            (attestationQuality * 35) +
            (consistencyFactor * 25));
        return Math.round(reputation);
    }
    /**
     * Calculate leaderboard from chain blocks
     */
    calculateLeaderboard(chain) {
        const userStats = new Map();
        // Aggregate completion transactions
        for (const block of chain) {
            for (const transaction of block.body.transactions) {
                const stats = userStats.get(transaction.userPubKey) || {
                    totalPoints: 0,
                    completions: 0,
                    attestations: 0,
                    convergenceHits: 0
                };
                // Add points from lesson contributions
                stats.totalPoints += this.getTransactionPoints();
                stats.completions += 1;
                userStats.set(transaction.userPubKey, stats);
            }
            // Process attestation quality
            for (const attestation of block.body.attestations) {
                const stats = userStats.get(attestation.attesterPubKey) || {
                    totalPoints: 0,
                    completions: 0,
                    attestations: 0,
                    convergenceHits: 0
                };
                stats.attestations += 1;
                // Reward convergence participation
                if (block.body.quorumData.convergenceScore > 70) {
                    stats.convergenceHits += 1;
                }
                userStats.set(attestation.attesterPubKey, stats);
            }
        }
        // Convert to leaderboard entries
        const entries = Array.from(userStats.entries()).map(([pubKey, stats]) => ({
            pubKey,
            totalPoints: stats.totalPoints,
            reputationScore: this.calculateReputationScore(stats),
            convergenceRate: stats.attestations > 0 ? stats.convergenceHits / stats.attestations : 0,
            lastActivity: this.getLastActivity(pubKey, chain),
            rank: 0 // Will be calculated after sorting
        }));
        // Sort by total points (descending) and assign ranks
        entries.sort((a, b) => b.totalPoints - a.totalPoints);
        entries.forEach((entry, index) => {
            entry.rank = index + 1;
        });
        return entries;
    }
    /**
     * Append a new block to the chain with persistence
     */
    async appendBlock(block) {
        if (!this.initialized) {
            throw new Error('Chain not initialized');
        }
        // Validate block integrity
        if (!verifyNewBlock(block)) {
            return false;
        }
        // Validate chain continuity
        if (!this.validateChainContinuity(block)) {
            return false;
        }
        try {
            // Persist to IndexedDB
            await this.persistBlock(block);
            // Update in-memory storage
            this.storage.blocks.push(block);
            this.storage.metadata.chainHeight = block.header.blockHeight;
            this.storage.metadata.totalTransactions += block.body.transactions.length;
            // Update cached leaderboard
            await this.updateLeaderboard();
            // Update metadata
            await this.updateMetadata();
            return true;
        }
        catch (error) {
            console.error('Error appending block:', error);
            return false;
        }
    }
    /**
     * Update leaderboard cache
     */
    async updateLeaderboard() {
        const leaderboard = this.calculateLeaderboard(this.storage.blocks);
        await this.cacheLeaderboard(leaderboard);
        this.storage.leaderboard = leaderboard;
        this.storage.metadata.lastUpdate = Date.now();
    }
    /**
     * Get current leaderboard with caching
     */
    async getLeaderboard() {
        if (!this.initialized) {
            throw new Error('Chain not initialized');
        }
        // Check cache freshness
        if (this.isLeaderboardCacheValid() && this.storage.leaderboard.length > 0) {
            return this.storage.leaderboard;
        }
        // Recalculate from chain
        const leaderboard = this.calculateLeaderboard(this.storage.blocks);
        // Update cache
        await this.cacheLeaderboard(leaderboard);
        this.storage.leaderboard = leaderboard;
        this.storage.metadata.lastUpdate = Date.now();
        return leaderboard;
    }
    /**
     * Get user's individual stats
     */
    async getUserStats(pubKey) {
        const leaderboard = await this.getLeaderboard();
        return leaderboard.find(entry => entry.pubKey === pubKey) || null;
    }
    /**
     * Get chain metadata
     */
    getMetadata() {
        return { ...this.storage.metadata };
    }
    /**
     * Get all blocks in the chain
     */
    getBlocks() {
        return [...this.storage.blocks];
    }
    /**
     * Get the latest block
     */
    getLatestBlock() {
        if (this.storage.blocks.length === 0)
            return null;
        return this.storage.blocks[this.storage.blocks.length - 1];
    }
    /**
     * Clear all data (for testing)
     */
    async clear() {
        if (!this.db)
            return;
        const transaction = this.db.transaction(['blocks', 'leaderboard', 'metadata'], 'readwrite');
        await Promise.all([
            new Promise((resolve, reject) => {
                const request = transaction.objectStore('blocks').clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            }),
            new Promise((resolve, reject) => {
                const request = transaction.objectStore('leaderboard').clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            }),
            new Promise((resolve, reject) => {
                const request = transaction.objectStore('metadata').clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            })
        ]);
        // Reset in-memory storage
        this.storage = {
            blocks: [],
            leaderboard: [],
            metadata: {
                chainHeight: 0,
                lastUpdate: 0,
                totalTransactions: 0
            }
        };
    }
}
//# sourceMappingURL=index.js.map