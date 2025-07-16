import { hash256 } from './crypto/hashing.js';
import { sign } from './crypto/secp256k1.js';
// In-memory storage for prototype (would be replaced with blockchain storage)
const apReveals = new Map();
const reputationMetrics = new Map();
const attestationHistory = new Map();
// Constants
const CONVERGENCE_THRESHOLD = 50; // 50% convergence required for reveal
const MAX_FLIP_FLOP_LIMIT = 3; // Maximum number of answer changes per question
const RAPID_CHANGE_PENALTY_THRESHOLD = 5000; // 5 seconds
/**
 * Utility function to hash a message string
 */
export function hashMessage(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBytes = hash256(data);
    return Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
/**
 * Check if convergence threshold is met for reveal
 */
export function isRevealThresholdMet(convergenceScore) {
    return convergenceScore >= CONVERGENCE_THRESHOLD;
}
/**
 * Trigger an AP reveal transaction when convergence threshold is met
 */
export async function triggerAPReveal(questionId, officialAnswer, teacherKey, convergenceScore) {
    // Check if convergence threshold is met
    if (!isRevealThresholdMet(convergenceScore)) {
        throw new Error('Convergence threshold not met');
    }
    // Check if reveal already exists for this question
    if (apReveals.has(questionId)) {
        throw new Error('AP reveal already exists for this question');
    }
    // Create the reveal transaction
    const officialAnswerHash = hashMessage(officialAnswer);
    const timestamp = Date.now();
    // Create message to sign
    const messageToSign = `${questionId}:${officialAnswerHash}:${convergenceScore}:${timestamp}`;
    const messageHash = hash256(new TextEncoder().encode(messageToSign));
    const signatureObj = sign(messageHash, teacherKey);
    const signature = `${signatureObj.r.toString(16)}:${signatureObj.s.toString(16)}`;
    const reveal = {
        type: 'ap-reveal',
        questionId,
        officialAnswerHash,
        convergenceAtReveal: convergenceScore,
        signature,
        timestamp
    };
    // Store the reveal
    apReveals.set(questionId, reveal);
    return reveal;
}
/**
 * Get attestation history for a user and question
 */
function getAttestationHistory(userPubKey, questionId) {
    const key = `${userPubKey}:${questionId}`;
    return attestationHistory.get(key);
}
/**
 * Update attestation history for a user and question
 */
function updateAttestationHistory(userPubKey, attestation) {
    const key = `${userPubKey}:${attestation.questionId}`;
    let history = attestationHistory.get(key);
    if (!history) {
        history = {
            questionId: attestation.questionId,
            userPubKey,
            attestationHistory: []
        };
    }
    history.attestationHistory.push({
        answerHash: attestation.answerHash || '',
        timestamp: attestation.timestamp,
        blockHeight: history.attestationHistory.length + 1 // Mock block height
    });
    attestationHistory.set(key, history);
}
/**
 * Calculate consistency score based on attestation history
 */
export function calculateConsistencyScore(history) {
    if (history.attestationHistory.length <= 1) {
        return 100; // Perfect consistency for single attestation
    }
    let changes = 0;
    let rapidChanges = 0;
    for (let i = 1; i < history.attestationHistory.length; i++) {
        const current = history.attestationHistory[i];
        const previous = history.attestationHistory[i - 1];
        if (current.answerHash !== previous.answerHash) {
            changes++;
            // Check if change was rapid
            const timeDiff = current.timestamp - previous.timestamp;
            if (timeDiff < RAPID_CHANGE_PENALTY_THRESHOLD) {
                rapidChanges++;
            }
        }
    }
    // Calculate base consistency score
    const penaltyRatio = changes / history.attestationHistory.length;
    const baseScore = 100 - (penaltyRatio * 100);
    // Apply exponential penalty for rapid changes
    const rapidPenalty = rapidChanges * 10;
    const finalScore = Math.max(0, baseScore - rapidPenalty);
    return Math.round(finalScore);
}
/**
 * Detect if a user is flip-flopping (changing their answer)
 */
export function detectFlipFlop(userPubKey, questionId, newAnswer) {
    const history = getAttestationHistory(userPubKey, questionId);
    if (!history || history.attestationHistory.length === 0) {
        return false; // No previous attestation
    }
    const lastAttestation = history.attestationHistory[history.attestationHistory.length - 1];
    const newAnswerHash = hashMessage(newAnswer);
    return lastAttestation.answerHash !== newAnswerHash;
}
/**
 * Update reputation metrics for a user based on new attestation
 */
export function updateReputation(userPubKey, attestation) {
    let reputation = reputationMetrics.get(userPubKey);
    // Initialize reputation if new user
    if (!reputation) {
        reputation = {
            userPubKey,
            totalAttestations: 0,
            consistencyScore: 100,
            flipFlopCount: 0,
            accuracyScore: 0,
            lastUpdated: Date.now()
        };
    }
    // Check for flip-flop
    const isFlipFlop = detectFlipFlop(userPubKey, attestation.questionId, attestation.answerHash || attestation.answerText || '');
    if (isFlipFlop) {
        reputation.flipFlopCount++;
        // Enforce maximum flip-flop limit
        if (reputation.flipFlopCount >= MAX_FLIP_FLOP_LIMIT) {
            throw new Error('Maximum flip-flop limit exceeded');
        }
    }
    // Update attestation history
    updateAttestationHistory(userPubKey, attestation);
    // Recalculate consistency score based on all attestations for this question
    const history = getAttestationHistory(userPubKey, attestation.questionId);
    if (history) {
        const questionConsistency = calculateConsistencyScore(history);
        // Update overall consistency score (weighted average)
        const totalQuestions = attestationHistory.size;
        reputation.consistencyScore = totalQuestions > 0
            ? (reputation.consistencyScore * (totalQuestions - 1) + questionConsistency) / totalQuestions
            : questionConsistency;
    }
    // Update other metrics
    reputation.totalAttestations++;
    reputation.lastUpdated = Date.now();
    // Store updated reputation
    reputationMetrics.set(userPubKey, reputation);
    return reputation;
}
/**
 * Get reputation metrics for a user
 */
export function getReputationMetrics(userPubKey) {
    return reputationMetrics.get(userPubKey);
}
/**
 * Get all reputation metrics (for leaderboard)
 */
export function getAllReputationMetrics() {
    return Array.from(reputationMetrics.values());
}
/**
 * Check if a user has teacher privileges
 */
export function hasTeacherPrivileges(_userPubKey) {
    // In a real implementation, this would check against a registry of teacher public keys
    // For now, return true for any user (prototype implementation)
    return true;
}
/**
 * Get teacher controls for a user
 */
export function getTeacherControls(userPubKey) {
    const isTeacher = hasTeacherPrivileges(userPubKey);
    return {
        canTriggerReveal: isTeacher,
        viewReputationMetrics: isTeacher,
        moderateAttestations: isTeacher
    };
}
/**
 * Get AP reveal for a question
 */
export function getAPReveal(questionId) {
    return apReveals.get(questionId);
}
/**
 * Get all AP reveals
 */
export function getAllAPReveals() {
    return Array.from(apReveals.values());
}
/**
 * Reset all data (for testing purposes)
 */
export function resetRevealsData() {
    apReveals.clear();
    reputationMetrics.clear();
    attestationHistory.clear();
}
//# sourceMappingURL=reveals.js.map