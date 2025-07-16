import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  triggerAPReveal, 
  updateReputation, 
  detectFlipFlop, 
  calculateConsistencyScore,
  getReputationMetrics,
  isRevealThresholdMet,
  hashMessage,
  type APRevealTransaction,
  type ReputationMetrics,
  type AttestationHistory
} from '../src/reveals.js';
import { keyPairFromMnemonic } from '../src/crypto/keys.js';
import { resetRevealsData } from '../src/reveals.js';
import type { PrivateKey, AttestationTransaction } from '../src/types/index.js';

describe('Reveals System', () => {
  let teacherPrivateKey: PrivateKey;
  let studentPrivateKey: PrivateKey;
  let mockQuestionId: string;
  let mockOfficialAnswer: string;

  beforeEach(() => {
    // Reset mocks and test data
    vi.clearAllMocks();
    resetRevealsData();
    
    // Create test key pairs with valid mnemonics
    const teacherKeyPair = keyPairFromMnemonic('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    const studentKeyPair = keyPairFromMnemonic('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    
    teacherPrivateKey = teacherKeyPair.privateKey;
    studentPrivateKey = studentKeyPair.privateKey;
    
    mockQuestionId = 'test-question-123';
    mockOfficialAnswer = 'B';
  });

  describe('Reveal Trigger', () => {
    it('should trigger AP reveal when convergence threshold is met', async () => {
      // Mock convergence score >= 50%
      const mockConvergenceScore = 65;
      
      const result = await triggerAPReveal(
        mockQuestionId,
        mockOfficialAnswer,
        teacherPrivateKey,
        mockConvergenceScore
      );

      expect(result).toBeDefined();
      expect(result.type).toBe('ap-reveal');
      expect(result.questionId).toBe(mockQuestionId);
      expect(result.officialAnswerHash).toBe(hashMessage(mockOfficialAnswer));
      expect(result.convergenceAtReveal).toBe(mockConvergenceScore);
      expect(result.signature).toBeDefined();
      expect(result.timestamp).toBeTypeOf('number');
    });

    it('should reject reveal when convergence threshold not met', async () => {
      // Mock convergence score < 50%
      const mockConvergenceScore = 35;
      
      await expect(
        triggerAPReveal(mockQuestionId, mockOfficialAnswer, teacherPrivateKey, mockConvergenceScore)
      ).rejects.toThrow('Convergence threshold not met');
    });

    it('should reject reveal when question already has AP reveal', async () => {
      // First reveal should succeed
      const mockConvergenceScore = 65;
      await triggerAPReveal(mockQuestionId, mockOfficialAnswer, teacherPrivateKey, mockConvergenceScore);
      
      // Second reveal should fail
      await expect(
        triggerAPReveal(mockQuestionId, mockOfficialAnswer, teacherPrivateKey, mockConvergenceScore)
      ).rejects.toThrow('AP reveal already exists for this question');
    });

    it('should check if reveal threshold is met correctly', () => {
      expect(isRevealThresholdMet(65)).toBe(true);
      expect(isRevealThresholdMet(50)).toBe(true);
      expect(isRevealThresholdMet(49)).toBe(false);
      expect(isRevealThresholdMet(0)).toBe(false);
    });
  });

  describe('Reputation Calculation', () => {
    it('should initialize reputation metrics for new user', () => {
      const userPubKey = 'test-user-pubkey';
      const attestation: AttestationTransaction = {
        type: 'attestation',
        questionId: mockQuestionId,
        answerHash: hashMessage('A'),
        attesterPubKey: userPubKey,
        signature: 'test-signature',
        timestamp: Date.now()
      };

      const reputation = updateReputation(userPubKey, attestation);

      expect(reputation.userPubKey).toBe(userPubKey);
      expect(reputation.totalAttestations).toBe(1);
      expect(reputation.consistencyScore).toBe(100); // Perfect consistency for first attestation
      expect(reputation.flipFlopCount).toBe(0);
      expect(reputation.accuracyScore).toBe(0); // No emergent consensus yet
      expect(reputation.lastUpdated).toBeTypeOf('number');
    });

    it('should update existing reputation metrics', () => {
      const userPubKey = 'test-user-pubkey';
      const firstAttestation: AttestationTransaction = {
        type: 'attestation',
        questionId: mockQuestionId,
        answerHash: hashMessage('A'),
        attesterPubKey: userPubKey,
        signature: 'test-signature-1',
        timestamp: Date.now()
      };

      const secondAttestation: AttestationTransaction = {
        type: 'attestation',
        questionId: 'test-question-456',
        answerHash: hashMessage('B'),
        attesterPubKey: userPubKey,
        signature: 'test-signature-2',
        timestamp: Date.now() + 1000
      };

      // First attestation
      const firstReputation = updateReputation(userPubKey, firstAttestation);
      expect(firstReputation.totalAttestations).toBe(1);

      // Second attestation
      const secondReputation = updateReputation(userPubKey, secondAttestation);
      expect(secondReputation.totalAttestations).toBe(2);
      expect(secondReputation.consistencyScore).toBe(100); // Different questions, no flip-flop
    });

    it('should calculate consistency score correctly', () => {
      const userPubKey = 'test-user-pubkey';
      const history: AttestationHistory = {
        questionId: mockQuestionId,
        userPubKey,
        attestationHistory: [
          {
            answerHash: hashMessage('A'),
            timestamp: Date.now() - 3000,
            blockHeight: 1
          },
          {
            answerHash: hashMessage('B'),
            timestamp: Date.now() - 2000,
            blockHeight: 2
          },
          {
            answerHash: hashMessage('A'),
            timestamp: Date.now() - 1000,
            blockHeight: 3
          }
        ]
      };

      const consistencyScore = calculateConsistencyScore(history);
      
      // Should be penalized for flip-flopping (2 changes)
      expect(consistencyScore).toBeLessThan(100);
      expect(consistencyScore).toBeGreaterThan(0);
    });

    it('should get reputation metrics for user', () => {
      const userPubKey = 'test-user-pubkey';
      const attestation: AttestationTransaction = {
        type: 'attestation',
        questionId: mockQuestionId,
        answerHash: hashMessage('A'),
        attesterPubKey: userPubKey,
        signature: 'test-signature',
        timestamp: Date.now()
      };

      // Create reputation
      updateReputation(userPubKey, attestation);

      // Retrieve reputation
      const reputation = getReputationMetrics(userPubKey);
      expect(reputation).toBeDefined();
      expect(reputation?.userPubKey).toBe(userPubKey);
      expect(reputation?.totalAttestations).toBe(1);
    });
  });

  describe('Flip-Flop Detection', () => {
    it('should detect flip-flop when user changes answer for same question', () => {
      const userPubKey = 'test-user-pubkey';
      const previousAnswer = 'A';
      const newAnswer = 'B';

      // First attestation
      const firstAttestation: AttestationTransaction = {
        type: 'attestation',
        questionId: mockQuestionId,
        answerHash: hashMessage(previousAnswer),
        attesterPubKey: userPubKey,
        signature: 'test-signature-1',
        timestamp: Date.now() - 1000
      };

      updateReputation(userPubKey, firstAttestation);

      // Detect flip-flop on second attestation
      const isFlipFlop = detectFlipFlop(userPubKey, mockQuestionId, newAnswer);
      expect(isFlipFlop).toBe(true);
    });

    it('should not detect flip-flop for first attestation on question', () => {
      const userPubKey = 'test-user-pubkey';
      const answer = 'A';

      const isFlipFlop = detectFlipFlop(userPubKey, mockQuestionId, answer);
      expect(isFlipFlop).toBe(false);
    });

    it('should not detect flip-flop when user maintains same answer', () => {
      const userPubKey = 'test-user-pubkey';
      const answer = 'A';

      // First attestation
      const firstAttestation: AttestationTransaction = {
        type: 'attestation',
        questionId: mockQuestionId,
        answerHash: hashMessage(answer),
        attesterPubKey: userPubKey,
        signature: 'test-signature-1',
        timestamp: Date.now() - 1000
      };

      updateReputation(userPubKey, firstAttestation);

      // Check same answer
      const isFlipFlop = detectFlipFlop(userPubKey, mockQuestionId, answer);
      expect(isFlipFlop).toBe(false);
    });

    it('should track flip-flop count in reputation', () => {
      const userPubKey = 'test-user-pubkey';
      
      // First attestation
      const firstAttestation: AttestationTransaction = {
        type: 'attestation',
        questionId: mockQuestionId,
        answerHash: hashMessage('A'),
        attesterPubKey: userPubKey,
        signature: 'test-signature-1',
        timestamp: Date.now() - 2000
      };

      updateReputation(userPubKey, firstAttestation);

      // Second attestation (flip-flop)
      const secondAttestation: AttestationTransaction = {
        type: 'attestation',
        questionId: mockQuestionId,
        answerHash: hashMessage('B'),
        attesterPubKey: userPubKey,
        signature: 'test-signature-2',
        timestamp: Date.now() - 1000
      };

      const updatedReputation = updateReputation(userPubKey, secondAttestation);
      expect(updatedReputation.flipFlopCount).toBe(1);
    });

    it('should enforce maximum flip-flop limit', () => {
      const userPubKey = 'test-user-pubkey';
      const answers = ['A', 'B', 'C', 'D'];

      // Create 4 attestations to exceed limit of 3 changes
      for (let i = 0; i < 4; i++) {
        const attestation: AttestationTransaction = {
          type: 'attestation',
          questionId: mockQuestionId,
          answerHash: hashMessage(answers[i]),
          attesterPubKey: userPubKey,
          signature: `test-signature-${i}`,
          timestamp: Date.now() - (4 - i) * 1000
        };

        if (i === 3) {
          // Fourth attestation should be rejected
          expect(() => updateReputation(userPubKey, attestation)).toThrow('Maximum flip-flop limit exceeded');
        } else {
          updateReputation(userPubKey, attestation);
        }
      }
    });

    it('should apply exponential time penalties for rapid changes', () => {
      const userPubKey = 'test-user-pubkey';
      const now = Date.now();
      
      // First attestation
      const firstAttestation: AttestationTransaction = {
        type: 'attestation',
        questionId: mockQuestionId,
        answerHash: hashMessage('A'),
        attesterPubKey: userPubKey,
        signature: 'test-signature-1',
        timestamp: now - 1000
      };

      updateReputation(userPubKey, firstAttestation);

      // Second attestation very quickly (should be heavily penalized)
      const secondAttestation: AttestationTransaction = {
        type: 'attestation',
        questionId: mockQuestionId,
        answerHash: hashMessage('B'),
        attesterPubKey: userPubKey,
        signature: 'test-signature-2',
        timestamp: now - 500 // Only 500ms later
      };

      const reputation = updateReputation(userPubKey, secondAttestation);
      
      // Consistency score should be heavily penalized for rapid flip-flop
      expect(reputation.consistencyScore).toBeLessThan(50);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow from attestation to reveal', async () => {
      const userPubKey = 'test-user-pubkey';
      
      // Multiple users attest to same answer to reach convergence
      const users = ['user1', 'user2', 'user3', 'user4', 'user5'];
      const consensusAnswer = 'B';
      
      for (const user of users) {
        const attestation: AttestationTransaction = {
          type: 'attestation',
          questionId: mockQuestionId,
          answerHash: hashMessage(consensusAnswer),
          attesterPubKey: user,
          signature: `signature-${user}`,
          timestamp: Date.now()
        };
        
        updateReputation(user, attestation);
      }
      
      // Convergence should be high enough for reveal
      const convergenceScore = 85; // Mock high convergence
      
      // Trigger reveal
      const reveal = await triggerAPReveal(
        mockQuestionId,
        consensusAnswer,
        teacherPrivateKey,
        convergenceScore
      );
      
      expect(reveal.type).toBe('ap-reveal');
      expect(reveal.questionId).toBe(mockQuestionId);
      expect(reveal.convergenceAtReveal).toBe(convergenceScore);
      
      // Verify all users have good reputation
      for (const user of users) {
        const reputation = getReputationMetrics(user);
        expect(reputation?.consistencyScore).toBe(100); // No flip-flops
        expect(reputation?.flipFlopCount).toBe(0);
      }
    });
  });
}); 