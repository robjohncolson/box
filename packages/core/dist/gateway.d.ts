/**
 * Initializes the gateway by providing it with the live BlockchainService instance.
 * This must be called from the main application component.
 * @param {any} service - The live instance of the BlockchainService.
 */
export declare const initializeGateway: (service: any) => void;
/**
 * Fetches the entire curriculum structure.
 * In the future, this could be fetched from a decentralized source.
 * For now, it returns the hardcoded data instantly.
 */
export declare const getCurriculumData: () => Promise<any[]>;
/**
 * Creates a real transaction on the blockchain via the BlockchainService.
 * This version explicitly maps parameters to the payload to prevent naming conflicts.
 */
export declare const saveCompletion: (unitId: string, itemId: string, itemType: string) => Promise<void>;
interface MockCompletion {
    completed_at: string;
    item_type: 'video' | 'quiz';
}
interface MockUser {
    id: number;
    username: string;
}
interface MockQuotaCount {
    user_id: number;
    quota_count: number;
}
export declare const getCompletionTimestamps: () => Promise<MockCompletion[]>;
export declare const getAllUsers: () => Promise<MockUser[]>;
export declare const getPeerQuotaCounts: () => Promise<MockQuotaCount[]>;
export declare const getCurrentUserId: () => Promise<number>;
/**
 * Gets the set of completed activity IDs from the blockchain for the current user.
 * This is used to rehydrate the UI state on startup.
 * @returns {Promise<Set<string>>} A promise resolving to a set of completed activity IDs.
 */
export declare const getOnChainCompletions: () => Promise<Set<string>>;
/**
 * Returns the Grok AI tutor prompt for guided learning sessions.
 * This static content provides comprehensive instructions for AI-assisted study.
 */
export declare const getGrokPrompt: () => string;
export {};
//# sourceMappingURL=gateway.d.ts.map