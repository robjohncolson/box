import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CurriculumManager } from './CurriculumManager.js';
import type { CurriculumUnit, BlockchainIntegration, ActivityCompletionTransaction } from './types.js';

// Test data that matches our interface
const mockCurriculumData: CurriculumUnit[] = [
  {
    unitId: 'unit1',
    displayName: 'Unit 1: Test Unit',
    examWeight: '15-23%',
    topics: [
      {
        id: '1-1',
        name: 'Topic 1.1',
        description: 'First topic description',
        videos: [
          {
            url: 'https://example.com/video1',
            altUrl: 'https://alt.com/video1',
            completed: false,
            completionDate: null
          },
          {
            url: 'https://example.com/video2', 
            altUrl: undefined,
            completed: true,
            completionDate: '2024-01-01T00:00:00.000Z'
          }
        ],
        quizzes: [
          {
            answersPdf: 'path/to/answers.pdf',
            quizId: '1-1_q1',
            completed: false,
            completionDate: null
          }
        ],
        blooket: {
          url: 'https://blooket.com/set/123',
          completed: true,
          completionDate: '2024-01-02T00:00:00.000Z'
        },
        origami: {
          name: 'Paper Airplane',
          description: 'Basic origami',
          videoUrl: 'https://youtube.com/origami1',
          reflection: 'Think about flight patterns'
        },
        current: false
      },
      {
        id: '1-2',
        name: 'Topic 1.2',
        description: 'Second topic description',
        videos: [],
        quizzes: [
          {
            questionPdf: 'path/to/questions.pdf',
            answersPdf: 'path/to/answers2.pdf',
            quizId: '1-2_q1',
            completed: true,
            completionDate: '2024-01-03T00:00:00.000Z'
          }
        ],
        blooket: {
          url: 'https://blooket.com/set/456',
          completed: false,
          completionDate: null
        },
        origami: {
          name: 'Paper Boat',
          description: 'Navigate waters',
          videoUrl: 'https://youtube.com/origami2',
          reflection: 'Consider fluid dynamics'
        },
        current: false
      },
      {
        id: '1-capstone',
        name: 'Unit 1 Progress Check',
        description: 'Capstone Assessment',
        videos: [],
        quizzes: [
          {
            answersPdf: 'path/to/capstone.pdf',
            quizId: '1-capstone_q1',
            completed: false,
            completionDate: null
          }
        ],
        blooket: {
          url: '',
          completed: false,
          completionDate: null
        },
        origami: {
          name: 'Award Trophy',
          description: 'Celebrate completion',
          videoUrl: 'https://youtube.com/trophy',
          reflection: 'Reflect on learning journey'
        },
        isCapstone: true,
        current: false
      }
    ]
  },
  {
    unitId: 'unit2',
    displayName: 'Unit 2: Another Test Unit',
    examWeight: '10-15%',
    topics: [
      {
        id: '2-1',
        name: 'Topic 2.1',
        description: 'Unit 2 first topic',
        videos: [
          {
            url: 'https://example.com/video3',
            altUrl: undefined,
            completed: false,
            completionDate: null
          }
        ],
        quizzes: [],
        blooket: {
          url: 'https://blooket.com/set/789',
          completed: false,
          completionDate: null
        },
        origami: {
          name: 'Paper Crane',
          description: 'Symbol of peace',
          videoUrl: 'https://youtube.com/crane',
          reflection: 'Think about patterns'
        },
        current: false
      }
    ]
  }
];

// Mock blockchain service for testing
const mockBlockchainService: BlockchainIntegration = {
  createTransaction: vi.fn().mockReturnValue({ id: 'mock-transaction-id', signature: 'mock-signature' }),
  getState: vi.fn().mockReturnValue({
    isInitialized: true,
    currentKeyPair: {
      publicKey: 'mock-public-key'
    }
  })
};

