import { z } from 'zod';

// Base activity schemas
const VideoActivitySchema = z.object({
  url: z.string(),
  altUrl: z.string().optional(),
  completed: z.boolean(),
  completionDate: z.string().nullable()
});

const BlooketActivitySchema = z.object({
  url: z.string(),
  completed: z.boolean(),
  completionDate: z.string().nullable()
});

const OrigamiActivitySchema = z.object({
  name: z.string(),
  description: z.string(),
  videoUrl: z.string(),
  reflection: z.string()
});

const QuizActivitySchema = z.object({
  questionPdf: z.string().optional(),
  answersPdf: z.string(),
  quizId: z.string(),
  completed: z.boolean(),
  completionDate: z.string().nullable()
});

// Question schemas
const MCQOptionSchema = z.object({
  key: z.string(),
  value: z.string()
});

const MCQDistributionTrackerSchema = z.object({
  A: z.array(z.number()).default([]),
  B: z.array(z.number()).default([]),
  C: z.array(z.number()).default([]),
  D: z.array(z.number()).default([]),
  E: z.array(z.number()).default([])
});

export const MCQQuestionSchema = z.object({
  id: z.string(),
  type: z.literal('multiple-choice'),
  prompt: z.string(),
  options: z.array(MCQOptionSchema).min(1),
  answerKey: z.string(),
  answerHash: z.string().min(64).max(64), // SHA-256 hash
  reasoning: z.string().optional(),
  assetHash: z.string().optional(),
  distributionTracker: MCQDistributionTrackerSchema
});

const FRQSolutionPartSchema = z.object({
  partId: z.string(),
  description: z.string(),
  response: z.string(),
  calculations: z.array(z.string()).optional()
});

const FRQRubricItemSchema = z.object({
  part: z.string(),
  maxPoints: z.number(),
  criteria: z.array(z.string()),
  scoringNotes: z.string().optional()
});

const FRQSolutionSchema = z.object({
  parts: z.array(FRQSolutionPartSchema),
  scoring: z.object({
    totalPoints: z.number(),
    rubric: z.array(FRQRubricItemSchema)
  })
});

const FRQDistributionTrackerSchema = z.object({
  scores: z.array(z.number()).default([]),
  attempts: z.array(z.number()).default([])
});

export const FRQQuestionSchema = z.object({
  id: z.string(),
  type: z.literal('free-response'),
  prompt: z.string(),
  solution: FRQSolutionSchema,
  assetHash: z.string().optional(),
  distributionTracker: FRQDistributionTrackerSchema
});

// Union type for all question types
export const QuestionSchema = z.union([MCQQuestionSchema, FRQQuestionSchema]);

// Topic schema
const CurriculumTopicSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  videos: z.array(VideoActivitySchema),
  blooket: BlooketActivitySchema,
  origami: OrigamiActivitySchema,
  quizzes: z.array(QuizActivitySchema),
  questions: z.array(QuestionSchema).default([]),
  current: z.boolean()
});

// Unit schema
const CurriculumUnitSchema = z.object({
  unitId: z.string(),
  displayName: z.string(),
  examWeight: z.string(),
  topics: z.array(CurriculumTopicSchema)
});

// Metadata schema
const CurriculumMetadataSchema = z.object({
  version: z.string(),
  generatedAt: z.string(),
  totalQuestions: z.number(),
  questionHashMap: z.record(z.string(), z.string())
});

// Main curriculum schema
export const CurriculumSchema = z.object({
  units: z.array(CurriculumUnitSchema),
  metadata: CurriculumMetadataSchema
});

// Type exports
export type MCQQuestion = z.infer<typeof MCQQuestionSchema>;
export type FRQQuestion = z.infer<typeof FRQQuestionSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type CurriculumTopic = z.infer<typeof CurriculumTopicSchema>;
export type CurriculumUnit = z.infer<typeof CurriculumUnitSchema>;
export type CurriculumMetadata = z.infer<typeof CurriculumMetadataSchema>;
export type CurriculumSchema = z.infer<typeof CurriculumSchema>;

// Validator exports
export const MCQQuestionValidator = MCQQuestionSchema;
export const FRQQuestionValidator = FRQQuestionSchema;
export const QuestionValidator = QuestionSchema;
export const CurriculumSchemaValidator = CurriculumSchema;

// Helper function to generate hashes (simplified for demo)
function generateHash(content: string): string {
  // Simple hash function for demo - in production, use proper crypto hashing
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const hashString = Math.abs(hash).toString(16);
  // Ensure exactly 64 characters by padding or truncating
  return hashString.padStart(64, '0').substring(0, 64);
}

