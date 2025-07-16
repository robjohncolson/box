import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import QuizViewer from '../src/components/QuizViewer';
import type { MCQQuestion, FRQQuestion } from '../src/types/quiz';

// Mock crypto for hash generation
Object.defineProperty(globalThis, 'crypto', {
  value: {
    subtle: {
      digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
    },
  },
});

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

const mockMCQQuestion: MCQQuestion = {
  id: 'U1-L2-Q01',
  type: 'multiple-choice',
  prompt: 'Which of the following is a categorical variable?',
  options: [
    { key: 'A', value: 'Height in inches' },
    { key: 'B', value: 'Weight in pounds' },
    { key: 'C', value: 'Eye color' },
    { key: 'D', value: 'Temperature in Celsius' },
    { key: 'E', value: 'Number of siblings' }
  ],
  answerKey: 'C',
  answerHash: '0000000000000000000000000000000000000000000000000000000000000000',
  reasoning: 'Eye color is a categorical variable because it places individuals into categories.',
  distributionTracker: {
    A: [],
    B: [],
    C: [],
    D: [],
    E: []
  }
};

const mockFRQQuestion: FRQQuestion = {
  id: 'U1-L3-FRQ1',
  type: 'free-response',
  prompt: 'A researcher wants to study the relationship between study time and test scores. Describe how you would design a study to investigate this relationship.',
  solution: {
    parts: [
      {
        partId: 'a',
        description: 'Study design',
        response: 'Use a correlational study design...',
        calculations: []
      }
    ],
    scoring: {
      totalPoints: 4,
      rubric: [
        {
          part: 'a',
          maxPoints: 4,
          criteria: ['Identifies appropriate study design', 'Explains methodology'],
          scoringNotes: 'Must include both design and methodology'
        }
      ]
    }
  },
  distributionTracker: {
    scores: [],
    attempts: []
  }
};

describe('QuizViewer Component', () => {
  const mockOnProgress = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MCQ Rendering', () => {
    it('renders MCQ question with all options', () => {
      render(<QuizViewer question={mockMCQQuestion} onProgress={mockOnProgress} />);
      
      expect(screen.getByText('Which of the following is a categorical variable?')).toBeInTheDocument();
      expect(screen.getByText('Height in inches')).toBeInTheDocument();
      expect(screen.getByText('Weight in pounds')).toBeInTheDocument();
      expect(screen.getByText('Eye color')).toBeInTheDocument();
      expect(screen.getByText('Temperature in Celsius')).toBeInTheDocument();
      expect(screen.getByText('Number of siblings')).toBeInTheDocument();
    });

    it('displays MCQ type indicator', () => {
      render(<QuizViewer question={mockMCQQuestion} onProgress={mockOnProgress} />);
      
      expect(screen.getByText('MCQ')).toBeInTheDocument();
    });

    it('displays question ID', () => {
      render(<QuizViewer question={mockMCQQuestion} onProgress={mockOnProgress} />);
      
      expect(screen.getByText('Question U1-L2-Q01')).toBeInTheDocument();
    });
  });

  describe('FRQ Rendering', () => {
    it('renders FRQ question with prompt', () => {
      render(<QuizViewer question={mockFRQQuestion} onProgress={mockOnProgress} />);
      
      expect(screen.getByText(/A researcher wants to study the relationship/)).toBeInTheDocument();
    });

    it('displays textarea for response input', () => {
      render(<QuizViewer question={mockFRQQuestion} onProgress={mockOnProgress} />);
      
      const textarea = screen.getByLabelText('Your Response');
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('displays copy-to-Grok button', () => {
      render(<QuizViewer question={mockFRQQuestion} onProgress={mockOnProgress} />);
      
      const copyButton = screen.getByText('Copy to Grok');
      expect(copyButton).toBeInTheDocument();
    });

    it('displays FRQ type indicator', () => {
      render(<QuizViewer question={mockFRQQuestion} onProgress={mockOnProgress} />);
      
      expect(screen.getByText('FRQ')).toBeInTheDocument();
    });

    it('displays question ID', () => {
      render(<QuizViewer question={mockFRQQuestion} onProgress={mockOnProgress} />);
      
      expect(screen.getByText('Question U1-L3-FRQ1')).toBeInTheDocument();
    });
  });

  describe('Initial State', () => {
    it('loads with empty answer by default', () => {
      render(<QuizViewer question={mockMCQQuestion} onProgress={mockOnProgress} />);
      
      // Check that no radio buttons are selected
      const radioButtons = screen.getAllByRole('radio');
      radioButtons.forEach(radio => {
        expect(radio).not.toBeChecked();
      });
    });

    it('loads with initial answer when provided', () => {
      render(<QuizViewer question={mockMCQQuestion} onProgress={mockOnProgress} initialAnswer="C" />);
      
      const optionC = screen.getByDisplayValue('C');
      expect(optionC).toBeChecked();
    });

    it('displays save button for FRQ initially disabled', () => {
      render(<QuizViewer question={mockFRQQuestion} onProgress={mockOnProgress} />);
      
      const saveButton = screen.getByText('Save Response');
      expect(saveButton).toBeDisabled();
    });
  });
}); 