import { describe, it, expect } from 'vitest';
import { 
  CurriculumSchemaValidator, 
  MCQQuestionValidator, 
  FRQQuestionValidator,
  type CurriculumSchema,
  type MCQQuestion,
  type FRQQuestion,
  generateSampleMCQ,
  generateSampleFRQ,
  generateSampleCurriculum
} from '../src/curriculumSchema.ts';

describe('CurriculumSchema Validation', () => {
  describe('MCQ Question Validation', () => {
    it('should validate a valid MCQ question', () => {
      // Use the sample generator to get a valid MCQ structure
      const validMCQ = generateSampleMCQ();
      
      const result = MCQQuestionValidator.safeParse(validMCQ);
      if (!result.success) {
        console.log('Validation errors:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });

    it('should reject MCQ with missing required fields', () => {
      const invalidMCQ = {
        id: 'U1-L10-Q01',
        type: 'multiple-choice',
        prompt: 'What is the mean of the normal distribution?',
        // Missing options array
        answerKey: 'C',
        answerHash: '3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5',
        distributionTracker: {
          A: [],
          B: [],
          C: [],
          D: [],
          E: []
        }
      };

      const result = MCQQuestionValidator.safeParse(invalidMCQ);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('options');
      }
    });

    it('should reject MCQ with invalid option structure', () => {
      const invalidMCQ = {
        id: 'U1-L10-Q01',
        type: 'multiple-choice',
        prompt: 'What is the mean of the normal distribution?',
        options: [
          { key: 'A' }, // Missing value
          { value: 'x̄ = 80; s² = 10' }, // Missing key
          { key: 'C', value: 'μ = 80; σ = 10' }
        ],
        answerKey: 'C',
        answerHash: '3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5',
        distributionTracker: {
          A: [],
          B: [],
          C: [],
          D: [],
          E: []
        }
      };

      const result = MCQQuestionValidator.safeParse(invalidMCQ);
      expect(result.success).toBe(false);
    });

    it('should initialize distribution tracker with empty arrays', () => {
      const mcq = generateSampleMCQ();
      
      expect(mcq.distributionTracker.A).toEqual([]);
      expect(mcq.distributionTracker.B).toEqual([]);
      expect(mcq.distributionTracker.C).toEqual([]);
      expect(mcq.distributionTracker.D).toEqual([]);
      expect(mcq.distributionTracker.E).toEqual([]);
    });

    it('should validate distribution tracker with numeric arrays', () => {
      // Use the sample generator and modify the distribution tracker
      const mcqWithData = generateSampleMCQ();
      mcqWithData.distributionTracker = {
        A: [1, 2, 3],
        B: [4, 5],
        C: [6, 7, 8, 9],
        D: [10],
        E: []
      };

      const result = MCQQuestionValidator.safeParse(mcqWithData);
      expect(result.success).toBe(true);
    });
  });

  describe('FRQ Question Validation', () => {
    it('should validate a valid FRQ question', () => {
      const validFRQ: FRQQuestion = {
        id: 'U6-PC-FRQ-Q01',
        type: 'free-response',
        prompt: 'Construct and interpret a 95% confidence interval for the proportion...',
        solution: {
          parts: [
            {
              partId: 'a-step1',
              description: 'Identify the correct procedure with conditions.',
              response: 'The appropriate procedure is the one-sample z-interval...',
              calculations: ['n*p = 1000*0.37 >= 10', 'n*(1-p) = 1000*0.63 >= 10']
            }
          ],
          scoring: {
            totalPoints: 4,
            rubric: [
              {
                part: 'a-step1',
                maxPoints: 1,
                criteria: ['Correct interval identified', 'Random sampling condition checked'],
                scoringNotes: 'Essentially correct (E) if response satisfies all components.'
              }
            ]
          }
        },
        assetHash: 'def456abc789',
        distributionTracker: {
          scores: [],
          attempts: []
        }
      };

      const result = FRQQuestionValidator.safeParse(validFRQ);
      expect(result.success).toBe(true);
    });

    it('should reject FRQ with missing solution', () => {
      const invalidFRQ = {
        id: 'U6-PC-FRQ-Q01',
        type: 'free-response',
        prompt: 'Construct and interpret a 95% confidence interval...',
        // Missing solution
        distributionTracker: {
          scores: [],
          attempts: []
        }
      };

      const result = FRQQuestionValidator.safeParse(invalidFRQ);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('solution');
      }
    });

    it('should reject FRQ with invalid rubric structure', () => {
      const invalidFRQ = {
        id: 'U6-PC-FRQ-Q01',
        type: 'free-response',
        prompt: 'Construct and interpret a 95% confidence interval...',
        solution: {
          parts: [
            {
              partId: 'a-step1',
              description: 'Identify the correct procedure with conditions.',
              response: 'The appropriate procedure is the one-sample z-interval...'
            }
          ],
          scoring: {
            totalPoints: 4,
            rubric: [
              {
                part: 'a-step1',
                // Missing maxPoints
                criteria: ['Correct interval identified']
              }
            ]
          }
        },
        distributionTracker: {
          scores: [],
          attempts: []
        }
      };

      const result = FRQQuestionValidator.safeParse(invalidFRQ);
      expect(result.success).toBe(false);
    });

    it('should initialize FRQ distribution tracker with empty arrays', () => {
      const frq = generateSampleFRQ();
      
      expect(frq.distributionTracker.scores).toEqual([]);
      expect(frq.distributionTracker.attempts).toEqual([]);
    });

    it('should validate FRQ distribution tracker with numeric arrays', () => {
      const frqWithData: FRQQuestion = {
        id: 'U6-PC-FRQ-Q01',
        type: 'free-response',
        prompt: 'Construct and interpret a 95% confidence interval...',
        solution: {
          parts: [
            {
              partId: 'a-step1',
              description: 'Identify the correct procedure with conditions.',
              response: 'The appropriate procedure is the one-sample z-interval...'
            }
          ],
          scoring: {
            totalPoints: 4,
            rubric: [
              {
                part: 'a-step1',
                maxPoints: 1,
                criteria: ['Correct interval identified']
              }
            ]
          }
        },
        distributionTracker: {
          scores: [0, 1, 2, 3, 4],
          attempts: [1, 2, 1, 3, 1]
        }
      };

      const result = FRQQuestionValidator.safeParse(frqWithData);
      expect(result.success).toBe(true);
    });
  });

  describe('Full Curriculum Schema Validation', () => {
    it('should validate a complete curriculum schema', () => {
      const curriculum = generateSampleCurriculum();
      
      const result = CurriculumSchemaValidator.safeParse(curriculum);
      expect(result.success).toBe(true);
    });

    it('should reject curriculum with missing metadata', () => {
      const invalidCurriculum = {
        units: [
          {
            unitId: 'unit1',
            displayName: 'Unit 1: Exploring One-Variable Data',
            examWeight: '15-23%',
            topics: []
          }
        ]
        // Missing metadata
      };

      const result = CurriculumSchemaValidator.safeParse(invalidCurriculum);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('metadata');
      }
    });

    it('should validate curriculum with mixed MCQ and FRQ questions', () => {
      const curriculumWithQuestions: CurriculumSchema = {
        units: [
          {
            unitId: 'unit1',
            displayName: 'Unit 1: Exploring One-Variable Data',
            examWeight: '15-23%',
            topics: [
              {
                id: '1-1',
                name: 'Topic 1.1',
                description: 'Introducing Statistics',
                videos: [],
                blooket: {
                  url: 'https://example.com/blooket',
                  completed: false,
                  completionDate: null
                },
                origami: {
                  name: 'Paper Airplane',
                  description: 'Classic dart',
                  videoUrl: 'https://example.com/video',
                  reflection: 'Think about flight patterns'
                },
                quizzes: [
                  {
                    questionPdf: 'pdfs/unit1/quiz.pdf',
                    answersPdf: 'pdfs/unit1/answers.pdf',
                    quizId: '1-1_q1',
                    completed: false,
                    completionDate: null
                  }
                ],
                questions: [
                  generateSampleMCQ(),
                  generateSampleFRQ()
                ],
                current: false
              }
            ]
          }
        ],
        metadata: {
          version: '1.0.0',
          generatedAt: '2025-01-25T00:00:00Z',
          totalQuestions: 2,
          questionHashMap: {
            'sample-mcq': 'hash1',
            'sample-frq': 'hash2'
          }
        }
      };

      const result = CurriculumSchemaValidator.safeParse(curriculumWithQuestions);
      expect(result.success).toBe(true);
    });

    it('should validate question hash map structure', () => {
      const curriculum = generateSampleCurriculum();
      
      expect(curriculum.metadata.questionHashMap).toBeDefined();
      expect(typeof curriculum.metadata.questionHashMap).toBe('object');
      expect(curriculum.metadata.totalQuestions).toBeGreaterThan(0);
    });
  });

  describe('Sample Data Generation', () => {
    it('should generate valid sample MCQ', () => {
      const sampleMCQ = generateSampleMCQ();
      
      const result = MCQQuestionValidator.safeParse(sampleMCQ);
      expect(result.success).toBe(true);
      expect(sampleMCQ.type).toBe('multiple-choice');
      expect(sampleMCQ.options.length).toBeGreaterThan(0);
    });

    it('should generate valid sample FRQ', () => {
      const sampleFRQ = generateSampleFRQ();
      
      const result = FRQQuestionValidator.safeParse(sampleFRQ);
      expect(result.success).toBe(true);
      expect(sampleFRQ.type).toBe('free-response');
      expect(sampleFRQ.solution.parts.length).toBeGreaterThan(0);
    });

    it('should generate valid sample curriculum', () => {
      const sampleCurriculum = generateSampleCurriculum();
      
      const result = CurriculumSchemaValidator.safeParse(sampleCurriculum);
      expect(result.success).toBe(true);
      expect(sampleCurriculum.units.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty distribution arrays', () => {
      const mcq = generateSampleMCQ();
      mcq.distributionTracker = {
        A: [],
        B: [],
        C: [],
        D: [],
        E: []
      };
      
      const result = MCQQuestionValidator.safeParse(mcq);
      expect(result.success).toBe(true);
    });

    it('should reject invalid question types', () => {
      const invalidQuestion = {
        id: 'invalid-q1',
        type: 'invalid-type',
        prompt: 'What is this?',
        distributionTracker: {
          A: [],
          B: [],
          C: [],
          D: [],
          E: []
        }
      };

      const resultMCQ = MCQQuestionValidator.safeParse(invalidQuestion);
      const resultFRQ = FRQQuestionValidator.safeParse(invalidQuestion);
      
      expect(resultMCQ.success).toBe(false);
      expect(resultFRQ.success).toBe(false);
    });

    it('should validate hash format constraints', () => {
      const mcq = generateSampleMCQ();
      mcq.answerHash = 'invalid-hash'; // Too short
      
      const result = MCQQuestionValidator.safeParse(mcq);
      expect(result.success).toBe(false);
    });
  });
}); 