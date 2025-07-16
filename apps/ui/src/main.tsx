import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import QuizViewer from './components/QuizViewer'
import { generateKeyPair } from '@apstat-chain/core'
import { Mempool, createMCQCompletionTransaction } from '@apstat-chain/core'
import type { MCQCompletionData } from '@apstat-chain/core'

// Sample data for testing
const sampleMCQ = {
  id: 'U1-L2-Q01',
  type: 'multiple-choice' as const,
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

function App() {
  const [keyPair, setKeyPair] = useState<any>(null);
  const [mempool, setMempool] = useState<Mempool | null>(null);
  const [completedQuestions, setCompletedQuestions] = useState<Set<string>>(new Set());

  // Initialize blockchain components
  useEffect(() => {
    const initializeBlockchain = async () => {
      try {
        // Generate user keypair
        const userKeyPair = generateKeyPair();
        setKeyPair(userKeyPair);

        // Create mempool for this user
        const userMempool = new Mempool(userKeyPair.publicKey.hex, 50);
        setMempool(userMempool);

        console.log('Blockchain initialized:', {
          publicKey: userKeyPair.publicKey.hex,
          mempoolThreshold: userMempool.getMiningThreshold()
        });
      } catch (error) {
        console.error('Failed to initialize blockchain:', error);
      }
    };

    initializeBlockchain();
  }, []);

  // Handle quiz completion with blockchain transaction
  const handleQuizCompletion = async (questionId: string, completed: boolean) => {
    console.log(`Question ${questionId} completed: ${completed}`);
    
    if (!completed || !keyPair || !mempool) {
      return;
    }

    try {
      // Create completion transaction
      const completionData: MCQCompletionData = {
        questionId,
        selectedOption: 'C' // This would come from the actual selected answer
      };

      const transaction = createMCQCompletionTransaction(completionData, keyPair.privateKey);
      
      // Add to mempool
      mempool.addTransaction(transaction);
      
      // Update UI state
      setCompletedQuestions(prev => new Set(prev).add(questionId));

      console.log('Transaction created and added to mempool');
      console.log('Mempool status:', {
        totalTransactions: mempool.getTransactionCount(),
        totalPoints: mempool.getTotalPoints(),
        miningEligible: mempool.isMiningEligible()
      });

    } catch (error) {
      console.error('Failed to create completion transaction:', error);
    }
  };

  if (!keyPair || !mempool) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing blockchain...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Simple status bar */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              Wallet: {keyPair.publicKey.hex.substring(0, 16)}...
            </span>
            <span className="text-gray-600">
              Points: {mempool.getTotalPoints()}/{mempool.getMiningThreshold()}
            </span>
            <span className={`px-2 py-1 rounded text-xs ${
              mempool.isMiningEligible() 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {mempool.isMiningEligible() ? 'Mining Eligible' : 'Collecting Points'}
            </span>
          </div>
        </div>

        {/* Quiz component */}
        <QuizViewer 
          question={sampleMCQ}
          onProgress={handleQuizCompletion}
        />
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
) 