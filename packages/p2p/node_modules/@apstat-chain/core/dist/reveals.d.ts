import type { PrivateKey, AttestationTransaction } from './types/index.js';
export interface APRevealTransaction {
    type: 'ap-reveal';
    questionId: string;
    officialAnswerHash: string;
    convergenceAtReveal: number;
    signature: string;
    timestamp: number;
}
export interface ReputationMetrics {
    userPubKey: string;
    totalAttestations: number;
    consistencyScore: number;
    flipFlopCount: number;
    accuracyScore: number;
    lastUpdated: number;
}
export interface AttestationHistory {
    questionId: string;
    userPubKey: string;
    attestationHistory: Array<{
        answerHash: string;
        timestamp: number;
        blockHeight: number;
    }>;
}
export interface TeacherControls {
    canTriggerReveal: boolean;
    viewReputationMetrics: boolean;
    moderateAttestations: boolean;
}
/**
 * Utility function to hash a message string
 */
export declare function hashMessage(message: string): string;
/**
 * Check if convergence threshold is met for reveal
 */
export declare function isRevealThresholdMet(convergenceScore: number): boolean;
/**
 * Trigger an AP reveal transaction when convergence threshold is met
 */
export declare function triggerAPReveal(questionId: string, officialAnswer: string, teacherKey: PrivateKey, convergenceScore: number): Promise<APRevealTransaction>;
/**
 * Calculate consistency score based on attestation history
 */
export declare function calculateConsistencyScore(history: AttestationHistory): number;
/**
 * Detect if a user is flip-flopping (changing their answer)
 */
export declare function detectFlipFlop(userPubKey: string, questionId: string, newAnswer: string): boolean;
/**
 * Update reputation metrics for a user based on new attestation
 */
export declare function updateReputation(userPubKey: string, attestation: AttestationTransaction): ReputationMetrics;
/**
 * Get reputation metrics for a user
 */
export declare function getReputationMetrics(userPubKey: string): ReputationMetrics | undefined;
/**
 * Get all reputation metrics (for leaderboard)
 */
export declare function getAllReputationMetrics(): ReputationMetrics[];
/**
 * Check if a user has teacher privileges
 */
export declare function hasTeacherPrivileges(_userPubKey: string): boolean;
/**
 * Get teacher controls for a user
 */
export declare function getTeacherControls(userPubKey: string): TeacherControls;
/**
 * Get AP reveal for a question
 */
export declare function getAPReveal(questionId: string): APRevealTransaction | undefined;
/**
 * Get all AP reveals
 */
export declare function getAllAPReveals(): APRevealTransaction[];
/**
 * Reset all data (for testing purposes)
 */
export declare function resetRevealsData(): void;
//# sourceMappingURL=reveals.d.ts.map