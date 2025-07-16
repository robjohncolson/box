import { useState, useEffect, useCallback } from 'react';
import type { MCQQuestion, FRQQuestion } from '../types/quiz';

interface QuizViewerProps {
  question: MCQQuestion | FRQQuestion;
  onProgress: (questionId: string, completed: boolean) => void;
  initialAnswer?: string;
}

interface QuizState {
  currentAnswer: string;
  isCompleted: boolean;
  answerHash?: string;
  error?: string;
  isLoading: boolean;
}

// Hash generation utility
async function generateHash(input: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.padStart(64, '0').substring(0, 64);
  } catch (error) {
    console.error('Hash generation failed:', error);
    throw new Error('Failed to generate hash');
  }
}

// Local storage utilities
function saveQuizProgress(questionId: string, state: Partial<QuizState>) {
  const key = `quiz-progress-${questionId}`;
  const existing = localStorage.getItem(key);
  const currentState = existing ? JSON.parse(existing) : {};
  const newState = { ...currentState, ...state, timestamp: new Date().toISOString() };
  localStorage.setItem(key, JSON.stringify(newState));
}

function loadQuizProgress(questionId: string): Partial<QuizState> | null {
  const key = `quiz-progress-${questionId}`;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : null;
}

const QuizViewer = ({ question, onProgress, initialAnswer }: QuizViewerProps) => {
  const [state, setState] = useState<QuizState>({
    currentAnswer: initialAnswer || '',
    isCompleted: false,
    isLoading: false,
  });

  const [copySuccess, setCopySuccess] = useState(false);

  // Load progress from localStorage on mount
  useEffect(() => {
    const savedProgress = loadQuizProgress(question.id);
    if (savedProgress) {
      setState(prevState => ({
        ...prevState,
        ...savedProgress,
      }));
    }
  }, [question.id]);

  // Generate hash for MCQ answers
  const generateAnswerHash = useCallback(async (answer: string) => {
    if (question.type !== 'multiple-choice') return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));
      const hash = await generateHash(answer);
      setState(prev => ({ 
        ...prev, 
        answerHash: hash, 
        isLoading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Error generating hash', 
        isLoading: false 
      }));
    }
  }, [question.type]);

  // Handle MCQ answer selection
  const handleMCQAnswer = useCallback((answer: string) => {
    setState(prev => ({ ...prev, currentAnswer: answer }));
    generateAnswerHash(answer);
  }, [generateAnswerHash]);

  // Handle FRQ response change
  const handleFRQResponse = useCallback((response: string) => {
    setState(prev => ({ ...prev, currentAnswer: response }));
  }, []);

  // Submit MCQ answer
  const submitMCQAnswer = useCallback(async () => {
    if (!state.answerHash) return;
    
    const newState = { 
      ...state, 
      isCompleted: true 
    };
    
    setState(newState);
    saveQuizProgress(question.id, newState);
    onProgress(question.id, true);
  }, [state, question.id, onProgress]);

  // Save FRQ response
  const saveFRQResponse = useCallback(() => {
    const newState = { 
      ...state, 
      isCompleted: true 
    };
    
    setState(newState);
    saveQuizProgress(question.id, newState);
    onProgress(question.id, true);
  }, [state, question.id, onProgress]);

  // Generate Grok prompt for FRQ
  const generateGrokPrompt = useCallback(() => {
    if (question.type !== 'free-response') return '';
    
    const prompt = `
# AP Statistics FRQ Assistance Request

## Question Information
- **Question ID:** ${question.id}
- **Type:** Free Response Question (FRQ)

## Question Prompt
${question.prompt}

## My Current Response
${state.currentAnswer || '[No response yet]'}

## Context
This is an AP Statistics free response question. Please help me improve my response by:
1. Identifying any missing components or concepts
2. Suggesting improvements to my statistical reasoning
3. Ensuring proper use of statistical terminology
4. Checking that I've addressed all parts of the question

## JSON Context
\`\`\`json
${JSON.stringify({
  questionId: question.id,
  questionType: question.type,
  studentResponse: state.currentAnswer,
  solutionParts: question.solution?.parts?.map(p => ({
    partId: p.partId,
    description: p.description
  })) || [],
  timestamp: new Date().toISOString()
}, null, 2)}
\`\`\`

Please provide specific feedback and guidance for improving this AP Statistics response.
`;
    
    return prompt.trim();
  }, [question, state.currentAnswer]);

  // Copy to clipboard
  const copyToClipboard = useCallback(async () => {
    try {
      const prompt = generateGrokPrompt();
      await navigator.clipboard.writeText(prompt);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to copy to clipboard' 
      }));
    }
  }, [generateGrokPrompt]);

  // Render MCQ component
  const renderMCQ = () => {
    const mcqQuestion = question as MCQQuestion;
    
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold leading-relaxed">
            {mcqQuestion.prompt}
          </h3>
          
          <div className="space-y-3">
            {mcqQuestion.options.map((option) => (
              <label key={option.key} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option.key}
                  checked={state.currentAnswer === option.key}
                  onChange={(e) => handleMCQAnswer(e.target.value)}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="text-base leading-relaxed">
                  <span className="font-medium">{option.key}:</span> {option.value}
                </span>
              </label>
            ))}
          </div>
        </div>

        {state.error && (
          <div className="flex items-center space-x-2 text-red-600 text-sm">
            <span>⚠️</span>
            <span>{state.error}</span>
          </div>
        )}

        {state.currentAnswer && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              {state.answerHash && (
                <span className="text-sm text-gray-600">
                  Hash: {state.answerHash.substring(0, 16)}...
                </span>
              )}
              {state.isLoading && (
                <span className="text-sm text-blue-600">Generating hash...</span>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {state.isCompleted && (
                <span className="text-green-600 font-medium">✓ Completed</span>
              )}
              <button 
                onClick={submitMCQAnswer}
                disabled={!state.answerHash || state.isLoading || state.isCompleted}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Answer
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render FRQ component
  const renderFRQ = () => {
    const frqQuestion = question as FRQQuestion;
    
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold leading-relaxed">
            {frqQuestion.prompt}
          </h3>
          
          <div className="space-y-2">
            <label htmlFor="response" className="block text-base font-medium">
              Your Response
            </label>
            <textarea
              id="response"
              value={state.currentAnswer}
              onChange={(e) => handleFRQResponse(e.target.value)}
              placeholder="Enter your response here..."
              className="w-full min-h-[200px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {state.error && (
          <div className="flex items-center space-x-2 text-red-600 text-sm">
            <span>⚠️</span>
            <span>{state.error}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <button
            onClick={copyToClipboard}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {copySuccess ? (
              <>
                <span className="text-green-600">✓</span>
                <span>Copied!</span>
              </>
            ) : (
              <>
                <span>📋</span>
                <span>Copy to Grok</span>
              </>
            )}
          </button>
          
          <div className="flex items-center space-x-3">
            {state.isCompleted && (
              <span className="text-green-600 font-medium">✓ Saved</span>
            )}
            <button 
              onClick={saveFRQResponse}
              disabled={!state.currentAnswer.trim() || state.isCompleted}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Response
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">Question {question.id}</h2>
          <span className="text-sm text-gray-500 uppercase">
            {question.type === 'multiple-choice' ? 'MCQ' : 'FRQ'}
          </span>
        </div>
        <p className="text-sm text-gray-600">
          {question.type === 'multiple-choice' 
            ? 'Select the best answer and submit your response.' 
            : 'Provide a detailed response to the question prompt.'
          }
        </p>
      </div>
      
      {question.type === 'multiple-choice' ? renderMCQ() : renderFRQ()}
    </div>
  );
};

export default QuizViewer; 