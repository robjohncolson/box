import { describe, expect, it } from 'vitest';
import { 
  createAttestation, 
  verifyAttestation,
  updateDistribution,
  calculateConvergence,
  checkQuorum
} from '../src/attestation/index.js';
import { generateKeyPair } from '../src/crypto/secp256k1.js';
import type { Attestation } from '../src/types/index.js';

describe('Attestation Functions', () => {
  describe('createAttestation', () => {
    it('should create a valid attestation with correct structure', () => {
      const keyPair = generateKeyPair();
      const puzzleId = 'puzzle-123';
      const attesterAnswer = 'answer-abc';

      const attestation = createAttestation({
        privateKey: keyPair.privateKey,
        puzzleId,
        attesterAnswer
      });

      expect(attestation).toHaveProperty('attesterPublicKey');
      expect(attestation).toHaveProperty('puzzleId');
      expect(attestation).toHaveProperty('attesterAnswer');
      expect(attestation).toHaveProperty('signature');

      expect(attestation.attesterPublicKey).toBe(keyPair.publicKey.hex);
      expect(attestation.puzzleId).toBe(puzzleId);
      expect(attestation.attesterAnswer).toBe(attesterAnswer);
      expect(typeof attestation.signature).toBe('string');
    });

    it('should create different signatures for different inputs', () => {
      const keyPair = generateKeyPair();
      const puzzleId1 = 'puzzle-123';
      const puzzleId2 = 'puzzle-456';
      const attesterAnswer = 'answer-abc';

      const attestation1 = createAttestation({
        privateKey: keyPair.privateKey,
        puzzleId: puzzleId1,
        attesterAnswer
      });

      const attestation2 = createAttestation({
        privateKey: keyPair.privateKey,
        puzzleId: puzzleId2,
        attesterAnswer
      });

      expect(attestation1.signature).not.toBe(attestation2.signature);
    });

    it('should create different signatures for different answers', () => {
      const keyPair = generateKeyPair();
      const puzzleId = 'puzzle-123';
      const attesterAnswer1 = 'answer-abc';
      const attesterAnswer2 = 'answer-def';

      const attestation1 = createAttestation({
        privateKey: keyPair.privateKey,
        puzzleId,
        attesterAnswer: attesterAnswer1
      });

      const attestation2 = createAttestation({
        privateKey: keyPair.privateKey,
        puzzleId,
        attesterAnswer: attesterAnswer2
      });

      expect(attestation1.signature).not.toBe(attestation2.signature);
    });
  });

  describe('verifyAttestation', () => {
    it('should return true for a valid attestation', () => {
      const keyPair = generateKeyPair();
      const puzzleId = 'puzzle-123';
      const attesterAnswer = 'answer-abc';

      const attestation = createAttestation({
        privateKey: keyPair.privateKey,
        puzzleId,
        attesterAnswer
      });

      const isValid = verifyAttestation(attestation);
      expect(isValid).toBe(true);
    });

    it('should return false for an attestation with tampered puzzleId', () => {
      const keyPair = generateKeyPair();
      const puzzleId = 'puzzle-123';
      const attesterAnswer = 'answer-abc';

      const attestation = createAttestation({
        privateKey: keyPair.privateKey,
        puzzleId,
        attesterAnswer
      });

      // Tamper with the puzzleId
      const tamperedAttestation: Attestation = {
        ...attestation,
        puzzleId: 'tampered-puzzle-id'
      };

      const isValid = verifyAttestation(tamperedAttestation);
      expect(isValid).toBe(false);
    });

    it('should return false for an attestation with tampered attesterAnswer', () => {
      const keyPair = generateKeyPair();
      const puzzleId = 'puzzle-123';
      const attesterAnswer = 'answer-abc';

      const attestation = createAttestation({
        privateKey: keyPair.privateKey,
        puzzleId,
        attesterAnswer
      });

      // Tamper with the attesterAnswer
      const tamperedAttestation: Attestation = {
        ...attestation,
        attesterAnswer: 'tampered-answer'
      };

      const isValid = verifyAttestation(tamperedAttestation);
      expect(isValid).toBe(false);
    });

    it('should return false for an attestation with tampered signature', () => {
      const keyPair = generateKeyPair();
      const puzzleId = 'puzzle-123';
      const attesterAnswer = 'answer-abc';

      const attestation = createAttestation({
        privateKey: keyPair.privateKey,
        puzzleId,
        attesterAnswer
      });

      // Tamper with the signature
      const tamperedAttestation: Attestation = {
        ...attestation,
        signature: 'tampered-signature-hex'
      };

      const isValid = verifyAttestation(tamperedAttestation);
      expect(isValid).toBe(false);
    });

    it('should return false for an attestation with wrong public key', () => {
      const keyPair1 = generateKeyPair();
      const keyPair2 = generateKeyPair();
      const puzzleId = 'puzzle-123';
      const attesterAnswer = 'answer-abc';

      const attestation = createAttestation({
        privateKey: keyPair1.privateKey,
        puzzleId,
        attesterAnswer
      });

      // Change the public key to a different one
      const tamperedAttestation: Attestation = {
        ...attestation,
        attesterPublicKey: keyPair2.publicKey.hex
      };

      const isValid = verifyAttestation(tamperedAttestation);
      expect(isValid).toBe(false);
    });
  });

  describe('Emergent Attestation System', () => {
    describe('Distribution Updates', () => {
      it('should increment MCQ option count correctly', () => {
        const distribution = {
          questionId: 'q1',
          totalAttestations: 5,
          mcqDistribution: { A: 2, B: 2, C: 1, D: 0 },
          convergenceScore: 0.4,
          lastUpdated: Date.now()
        };

        const updated = updateDistribution(distribution, 'A');

        expect(updated.mcqDistribution?.A).toBe(3);
        expect(updated.totalAttestations).toBe(6);
        expect(updated.convergenceScore).toBe(0.5); // 3/6 = 0.5
      });

      it('should handle FRQ score additions correctly', () => {
        const distribution = {
          questionId: 'q2',
          totalAttestations: 3,
          frqDistribution: {
            scores: [4, 3, 4],
            averageScore: 3.67,
            standardDeviation: 0.58
          },
          convergenceScore: 0.7,
          lastUpdated: Date.now()
        };

        const updated = updateDistribution(distribution, 5);

        expect(updated.frqDistribution?.scores).toEqual([4, 3, 4, 5]);
        expect(updated.totalAttestations).toBe(4);
        expect(updated.frqDistribution?.averageScore).toBe(4.0);
      });

      it('should create new distribution for first attestation', () => {
        const distribution = updateDistribution(null, 'B', 'q3');

        expect(distribution.questionId).toBe('q3');
        expect(distribution.totalAttestations).toBe(1);
        expect(distribution.mcqDistribution?.B).toBe(1);
        expect(distribution.convergenceScore).toBe(1.0);
      });
    });

    describe('Convergence Calculation', () => {
      it('should calculate convergence correctly for MCQ with high consensus', () => {
        const distribution = {
          questionId: 'q1',
          totalAttestations: 10,
          mcqDistribution: { A: 8, B: 1, C: 1, D: 0 },
          convergenceScore: 0,
          lastUpdated: Date.now()
        };

        const convergence = calculateConvergence(distribution);

        expect(convergence).toBe(0.8); // 8/10 = 0.8
      });

      it('should calculate convergence correctly for MCQ with low consensus', () => {
        const distribution = {
          questionId: 'q2',
          totalAttestations: 8,
          mcqDistribution: { A: 3, B: 2, C: 2, D: 1 },
          convergenceScore: 0,
          lastUpdated: Date.now()
        };

        const convergence = calculateConvergence(distribution);

        expect(convergence).toBe(0.375); // 3/8 = 0.375
      });

      it('should calculate convergence for FRQ based on standard deviation', () => {
        const distribution = {
          questionId: 'q3',
          totalAttestations: 5,
          frqDistribution: {
            scores: [4, 4, 4, 3, 5],
            averageScore: 4.0,
            standardDeviation: 0.7
          },
          convergenceScore: 0,
          lastUpdated: Date.now()
        };

        const convergence = calculateConvergence(distribution);

        // CV = 0.7/4.0 = 0.175, convergence = 1 - 0.175 = 0.825
        expect(convergence).toBeCloseTo(0.825, 3);
      });

      it('should return 0 for empty distribution', () => {
        const distribution = {
          questionId: 'q4',
          totalAttestations: 0,
          convergenceScore: 0,
          lastUpdated: Date.now()
        };

        const convergence = calculateConvergence(distribution);

        expect(convergence).toBe(0);
      });
    });

    describe('Quorum Checks', () => {
      it('should require minimum 3 attestations for any calculation', () => {
        const distribution = {
          questionId: 'q1',
          totalAttestations: 2,
          mcqDistribution: { A: 2, B: 0, C: 0, D: 0 },
          convergenceScore: 1.0,
          lastUpdated: Date.now()
        };

        const hasQuorum = checkQuorum(distribution);

        expect(hasQuorum).toBe(false);
      });

      it('should accept 3 attestations for high convergence (>80%)', () => {
        const distribution = {
          questionId: 'q1',
          totalAttestations: 3,
          mcqDistribution: { A: 3, B: 0, C: 0, D: 0 },
          convergenceScore: 1.0,
          lastUpdated: Date.now()
        };

        const hasQuorum = checkQuorum(distribution);

        expect(hasQuorum).toBe(true);
      });

      it('should require 4+ attestations for medium convergence (50-80%)', () => {
        const distribution = {
          questionId: 'q1',
          totalAttestations: 3,
          mcqDistribution: { A: 2, B: 1, C: 0, D: 0 },
          convergenceScore: 0.67,
          lastUpdated: Date.now()
        };

        const hasQuorum = checkQuorum(distribution);

        expect(hasQuorum).toBe(false);
      });

      it('should require 5+ attestations for low convergence (<50%)', () => {
        const distribution = {
          questionId: 'q1',
          totalAttestations: 4,
          mcqDistribution: { A: 2, B: 1, C: 1, D: 0 },
          convergenceScore: 0.4,
          lastUpdated: Date.now()
        };

        const hasQuorum = checkQuorum(distribution);

        expect(hasQuorum).toBe(false);
      });

      it('should accept sufficient attestations for low convergence', () => {
        const distribution = {
          questionId: 'q1',
          totalAttestations: 5,
          mcqDistribution: { A: 2, B: 1, C: 1, D: 1 },
          convergenceScore: 0.4,
          lastUpdated: Date.now()
        };

        const hasQuorum = checkQuorum(distribution);

        expect(hasQuorum).toBe(true);
      });
    });
  });
}); 