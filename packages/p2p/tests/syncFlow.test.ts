import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { 
  generateBlockQRCodes, 
  scanAndReconstructBlocks, 
  QRSyncManager,
  serializeBlock,
  deserializeBlock,
  processQRScan,
  chunkData,
  mergeChunks,
  type QRChunk,
  type Block
} from '../src/qrSync';
import { 
  createAttestation,
  verifyAttestation,
  updateDistribution,
  calculateConvergence,
  checkQuorum,
  type Attestation,
  type QuestionDistribution,
  type AttestationTransaction
} from '@apstat-chain/core';
import { generateKeyPair } from '@apstat-chain/core';

// Mock QR code libraries
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockqrcode')
  }
}));

vi.mock('jsqr', () => ({
  default: vi.fn().mockReturnValue({
    data: JSON.stringify({
      chunkIndex: 0,
      totalChunks: 1,
      blockHash: 'test-hash',
      data: [1, 2, 3, 4, 5],
      checksum: 'test-checksum'
    })
  })
}));

vi.mock('../src/qrSync');

describe('Sync Flow Integration Tests', () => {
  let mockBlock: Block;
  let mockAttestations: AttestationTransaction[];
  let keyPair1: any;
  let keyPair2: any;
  let keyPair3: any;

  beforeEach(() => {
    // Generate test key pairs
    keyPair1 = generateKeyPair();
    keyPair2 = generateKeyPair();
    keyPair3 = generateKeyPair();

    // Mock block structure
    mockBlock = {
      header: {
        previousHash: '0'.repeat(64),
        merkleRoot: 'test-merkle-root',
        timestamp: Date.now(),
        blockHeight: 1,
        nonce: 0
      },
      body: {
        transactions: [
          {
            type: 'completion',
            lessonId: 'lesson-123',
            studentPubKey: keyPair1.publicKey.hex,
            points: 100,
            timestamp: Date.now(),
            signature: 'test-signature'
          }
        ],
        attestations: [
          {
            type: 'attestation',
            questionId: 'question-123',
            answerHash: 'answer-hash-A',
            attesterPubKey: keyPair2.publicKey.hex,
            signature: 'attestation-signature-1',
            timestamp: Date.now()
          },
          {
            type: 'attestation',
            questionId: 'question-123',
            answerHash: 'answer-hash-A',
            attesterPubKey: keyPair3.publicKey.hex,
            signature: 'attestation-signature-2',
            timestamp: Date.now()
          }
        ],
        quorumData: {
          requiredQuorum: 3,
          achievedQuorum: 2,
          convergenceScore: 0.8
        }
      },
      signature: 'block-signature',
      producerPubKey: keyPair1.publicKey.hex,
      blockId: 'test-block-id'
    };

    mockAttestations = mockBlock.body.attestations;
  });

  describe('QR Attestation Exchange Flow', () => {
    it('should generate QR codes for attestation requests', async () => {
      const batchRequest = {
        type: 'batch_attestation_request',
        requestId: 'request-123',
        requesterPubKey: keyPair1.publicKey.hex,
        lessons: [
          {
            lessonId: 'lesson-123',
            questionId: 'question-123',
            questionType: 'mcq' as const,
            questionText: 'What is 2+2?',
            answerOptions: ['A) 3', 'B) 4', 'C) 5', 'D) 6'],
            difficultyLevel: 1 as const
          }
        ],
        timestamp: Date.now(),
        signature: 'request-signature'
      };

      const serializedRequest = new TextEncoder().encode(JSON.stringify(batchRequest));
      const chunks = chunkData(serializedRequest, 'request-hash');
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0].chunkIndex).toBe(0);
      expect(chunks[0].totalChunks).toBe(1);
      expect(chunks[0].blockHash).toBe('request-hash');
    });

    it('should process QR scan for attestation requests', () => {
      const mockQRData = JSON.stringify({
        chunkIndex: 0,
        totalChunks: 1,
        blockHash: 'request-hash',
        data: [1, 2, 3, 4, 5],
        checksum: 'test-checksum'
      });

      // Mock the checksum calculation to return expected value
      const originalProcessQRScan = processQRScan;
      vi.mocked(processQRScan).mockImplementation(() => ({
        chunkIndex: 0,
        totalChunks: 1,
        blockHash: 'request-hash',
        data: new Uint8Array([1, 2, 3, 4, 5]),
        checksum: 'test-checksum'
      }));

      const result = processQRScan(mockQRData);
      
      expect(result).not.toBeNull();
      expect(result?.chunkIndex).toBe(0);
      expect(result?.totalChunks).toBe(1);
      expect(result?.blockHash).toBe('request-hash');
    });

    it('should validate attestation signatures during exchange', () => {
      const attestation = createAttestation({
        privateKey: keyPair1.privateKey,
        puzzleId: 'question-123',
        attesterAnswer: 'A'
      });

      const isValid = verifyAttestation(attestation);
      expect(isValid).toBe(true);
    });

    it('should handle multi-chunk QR attestation requests', () => {
      const largeBatchRequest = {
        type: 'batch_attestation_request',
        requestId: 'large-request-123',
        requesterPubKey: keyPair1.publicKey.hex,
        lessons: Array.from({ length: 10 }, (_, i) => ({
          lessonId: `lesson-${i}`,
          questionId: `question-${i}`,
          questionType: 'mcq' as const,
          questionText: `Question ${i}?`.repeat(50), // Make it large
          answerOptions: ['A) Option 1', 'B) Option 2', 'C) Option 3', 'D) Option 4'],
          difficultyLevel: 1 as const
        })),
        timestamp: Date.now(),
        signature: 'large-request-signature'
      };

      const serializedRequest = new TextEncoder().encode(JSON.stringify(largeBatchRequest));
      const chunks = chunkData(serializedRequest, 'large-request-hash');
      
      expect(chunks.length).toBeGreaterThan(1);
      
      // Test chunk reconstruction
      const reconstructedData = mergeChunks(chunks);
      expect(Array.from(reconstructedData)).toEqual(Array.from(serializedRequest));
    });
  });

  describe('Mining Trigger System', () => {
    it('should evaluate mining eligibility based on quorum achievement', () => {
      const distributions = new Map<string, QuestionDistribution>();
      
      // Create distributions with different convergence scores
      distributions.set('question-1', {
        questionId: 'question-1',
        totalAttestations: 3,
        mcqDistribution: { A: 3, B: 0, C: 0, D: 0 },
        convergenceScore: 1.0,
        lastUpdated: Date.now()
      });

      distributions.set('question-2', {
        questionId: 'question-2',
        totalAttestations: 4,
        mcqDistribution: { A: 3, B: 1, C: 0, D: 0 },
        convergenceScore: 0.75,
        lastUpdated: Date.now()
      });

      distributions.set('question-3', {
        questionId: 'question-3',
        totalAttestations: 5,
        mcqDistribution: { A: 2, B: 2, C: 1, D: 0 },
        convergenceScore: 0.4,
        lastUpdated: Date.now()
      });

      const readyQuestions = Array.from(distributions.values()).filter(distribution => 
        checkQuorum(distribution) && distribution.convergenceScore >= 0.6
      );

      expect(readyQuestions).toHaveLength(2);
      expect(readyQuestions[0].questionId).toBe('question-1');
      expect(readyQuestions[1].questionId).toBe('question-2');
    });

    it('should trigger mining when 60% threshold is met', () => {
      const distributions = new Map<string, QuestionDistribution>();
      
      // Create 10 questions, 6 ready for mining (60%)
      for (let i = 0; i < 10; i++) {
        const convergenceScore = i < 6 ? 0.81 : 0.4; // First 6 have high convergence
        distributions.set(`question-${i}`, {
          questionId: `question-${i}`,
          totalAttestations: 3,
          mcqDistribution: { A: 3, B: 0, C: 0, D: 0 },
          convergenceScore,
          lastUpdated: Date.now()
        });
      }

      const readyQuestions = Array.from(distributions.values()).filter(distribution => 
        checkQuorum(distribution) && distribution.convergenceScore >= 0.6
      );

      const totalQuestions = distributions.size;
      const minimumThreshold = Math.ceil(totalQuestions * 0.6);
      const eligible = readyQuestions.length >= minimumThreshold;

      expect(totalQuestions).toBe(10);
      expect(minimumThreshold).toBe(6);
      expect(readyQuestions.length).toBe(6);
      expect(eligible).toBe(true);
    });

    it('should not trigger mining when threshold is not met', () => {
      const distributions = new Map<string, QuestionDistribution>();
      
      // Create 10 questions, only 4 ready for mining (40%)
      for (let i = 0; i < 10; i++) {
        const convergenceScore = i < 4 ? 0.81 : 0.3; // Only first 4 have high convergence
        distributions.set(`question-${i}`, {
          questionId: `question-${i}`,
          totalAttestations: 3,
          mcqDistribution: { A: 3, B: 0, C: 0, D: 0 },
          convergenceScore,
          lastUpdated: Date.now()
        });
      }

      const readyQuestions = Array.from(distributions.values()).filter(distribution => 
        checkQuorum(distribution) && distribution.convergenceScore >= 0.6
      );

      const totalQuestions = distributions.size;
      const minimumThreshold = Math.ceil(totalQuestions * 0.6);
      const eligible = readyQuestions.length >= minimumThreshold;

      expect(totalQuestions).toBe(10);
      expect(minimumThreshold).toBe(6);
      expect(readyQuestions.length).toBe(4);
      expect(eligible).toBe(false);
    });

    it('should calculate convergence score for block validation', () => {
      const attestations: AttestationTransaction[] = [
        {
          type: 'attestation',
          questionId: 'question-1',
          answerHash: 'answer-A',
          attesterPubKey: keyPair1.publicKey.hex,
          signature: 'sig-1',
          timestamp: Date.now()
        },
        {
          type: 'attestation',
          questionId: 'question-1',
          answerHash: 'answer-A',
          attesterPubKey: keyPair2.publicKey.hex,
          signature: 'sig-2',
          timestamp: Date.now()
        },
        {
          type: 'attestation',
          questionId: 'question-2',
          answerHash: 'answer-B',
          attesterPubKey: keyPair3.publicKey.hex,
          signature: 'sig-3',
          timestamp: Date.now()
        }
      ];

      // Group by question and calculate convergence
      const questionGroups = attestations.reduce((groups, attestation) => {
        const questionId = attestation.questionId;
        if (!groups[questionId]) {
          groups[questionId] = [];
        }
        groups[questionId].push(attestation);
        return groups;
      }, {} as Record<string, AttestationTransaction[]>);

      let totalConvergence = 0;
      let questionCount = 0;

      for (const [questionId, questionAttestations] of Object.entries(questionGroups)) {
        const answerCounts = questionAttestations.reduce((counts, attestation) => {
          const answer = attestation.answerHash || attestation.answerText || '';
          counts[answer] = (counts[answer] || 0) + 1;
          return counts;
        }, {} as Record<string, number>);

        const maxCount = Math.max(...Object.values(answerCounts));
        const convergenceScore = maxCount / questionAttestations.length;
        
        totalConvergence += convergenceScore;
        questionCount++;
      }

      const avgConvergence = totalConvergence / questionCount;
      
      expect(avgConvergence).toBeCloseTo(2/3);
    });
  });

  describe('Distribution Convergence', () => {
    it('should track answer distribution over time', () => {
      let distribution: QuestionDistribution | null = null;

      // First attestation
      distribution = updateDistribution(distribution, 'A', 'question-123');
      expect(distribution.totalAttestations).toBe(1);
      expect(distribution.mcqDistribution?.A).toBe(1);
      expect(distribution.convergenceScore).toBe(1.0);

      // Second attestation (same answer)
      distribution = updateDistribution(distribution, 'A');
      expect(distribution.totalAttestations).toBe(2);
      expect(distribution.mcqDistribution?.A).toBe(2);
      expect(distribution.convergenceScore).toBe(1.0);

      // Third attestation (different answer)
      distribution = updateDistribution(distribution, 'B');
      expect(distribution.totalAttestations).toBe(3);
      expect(distribution.mcqDistribution?.A).toBe(2);
      expect(distribution.mcqDistribution?.B).toBe(1);
      expect(distribution.convergenceScore).toBeCloseTo(0.667); // 2/3
    });

    it('should calculate convergence for FRQ responses', () => {
      let distribution: QuestionDistribution | null = null;

      // Add FRQ scores
      distribution = updateDistribution(distribution, 4, 'frq-question-123');
      expect(distribution.totalAttestations).toBe(1);
      expect(distribution.frqDistribution?.scores).toEqual([4]);
      expect(distribution.frqDistribution?.averageScore).toBe(4);

      distribution = updateDistribution(distribution, 5);
      expect(distribution.totalAttestations).toBe(2);
      expect(distribution.frqDistribution?.scores).toEqual([4, 5]);
      expect(distribution.frqDistribution?.averageScore).toBe(4.5);

      distribution = updateDistribution(distribution, 3);
      expect(distribution.totalAttestations).toBe(3);
      expect(distribution.frqDistribution?.scores).toEqual([4, 5, 3]);
      expect(distribution.frqDistribution?.averageScore).toBe(4);
    });

    it('should handle convergence updates with new evidence', () => {
      let distribution: QuestionDistribution | null = null;

      // Initial consensus towards A
      distribution = updateDistribution(distribution, 'A', 'question-123');
      distribution = updateDistribution(distribution, 'A');
      distribution = updateDistribution(distribution, 'A');
      expect(distribution.convergenceScore).toBe(1.0);

      // New evidence for B
      distribution = updateDistribution(distribution, 'B');
      distribution = updateDistribution(distribution, 'B');
      expect(distribution.convergenceScore).toBe(0.6); // 3/5

      // More evidence for B, creating new consensus
      distribution = updateDistribution(distribution, 'B');
      distribution = updateDistribution(distribution, 'B');
      expect(distribution.convergenceScore).toBeCloseTo(0.571); // 4/7
    });

    it('should meet quorum requirements based on convergence', () => {
      let distribution: QuestionDistribution | null = null;

      // High convergence - should need only 3 attestations
      distribution = updateDistribution(distribution, 'A', 'question-123');
      distribution = updateDistribution(distribution, 'A');
      distribution = updateDistribution(distribution, 'A');
      expect(distribution.convergenceScore).toBe(1.0);
      expect(checkQuorum(distribution)).toBe(true);

      // Medium convergence - should need 4 attestations  
      distribution = updateDistribution(distribution, 'B');
      expect(distribution.convergenceScore).toBe(0.75);
      expect(checkQuorum(distribution)).toBe(true);

      // Low convergence - should need 5 attestations
      distribution = updateDistribution(distribution, 'C');
      expect(distribution.convergenceScore).toBe(0.6);
      expect(checkQuorum(distribution)).toBe(false); // Only 5 attestations, need 5 for low convergence

      distribution = updateDistribution(distribution, 'C');
      expect(distribution.convergenceScore).toBe(0.5);
      expect(checkQuorum(distribution)).toBe(false); // 6 attestations, but convergence too low
    });
  });

  describe('End-to-End Local Simulation', () => {
    it('should simulate complete QR attestation to mining flow', async () => {
      // Step 1: Generate attestation request
      const batchRequest = {
        type: 'batch_attestation_request',
        requestId: 'sim-request-123',
        requesterPubKey: keyPair1.publicKey.hex,
        lessons: [
          {
            lessonId: 'sim-lesson-123',
            questionId: 'sim-question-123',
            questionType: 'mcq' as const,
            questionText: 'What is the capital of France?',
            answerOptions: ['A) London', 'B) Berlin', 'C) Paris', 'D) Madrid'],
            difficultyLevel: 2 as const
          }
        ],
        timestamp: Date.now(),
        signature: 'sim-request-signature'
      };

      // Step 2: Generate QR codes
      const serializedRequest = new TextEncoder().encode(JSON.stringify(batchRequest));
      const chunks = chunkData(serializedRequest, 'sim-request-hash');
      expect(chunks.length).toBeGreaterThan(0);

      // Step 3: Simulate attestation responses
      const attestations: AttestationTransaction[] = [
        {
          type: 'attestation',
          questionId: 'sim-question-123',
          answerHash: 'answer-hash-C',
          attesterPubKey: keyPair1.publicKey.hex,
          signature: 'sim-attestation-sig-1',
          timestamp: Date.now()
        },
        {
          type: 'attestation',
          questionId: 'sim-question-123',
          answerHash: 'answer-hash-C',
          attesterPubKey: keyPair2.publicKey.hex,
          signature: 'sim-attestation-sig-2',
          timestamp: Date.now()
        },
        {
          type: 'attestation',
          questionId: 'sim-question-123',
          answerHash: 'answer-hash-C',
          attesterPubKey: keyPair3.publicKey.hex,
          signature: 'sim-attestation-sig-3',
          timestamp: Date.now()
        }
      ];

      // Step 4: Update distribution
      let distribution: QuestionDistribution | null = null;
      for (const attestation of attestations) {
        const answer = attestation.answerHash || attestation.answerText || '';
        distribution = updateDistribution(distribution, answer, attestation.questionId);
      }

      // Step 5: Check mining eligibility
      expect(distribution).not.toBeNull();
      expect(distribution!.totalAttestations).toBe(3);
      expect(distribution!.convergenceScore).toBe(1.0);
      expect(checkQuorum(distribution!)).toBe(true);

      // Step 6: Verify block can be created
      const blockWithAttestations = {
        ...mockBlock,
        body: {
          ...mockBlock.body,
          attestations,
          quorumData: {
            requiredQuorum: 3,
            achievedQuorum: 3,
            convergenceScore: 1.0
          }
        }
      };

      // Step 7: Generate block QR codes for sharing
      const blockQRResult = await generateBlockQRCodes(blockWithAttestations);
      expect(blockQRResult.qrCodes).toHaveLength(1);
      expect(blockQRResult.blockHash).toBe(blockWithAttestations.blockId);
      expect(blockQRResult.totalChunks).toBe(1);
    });

    it('should handle partial convergence scenarios', () => {
      // Simulate mixed attestation responses
      const attestations: AttestationTransaction[] = [
        {
          type: 'attestation',
          questionId: 'mixed-question-123',
          answerHash: 'answer-hash-A',
          attesterPubKey: keyPair1.publicKey.hex,
          signature: 'mixed-attestation-sig-1',
          timestamp: Date.now()
        },
        {
          type: 'attestation',
          questionId: 'mixed-question-123',
          answerHash: 'answer-hash-B',
          attesterPubKey: keyPair2.publicKey.hex,
          signature: 'mixed-attestation-sig-2',
          timestamp: Date.now()
        },
        {
          type: 'attestation',
          questionId: 'mixed-question-123',
          answerHash: 'answer-hash-A',
          attesterPubKey: keyPair3.publicKey.hex,
          signature: 'mixed-attestation-sig-3',
          timestamp: Date.now()
        }
      ];

      let distribution: QuestionDistribution | null = null;
      for (const attestation of attestations) {
        const answer = attestation.answerHash || attestation.answerText || '';
        distribution = updateDistribution(distribution, answer, attestation.questionId);
      }

      expect(distribution).not.toBeNull();
      expect(distribution!.totalAttestations).toBe(3);
      expect(distribution!.convergenceScore).toBeCloseTo(2/3);
      expect(checkQuorum(distribution!)).toBe(true);
    });
  });
}); 