describe('CurriculumManager', () => {
  let manager: CurriculumManager;

  beforeEach(() => {
    manager = new CurriculumManager(mockCurriculumData);
    vi.clearAllMocks();
  });

  describe('Core Data Access Methods', () => {
    it('should get all units', () => {
      const units = manager.getAllUnits();
      expect(units).toHaveLength(2);
      expect(units[0].unitId).toBe('unit1');
      expect(units[1].unitId).toBe('unit2');
    });

    it('should get a specific unit by ID', () => {
      const unit = manager.getUnit('unit1');
      expect(unit).not.toBeNull();
      expect(unit?.unitId).toBe('unit1');
      expect(unit?.displayName).toBe('Unit 1: Test Unit');
    });

    it('should return null for non-existent unit', () => {
      const unit = manager.getUnit('nonexistent');
      expect(unit).toBeNull();
    });

    it('should get a specific topic within a unit', () => {
      const topic = manager.getTopic('unit1', '1-1');
      expect(topic).not.toBeNull();
      expect(topic?.id).toBe('1-1');
      expect(topic?.name).toBe('Topic 1.1');
    });

    it('should return null for non-existent topic', () => {
      const topic = manager.getTopic('unit1', 'nonexistent');
      expect(topic).toBeNull();
    });

    it('should return null for topic in non-existent unit', () => {
      const topic = manager.getTopic('nonexistent', '1-1');
      expect(topic).toBeNull();
    });
  });

  describe('Progress Tracking Methods', () => {
    it('should calculate total counts correctly', () => {
      const counts = manager.getTotalCounts();
      expect(counts.videos).toBe(3); // 2 in unit1 topic 1-1, 0 in 1-2, 1 in unit2
      expect(counts.quizzes).toBe(3); // 1 in 1-1, 1 in 1-2, 1 in capstone, 0 in unit2
      expect(counts.blookets).toBe(4); // One per topic
    });

    it('should calculate completion stats for entire curriculum', () => {
      const stats = manager.getCompletionStats();
      
      // Videos: 1 completed out of 3 total
      expect(stats.videos.completed).toBe(1);
      expect(stats.videos.total).toBe(3);
      expect(stats.videos.percentage).toBe(33);

      // Quizzes: 1 completed out of 3 total  
      expect(stats.quizzes.completed).toBe(1);
      expect(stats.quizzes.total).toBe(3);
      expect(stats.quizzes.percentage).toBe(33);

      // Blookets: 1 completed out of 4 total
      expect(stats.blookets.completed).toBe(1);
      expect(stats.blookets.total).toBe(4);
      expect(stats.blookets.percentage).toBe(25);

      // Overall: 3 completed out of 10 total
      expect(stats.overall.completed).toBe(3);
      expect(stats.overall.total).toBe(10);
      expect(stats.overall.percentage).toBe(30);
    });

    it('should calculate completion stats for specific unit', () => {
      const stats = manager.getCompletionStats('unit1');
      
      expect(stats.videos.total).toBe(2); // Only unit1 videos
      expect(stats.quizzes.total).toBe(3); // Only unit1 quizzes
      expect(stats.blookets.total).toBe(3); // Only unit1 blookets
    });

    it('should handle empty stats gracefully', () => {
      const emptyManager = new CurriculumManager([]);
      const stats = emptyManager.getCompletionStats();
      
      expect(stats.videos.percentage).toBe(0);
      expect(stats.quizzes.percentage).toBe(0);
      expect(stats.blookets.percentage).toBe(0);
      expect(stats.overall.percentage).toBe(0);
    });
  });

  describe('State Management Methods', () => {
    it('should set current topic correctly', () => {
      manager.setCurrentTopic('unit1', '1-1');
      
      const topic = manager.getTopic('unit1', '1-1');
      expect(topic?.current).toBe(true);
      
      // Other topics should not be current
      const otherTopic = manager.getTopic('unit1', '1-2');
      expect(otherTopic?.current).toBe(false);
    });

    it('should clear previous current topic when setting new one', () => {
      manager.setCurrentTopic('unit1', '1-1');
      manager.setCurrentTopic('unit1', '1-2');
      
      const firstTopic = manager.getTopic('unit1', '1-1');
      const secondTopic = manager.getTopic('unit1', '1-2');
      
      expect(firstTopic?.current).toBe(false);
      expect(secondTopic?.current).toBe(true);
    });

    it('should get current topic correctly', () => {
      manager.setCurrentTopic('unit1', '1-1');
      const current = manager.getCurrentTopic();
      
      expect(current).not.toBeNull();
      expect(current?.unit.unitId).toBe('unit1');
      expect(current?.topic.id).toBe('1-1');
    });

    it('should return null for current topic when none set', () => {
      const current = manager.getCurrentTopic();
      expect(current).toBeNull();
    });

    it('should handle invalid unit/topic in setCurrentTopic', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      manager.setCurrentTopic('invalid', 'invalid');
      expect(consoleSpy).toHaveBeenCalledWith('Invalid unit/topic combination: invalid/invalid');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Convenience Methods', () => {
    it('should get all topics flattened', () => {
      const allTopics = manager.getAllTopics();
      expect(allTopics).toHaveLength(4); // 3 from unit1, 1 from unit2
      
      expect(allTopics[0].unit.unitId).toBe('unit1');
      expect(allTopics[0].topic.id).toBe('1-1');
      expect(allTopics[3].unit.unitId).toBe('unit2');
      expect(allTopics[3].topic.id).toBe('2-1');
    });

    it('should get capstone topics only', () => {
      const capstones = manager.getCapstoneTopics();
      expect(capstones).toHaveLength(1);
      expect(capstones[0].topic.id).toBe('1-capstone');
      expect(capstones[0].topic.isCapstone).toBe(true);
    });

    it('should get topics by completion status', () => {
      const completed = manager.getTopicsByCompletion(true);
      const incomplete = manager.getTopicsByCompletion(false);
      
      // No topics are fully completed in our test data
      expect(completed).toHaveLength(0);
      expect(incomplete).toHaveLength(4);
    });

    it('should search topics by name and description', () => {
      const searchResults = manager.searchTopics('first');
      expect(searchResults).toHaveLength(2); // "First topic" and "Unit 2 first topic"
      
      const topicSearch = manager.searchTopics('Topic 1.1');
      expect(topicSearch).toHaveLength(1);
      expect(topicSearch[0].topic.name).toBe('Topic 1.1');
    });
  });

  describe('Blockchain Integration', () => {
    it('should set blockchain service correctly', () => {
      manager.setBlockchainService(mockBlockchainService);
      // Test is successful if no errors are thrown
      expect(true).toBe(true);
    });

    it('should submit blockchain transaction when marking video completed', async () => {
      manager.setBlockchainService(mockBlockchainService);
      
      const success = await manager.markVideoCompleted('unit1', '1-1', 0, '2024-01-01T00:00:00.000Z');
      expect(success).toBe(true);
      
      // Verify blockchain transaction was created
      expect(mockBlockchainService.createTransaction).toHaveBeenCalledWith({
        type: 'ACTIVITY_COMPLETE',
        payload: {
          unitId: 'unit1',
          topicId: '1-1',
          activityType: 'video',
          activityId: 'https://example.com/video1',
          timestamp: expect.any(Number),
          studentId: 'mock-public-key'
        }
      });
    });

    it('should submit blockchain transaction when marking quiz completed', async () => {
      manager.setBlockchainService(mockBlockchainService);
      
      const success = await manager.markQuizCompleted('unit1', '1-1', 0, '2024-01-01T00:00:00.000Z');
      expect(success).toBe(true);
      
      // Verify blockchain transaction was created
      expect(mockBlockchainService.createTransaction).toHaveBeenCalledWith({
        type: 'ACTIVITY_COMPLETE',
        payload: {
          unitId: 'unit1',
          topicId: '1-1',
          activityType: 'quiz',
          activityId: '1-1_q1',
          timestamp: expect.any(Number),
          studentId: 'mock-public-key'
        }
      });
    });

    it('should submit blockchain transaction when marking blooket completed', async () => {
      manager.setBlockchainService(mockBlockchainService);
      
      const success = await manager.markBlooketCompleted('unit1', '1-1', '2024-01-01T00:00:00.000Z');
      expect(success).toBe(true);
      
      // Verify blockchain transaction was created
      expect(mockBlockchainService.createTransaction).toHaveBeenCalledWith({
        type: 'ACTIVITY_COMPLETE',
        payload: {
          unitId: 'unit1',
          topicId: '1-1',
          activityType: 'blooket',
          activityId: 'https://blooket.com/set/123',
          timestamp: expect.any(Number),
          studentId: 'mock-public-key'
        }
      });
    });

    it('should handle blockchain service not initialized gracefully', async () => {
      const uninitializedService = {
        ...mockBlockchainService,
        getState: vi.fn().mockReturnValue({ isInitialized: false })
      };
      
      manager.setBlockchainService(uninitializedService);
      
      const success = await manager.markVideoCompleted('unit1', '1-1', 0);
      expect(success).toBe(true);
      
      // Should not attempt to create transaction
      expect(uninitializedService.createTransaction).not.toHaveBeenCalled();
    });

    it('should handle blockchain service errors gracefully', async () => {
      const errorService = {
        ...mockBlockchainService,
        createTransaction: vi.fn().mockImplementation(() => {
          throw new Error('Blockchain error');
        })
      };
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      manager.setBlockchainService(errorService);
      
      const success = await manager.markVideoCompleted('unit1', '1-1', 0);
      expect(success).toBe(true); // Should still complete locally
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to submit activity completion to blockchain:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should work without blockchain service (offline mode)', async () => {
      // No blockchain service set
      const success = await manager.markVideoCompleted('unit1', '1-1', 0);
      expect(success).toBe(true);
      
      const topic = manager.getTopic('unit1', '1-1');
      expect(topic?.videos[0].completed).toBe(true);
    });
  });

  describe('Data Mutation Methods', () => {
    it('should mark video as completed', async () => {
      const success = await manager.markVideoCompleted('unit1', '1-1', 0, '2024-01-01T00:00:00.000Z');
      expect(success).toBe(true);
      
      const topic = manager.getTopic('unit1', '1-1');
      expect(topic?.videos[0].completed).toBe(true);
      expect(topic?.videos[0].completionDate).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should mark quiz as completed', async () => {
      const success = await manager.markQuizCompleted('unit1', '1-1', 0, '2024-01-01T00:00:00.000Z');
      expect(success).toBe(true);
      
      const topic = manager.getTopic('unit1', '1-1');
      expect(topic?.quizzes[0].completed).toBe(true);
      expect(topic?.quizzes[0].completionDate).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should mark blooket as completed', async () => {
      const success = await manager.markBlooketCompleted('unit1', '1-1', '2024-01-01T00:00:00.000Z');
      expect(success).toBe(true);
      
      const topic = manager.getTopic('unit1', '1-1');
      expect(topic?.blooket.completed).toBe(true);
      expect(topic?.blooket.completionDate).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should handle invalid indices gracefully', async () => {
      const videoSuccess = await manager.markVideoCompleted('unit1', '1-1', 999);
      const quizSuccess = await manager.markQuizCompleted('unit1', '1-1', 999);
      const invalidTopicSuccess = await manager.markBlooketCompleted('invalid', 'invalid');
      
      expect(videoSuccess).toBe(false);
      expect(quizSuccess).toBe(false);
      expect(invalidTopicSuccess).toBe(false);
    });

    it('should auto-generate completion dates when not provided', async () => {
      const beforeTime = new Date().toISOString();
      await manager.markVideoCompleted('unit1', '1-1', 0);
      const afterTime = new Date().toISOString();
      
      const topic = manager.getTopic('unit1', '1-1');
      const completionDate = topic?.videos[0].completionDate;
      
      expect(completionDate).not.toBeNull();
      expect(completionDate! >= beforeTime).toBe(true);
      expect(completionDate! <= afterTime).toBe(true);
    });
  });
}); 