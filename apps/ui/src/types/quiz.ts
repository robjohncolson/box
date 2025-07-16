// Temporary types for quiz data until @apstat-chain/data is properly set up

export interface MCQOption {
  key: string;
  value: string;
}

export interface MCQDistributionTracker {
  A: number[];
  B: number[];
  C: number[];
  D: number[];
  E: number[];
}

export interface MCQQuestion {
  id: string;
  type: 'multiple-choice';
  prompt: string;
  options: MCQOption[];
  answerKey: string;
  answerHash: string;
  reasoning?: string;
  assetHash?: string;
  distributionTracker: MCQDistributionTracker;
}

export interface FRQSolutionPart {
  partId: string;
  description: string;
  response: string;
  calculations?: string[];
}

export interface FRQRubricItem {
  part: string;
  maxPoints: number;
  criteria: string[];
  scoringNotes?: string;
}

export interface FRQSolution {
  parts: FRQSolutionPart[];
  scoring: {
    totalPoints: number;
    rubric: FRQRubricItem[];
  };
}

export interface FRQDistributionTracker {
  scores: number[];
  attempts: number[];
}

export interface FRQQuestion {
  id: string;
  type: 'free-response';
  prompt: string;
  solution: FRQSolution;
  assetHash?: string;
  distributionTracker: FRQDistributionTracker;
}

export type QuizQuestion = MCQQuestion | FRQQuestion; 