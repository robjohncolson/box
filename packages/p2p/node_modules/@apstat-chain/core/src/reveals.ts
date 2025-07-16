import { hash256 } from './crypto/hashing.js';
import { sign } from './crypto/secp256k1.js';
import type { PrivateKey, AttestationTransaction } from './types/index.js';

// Type definitions for reveals system
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

// In-memory storage for prototype (would be replaced with blockchain storage)
const apReveals = new Map<string, APRevealTransaction>();
const reputationMetrics = new Map<string, ReputationMetrics>();
const attestationHistory = new Map<string, AttestationHistory>();

// Constants
const CONVERGENCE_THRESHOLD = 50; // 50% convergence required for reveal
const MAX_FLIP_FLOP_LIMIT = 3; // Maximum number of answer changes per question
const RAPID_CHANGE_PENALTY_THRESHOLD = 5000; // 5 seconds

/**
 * Utility function to hash a message string
 */
export function hashMessage(message: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBytes = hash256(data);
  return Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if convergence threshold is met for reveal
 */
export function isRevealThresholdMet(convergenceScore: number): boolean {
  return convergenceScore >= CONVERGENCE_THRESHOLD;
}

/**
 * Trigger an AP reveal transaction when convergence threshold is met
 */
export async function triggerAPReveal(
  questionId: string,
  officialAnswer: string,
  teacherKey: PrivateKey,
  convergenceScore: number
): Promise<APRevealTransaction> {
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

  const reveal: APRevealTransaction = {
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
function getAttestationHistory(userPubKey: string, questionId: string): AttestationHistory | undefined {
  const key = `${userPubKey}:${questionId}`;
  return attestationHistory.get(key);
}

/**
 * Update attestation history for a user and question
 */
function updateAttestationHistory(userPubKey: string, attestation: AttestationTransaction): void {
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
export function calculateConsistencyScore(history: AttestationHistory): number {
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
  const maxChanges = Math.max(1, history.attestationHistory.length - 1);
  const baseScore = Math.max(0, 100 - (changes / maxChanges) * 100);

  // Apply exponential penalty for rapid changes
  const rapidPenalty = rapidChanges * 25; // 25 points per rapid change
  const finalScore = Math.max(0, baseScore - rapidPenalty);

  return Math.round(finalScore);
}

/**
 * Detect if a user is flip-flopping (changing their answer)
 */
export function detectFlipFlop(userPubKey: string, questionId: string, newAnswer: string): boolean {
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
export function updateReputation(userPubKey: string, attestation: AttestationTransaction): ReputationMetrics {
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
  const isFlipFlop = detectFlipFlop(userPubKey, attestation.questionId, 
    attestation.answerHash || attestation.answerText || '');

  if (isFlipFlop) {
    reputation.flipFlopCount++;
    
    // Enforce maximum flip-flop limit
    if (reputation.flipFlopCount > MAX_FLIP_FLOP_LIMIT) {
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
export function getReputationMetrics(userPubKey: string): ReputationMetrics | undefined {
  return reputationMetrics.get(userPubKey);
}

/**
 * Get all reputation metrics (for leaderboard)
 */
export function getAllReputationMetrics(): ReputationMetrics[] {
  return Array.from(reputationMetrics.values());
}

/**
 * Check if a user has teacher privileges
 */
export function hasTeacherPrivileges(_userPubKey: string): boolean {
  // In a real implementation, this would check against a registry of teacher public keys
  // For now, return true for any user (prototype implementation)
  return true;
}

/**
 * Get teacher controls for a user
 */
export function getTeacherControls(userPubKey: string): TeacherControls {
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
export function getAPReveal(questionId: string): APRevealTransaction | undefined {
  return apReveals.get(questionId);
}

/**
 * Get all AP reveals
 */
export function getAllAPReveals(): APRevealTransaction[] {
  return Array.from(apReveals.values());
}

/**
 * Reset all data (for testing purposes)
 */
export function resetRevealsData(): void {
  apReveals.clear();
  reputationMetrics.clear();
  attestationHistory.clear();
} 