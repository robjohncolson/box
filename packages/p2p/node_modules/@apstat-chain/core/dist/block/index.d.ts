import { Mempool } from '../mempool.js';
import type { PrivateKey, Block, CompletionTransaction, AttestationTransaction } from '../types/index.js';
export type { Block, BlockHeader, BlockBody } from '../types/index.js';
/**
 * Calculate merkle root from array of transactions and attestations
 */
export declare function calculateMerkleRoot(items: (CompletionTransaction | AttestationTransaction)[]): string;
/**
 * Calculate block size in bytes
 */
export declare function getBlockSize(block: Block): number;
/**
 * Create a new block with header and body structure
 */
export declare function createBlock({ privateKey, previousHash, transactions, attestations, blockHeight, nonce }: {
    privateKey: PrivateKey;
    previousHash: string;
    transactions: CompletionTransaction[];
    attestations: AttestationTransaction[];
    blockHeight: number;
    nonce?: number;
}): Block;
/**
 * Mine a new block from mempool and attestations
 */
export declare function mineBlock(mempool: Mempool, attestations: AttestationTransaction[], previousHash: string, blockHeight: number): Block | null;
/**
 * Verify a block's integrity and validity
 */
export declare function verifyBlock(block: Block): boolean;
/**
 * Local chain array for block storage
 */
export declare class LocalChain {
    private blocks;
    constructor();
    /**
     * Add a block to the chain
     */
    addBlock(block: Block): boolean;
    /**
     * Get all blocks in the chain
     */
    getBlocks(): Block[];
    /**
     * Get the latest block
     */
    getLatestBlock(): Block | null;
    /**
     * Get block by ID
     */
    getBlockById(blockId: string): Block | null;
    /**
     * Get chain length
     */
    getLength(): number;
    /**
     * Clear the chain
     */
    clear(): void;
}
//# sourceMappingURL=index.d.ts.map