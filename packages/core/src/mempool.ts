import { createTransactionBatch, type TransactionBatch } from './transaction/index';
import { keyPairFromMnemonic } from './crypto/keys.js';
import type { CompletionTransaction } from './types/index.js';

// Interface for lessons_export.json data structure
export interface ActivityData {
  id: string;
  title: string;
  unitId: string;
  activities: Activity[];
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  contribution: number;
}

// Mempool entry with transaction, points, and timestamp
export interface MempoolEntry {
  transaction: CompletionTransaction;
  points: number;
  timestamp: number;
}

// Mock lessons data for testing/development
// In production, this would be loaded from lessons_export.json
const mockLessonsData: ActivityData[] = [
  {
    id: "1-2",
    title: "The Language of Variation: Variables",
    unitId: "unit1",
    activities: [
      {
        id: "1-2_video_1",
        type: "video",
        title: "Video 1",
        contribution: 0.3
      },
      {
        id: "1-2_q1",
        type: "quiz",
        title: "Quiz: Topic 1.2",
        contribution: 0.5
      },
      {
        id: "1-2_blooket",
        type: "blooket",
        title: "Blooket: Topic 1.2",
        contribution: 0.15
      },
      {
        id: "1-2_origami",
        type: "origami",
        title: "Origami: Simple Boat",
        contribution: 0.05
      }
    ]
  },
  {
    id: "1-3",
    title: "Representing a Categorical Variable with Tables",
    unitId: "unit1",
    activities: [
      {
        id: "1-3_video_1",
        type: "video",
        title: "Video 1",
        contribution: 0.3
      },
      {
        id: "1-3_q1",
        type: "quiz",
        title: "Quiz: Topic 1.3",
        contribution: 0.5
      },
      {
        id: "1-3_blooket",
        type: "blooket",
        title: "Blooket: Topic 1.3",
        contribution: 0.15
      }
    ]
  },
  {
    id: "1-capstone",
    title: "Capstone Assessment",
    unitId: "unit1",
    activities: [
      {
        id: "1-capstone_q1",
        type: "quiz",
        title: "Quiz: Unit 1 Progress Check",
        contribution: 0.16666666666666666
      },
      {
        id: "1-capstone_q2",
        type: "quiz",
        title: "Quiz: Unit 1 Progress Check",
        contribution: 0.16666666666666666
      },
      {
        id: "1-capstone_q3",
        type: "quiz",
        title: "Quiz: Unit 1 Progress Check",
        contribution: 0.16666666666666666
      }
    ]
  }
];

/**
 * Find activity by question ID across all lessons
 */
export function findActivityByQuestionId(questionId: string): Activity | null {
  for (const lesson of mockLessonsData) {
    const activity = lesson.activities.find(a => a.id === questionId);
    if (activity) {
      return activity;
    }
  }
  return null;
}

/**
 * Calculate points for a completed question based on activity contribution
 */
export function calculatePoints(questionId: string, questionType: 'MCQ' | 'FRQ'): number {
  const activity = findActivityByQuestionId(questionId);
  if (!activity) {
    return 0;
  }

  // Base points from contribution value (scaled to 100)
  const basePoints = activity.contribution * 100;

  // Type-specific multipliers
  const typeMultiplier = questionType === 'FRQ' ? 1.2 : 1.0;

  return Math.floor(basePoints * typeMultiplier);
}

/**
 * Determine question type from transaction
 */
function getQuestionType(transaction: CompletionTransaction): 'MCQ' | 'FRQ' {
  return transaction.answerHash ? 'MCQ' : 'FRQ';
}

/**
 * Mempool class for managing completion transactions and mining eligibility
 */
export class Mempool {
  private entries: MempoolEntry[] = [];
  private readonly userPubKey: string;
  private readonly miningThreshold: number;

  constructor(userPubKey: string, miningThreshold: number = 50) {
    this.userPubKey = userPubKey;
    this.miningThreshold = miningThreshold;
  }

  /**
   * Add a completion transaction to the mempool
   */
  addTransaction(transaction: CompletionTransaction): void {
    // Validate transaction is from the correct user
    if (transaction.userPubKey !== this.userPubKey) {
      throw new Error('Transaction must be from the same user');
    }

    // Calculate points for this transaction
    const questionType = getQuestionType(transaction);
    const points = calculatePoints(transaction.questionId, questionType);

    // Create mempool entry
    const entry: MempoolEntry = {
      transaction,
      points,
      timestamp: Date.now()
    };

    // Add to entries
    this.entries.push(entry);
  }

  /**
   * Get total accumulated points
   */
  getTotalPoints(): number {
    return this.entries.reduce((total, entry) => total + entry.points, 0);
  }

  /**
   * Get number of transactions in mempool
   */
  getTransactionCount(): number {
    return this.entries.length;
  }

  /**
   * Check if user is eligible for mining
   */
  isMiningEligible(): boolean {
    return this.getTotalPoints() >= this.miningThreshold;
  }

  /**
   * Prepare transaction batch for mining (if eligible)
   */
  prepareBatch(): TransactionBatch | null {
    if (!this.isMiningEligible()) {
      return null;
    }

    // Extract transactions from entries
    const transactions = this.entries.map(entry => entry.transaction);
    
    if (transactions.length === 0) {
      return null;
    }

    // Create a temporary private key for batch signing
    // In production, this would be provided by the user's wallet
    const tempMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const keyPair = keyPairFromMnemonic(tempMnemonic);

    try {
      return createTransactionBatch(transactions, keyPair.privateKey);
    } catch (error) {
      console.error('Failed to create transaction batch:', error);
      return null;
    }
  }

  /**
   * Clear all transactions from mempool (after successful mining)
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Get all mempool entries (for debugging/UI)
   */
  getEntries(): MempoolEntry[] {
    return [...this.entries];
  }

  /**
   * Get mining threshold
   */
  getMiningThreshold(): number {
    return this.miningThreshold;
  }

  /**
   * Get user public key
   */
  getUserPubKey(): string {
    return this.userPubKey;
  }
}

/**
 * Factory function to create a mempool instance
 */
export function createMempool(userPubKey: string, miningThreshold: number = 50): Mempool {
  return new Mempool(userPubKey, miningThreshold);
}

/**
 * Get lessons data (placeholder for real implementation)
 */
export function getLessonsData(): ActivityData[] {
  return mockLessonsData;
} 