// Sample data generators
export function generateSampleMCQ(): MCQQuestion {
  return {
    id: 'sample-mcq',
    type: 'multiple-choice',
    prompt: 'What is the mean of a normal distribution with μ = 80 and σ = 10?',
    options: [
      { key: 'A', value: 'x̄ = 80; s = 10' },
      { key: 'B', value: 'x̄ = 80; s² = 10' },
      { key: 'C', value: 'μ = 80; σ = 10' },
      { key: 'D', value: 'μ = 80; s = 10' },
      { key: 'E', value: 'Cannot be determined' }
    ],
    answerKey: 'C',
    answerHash: generateHash('C'),
    reasoning: 'The correct symbols for population parameters are μ (mean) and σ (standard deviation).',
    assetHash: generateHash('sample-asset'),
    distributionTracker: {
      A: [],
      B: [],
      C: [],
      D: [],
      E: []
    }
  };
}

export function generateSampleFRQ(): FRQQuestion {
  return {
    id: 'sample-frq',
    type: 'free-response',
    prompt: 'A survey collected data from 1,000 people. Of those sampled, 37% indicated football as their favorite sport. (a) Construct a 95% confidence interval for the proportion. (b) Is 33% a reasonable value?',
    solution: {
      parts: [
        {
          partId: 'a-step1',
          description: 'Identify the correct procedure and check conditions.',
          response: 'Use one-sample z-interval for proportion. Sample is random, n*p ≥ 10, n*(1-p) ≥ 10, and n < 10% of population.',
          calculations: ['n*p = 1000*0.37 = 370 ≥ 10', 'n*(1-p) = 1000*0.63 = 630 ≥ 10']
        },
        {
          partId: 'a-step2',
          description: 'Calculate the confidence interval.',
          response: 'CI = 0.37 ± 1.96*sqrt(0.37*0.63/1000) = 0.37 ± 0.03 = (0.34, 0.40)',
          calculations: ['SE = sqrt(0.37*0.63/1000) = 0.0153', 'ME = 1.96*0.0153 = 0.030']
        },
        {
          partId: 'b',
          description: 'Evaluate whether 33% is reasonable.',
          response: 'No, 0.33 is not in the interval (0.34, 0.40), so it is not a reasonable value.'
        }
      ],
      scoring: {
        totalPoints: 4,
        rubric: [
          {
            part: 'a-step1',
            maxPoints: 1,
            criteria: ['Correct procedure identified', 'All conditions checked'],
            scoringNotes: 'Must identify z-interval and check all three conditions'
          },
          {
            part: 'a-step2',
            maxPoints: 2,
            criteria: ['Correct formula used', 'Accurate calculations', 'Proper interval format'],
            scoringNotes: 'Partial credit for minor arithmetic errors'
          },
          {
            part: 'b',
            maxPoints: 1,
            criteria: ['Correct conclusion', 'Proper justification'],
            scoringNotes: 'Must reference the confidence interval'
          }
        ]
      }
    },
    assetHash: generateHash('sample-frq-asset'),
    distributionTracker: {
      scores: [],
      attempts: []
    }
  };
}

export function generateSampleCurriculum(): CurriculumSchema {
  return {
    units: [
      {
        unitId: 'unit1',
        displayName: 'Unit 1: Exploring One-Variable Data',
        examWeight: '15-23%',
        topics: [
          {
            id: '1-1',
            name: 'Topic 1.1',
            description: 'Introducing Statistics: What Can We Learn from Data?',
            videos: [
              {
                url: 'https://example.com/video1',
                altUrl: 'https://example.com/alt-video1',
                completed: false,
                completionDate: null
              }
            ],
            blooket: {
              url: 'https://example.com/blooket1',
              completed: false,
              completionDate: null
            },
            origami: {
              name: 'Paper Airplane',
              description: 'Classic dart design',
              videoUrl: 'https://example.com/origami1',
              reflection: 'Think about how data can help us explore patterns, like flight paths.'
            },
            quizzes: [
              {
                questionPdf: 'pdfs/unit1/quiz1.pdf',
                answersPdf: 'pdfs/unit1/answers1.pdf',
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
      generatedAt: new Date().toISOString(),
      totalQuestions: 2,
      questionHashMap: {
        'sample-mcq': generateHash('sample-mcq'),
        'sample-frq': generateHash('sample-frq')
      }
    }
  };
}

// Validation helper functions
export function validateMCQ(mcq: unknown): MCQQuestion {
  return MCQQuestionValidator.parse(mcq);
}

export function validateFRQ(frq: unknown): FRQQuestion {
  return FRQQuestionValidator.parse(frq);
}

export function validateCurriculum(curriculum: unknown): CurriculumSchema {
  return CurriculumSchemaValidator.parse(curriculum);
}

// Safe validation functions
export function safeParseMCQ(mcq: unknown) {
  return MCQQuestionValidator.safeParse(mcq);
}

export function safeParseFRQ(frq: unknown) {
  return FRQQuestionValidator.safeParse(frq);
}

export function safeParseCurriculum(curriculum: unknown) {
  return CurriculumSchemaValidator.safeParse(curriculum);
} 