import type { PrivateKey, QuestionDistribution } from '../types/index.js';
import type { Attestation } from '../types/index.js';
/**
 * Parameters for creating an attestation
 */
export interface CreateAttestationParams {
    privateKey: PrivateKey;
    puzzleId: string;
    attesterAnswer: string;
}
/**
 * Create a cryptographically signed attestation for a puzzle answer
 */
export declare function createAttestation(params: CreateAttestationParams): Attestation;
/**
 * Verify a cryptographic attestation
 */
export declare function verifyAttestation(attestation: Attestation): boolean;
/**
 * Update distribution with a new attestation
 */
export declare function updateDistribution(existing: QuestionDistribution | null, answer: string | number, questionId?: string): QuestionDistribution;
/**
 * Calculate convergence score for a distribution
 */
export declare function calculateConvergence(distribution: QuestionDistribution): number;
/**
 * Check if distribution meets quorum requirements
 */
export declare function checkQuorum(distribution: QuestionDistribution): boolean;
//# sourceMappingURL=index.d.ts.map