import * as secp256k1 from '@noble/secp256k1';
import { hash256 } from '../crypto/hashing.js';
import { sign, verify } from '../crypto/secp256k1.js';
import type { PrivateKey, PublicKey, Signature, QuestionDistribution } from '../types/index.js';
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
export function createAttestation(params: CreateAttestationParams): Attestation {
  const { privateKey, puzzleId, attesterAnswer } = params;

  // Derive the public key from the private key (in hex format)
  const publicKeyBytes = secp256k1.getPublicKey(privateKey.bytes);
  const attesterPublicKey = secp256k1.etc.bytesToHex(publicKeyBytes);

  // Create a message to sign by concatenating puzzleId and attesterAnswer
  const message = `${puzzleId}:${attesterAnswer}`;
  const messageBytes = new TextEncoder().encode(message);
  const messageHash = hash256(messageBytes);

  // Sign the message hash
  const signature = sign(messageHash, privateKey);

  // Convert signature to hex string for storage
  const signatureHex = JSON.stringify({
    r: signature.r.toString(16),
    s: signature.s.toString(16),
    recovery: signature.recovery
  });

  return {
    attesterPublicKey,
    puzzleId,
    attesterAnswer,
    signature: signatureHex
  };
}

/**
 * Verify a cryptographic attestation
 */
export function verifyAttestation(attestation: Attestation): boolean {
  try {
    const { attesterPublicKey, puzzleId, attesterAnswer, signature } = attestation;

    // Parse the signature from hex string
    const signatureObj = JSON.parse(signature);
    const parsedSignature: Signature = {
      r: BigInt('0x' + signatureObj.r),
      s: BigInt('0x' + signatureObj.s),
      recovery: signatureObj.recovery
    };

    // Recreate the message that was signed
    const message = `${puzzleId}:${attesterAnswer}`;
    const messageBytes = new TextEncoder().encode(message);
    const messageHash = hash256(messageBytes);

    // Convert public key hex to PublicKey object
    const publicKeyBytes = secp256k1.etc.hexToBytes(attesterPublicKey);
    const publicKey: PublicKey = {
      bytes: publicKeyBytes,
      hex: attesterPublicKey
    };

    // Verify the signature
    return verify(parsedSignature, messageHash, publicKey);
  } catch (error) {
    // If any parsing or verification fails, the attestation is invalid
    return false;
  }
}

/**
 * Calculate standard deviation for an array of numbers
 */
function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  
  return Math.sqrt(variance);
}

/**
 * Update distribution with a new attestation
 */
export function updateDistribution(
  existing: QuestionDistribution | null, 
  answer: string | number,
  questionId?: string
): QuestionDistribution {
  const now = Date.now();
  
  // Handle first attestation
  if (!existing) {
    if (!questionId) {
      throw new Error('Question ID required for new distribution');
    }
    
    if (typeof answer === 'string') {
      // MCQ attestation
      const mcqDistribution = { A: 0, B: 0, C: 0, D: 0, E: 0 };
      mcqDistribution[answer as keyof typeof mcqDistribution] = 1;
      
      return {
        questionId,
        totalAttestations: 1,
        mcqDistribution,
        convergenceScore: 1.0,
        lastUpdated: now
      };
    } else {
      // FRQ attestation
      return {
        questionId,
        totalAttestations: 1,
        frqDistribution: {
          scores: [answer],
          averageScore: answer,
          standardDeviation: 0
        },
        convergenceScore: 1.0,
        lastUpdated: now
      };
    }
  }
  
  // Update existing distribution
  const totalAttestations = existing.totalAttestations + 1;
  
  if (typeof answer === 'string' && existing.mcqDistribution) {
    // MCQ update
    const mcqDistribution = { ...existing.mcqDistribution };
    mcqDistribution[answer as keyof typeof mcqDistribution] += 1;
    
    const convergenceScore = calculateConvergence({
      ...existing,
      totalAttestations,
      mcqDistribution
    });
    
    return {
      ...existing,
      totalAttestations,
      mcqDistribution,
      convergenceScore,
      lastUpdated: now
    };
  } else if (typeof answer === 'number' && existing.frqDistribution) {
    // FRQ update
    const scores = [...existing.frqDistribution.scores, answer];
    const averageScore = scores.reduce((sum, val) => sum + val, 0) / scores.length;
    const standardDeviation = calculateStandardDeviation(scores);
    
    const frqDistribution = {
      scores,
      averageScore,
      standardDeviation
    };
    
    const convergenceScore = calculateConvergence({
      ...existing,
      totalAttestations,
      frqDistribution
    });
    
    return {
      ...existing,
      totalAttestations,
      frqDistribution,
      convergenceScore,
      lastUpdated: now
    };
  }
  
  throw new Error('Answer type mismatch with existing distribution');
}

/**
 * Calculate convergence score for a distribution
 */
export function calculateConvergence(distribution: QuestionDistribution): number {
  if (distribution.totalAttestations === 0) {
    return 0;
  }
  
  if (distribution.mcqDistribution) {
    // MCQ convergence: highest percentage
    const values = Object.values(distribution.mcqDistribution);
    const max = Math.max(...values);
    return max / distribution.totalAttestations;
  }
  
  if (distribution.frqDistribution) {
    // FRQ convergence: based on coefficient of variation (CV)
    const { averageScore, standardDeviation } = distribution.frqDistribution;
    if (averageScore === 0) return 0;
    
    const cv = standardDeviation / averageScore;
    return Math.max(0, 1 - cv); // Lower CV = higher convergence
  }
  
  return 0;
}

/**
 * Check if distribution meets quorum requirements
 */
export function checkQuorum(distribution: QuestionDistribution): boolean {
  // Always require minimum of 3 attestations
  if (distribution.totalAttestations < 3) {
    return false;
  }
  
  const convergence = distribution.convergenceScore;
  
  // Progressive quorum based on convergence
  if (convergence > 0.8) {
    // High convergence: 3+ attestations
    return distribution.totalAttestations >= 3;
  } else if (convergence >= 0.5) {
    // Medium convergence: 4+ attestations
    return distribution.totalAttestations >= 4;
  } else {
    // Low convergence: 5+ attestations
    return distribution.totalAttestations >= 5;
  }
} 