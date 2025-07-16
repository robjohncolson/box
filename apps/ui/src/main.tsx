import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import QuizViewer from './components/QuizViewer'
import AttestModal from './components/AttestModal'
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
  const [showAttestModal, setShowAttestModal] = useState(false);

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
      console.log('Completed questions:', completedQuestions.size);
      console.log('Should show button:', completedQuestions.size > 0 && mempool.isMiningEligible());

    } catch (error) {
      console.error('Failed to create completion transaction:', error);
    }
  };

  // Handle mining triggered from AttestModal
  const handleMiningTriggered = (blockId: string) => {
    console.log('Mining triggered! Block ID:', blockId);
    
    // Clear mempool after successful mining
    if (mempool) {
      mempool.clear();
    }
    
    // Close the modal
    setShowAttestModal(false);
  };

  // Create lessons data for AttestModal
  const lessons = completedQuestions.size > 0 ? [{
    lessonId: 'U1-L2-Q01',
    questionId: 'U1-L2-Q01',
    questionType: 'mcq' as const,
    questionText: 'Which of the following is a categorical variable?',
    answerOptions: [
      'A) Height in inches',
      'B) Weight in pounds', 
      'C) Eye color',
      'D) Temperature in Celsius',
      'E) Number of siblings'
    ],
    difficultyLevel: 1 as const
  }] : [];

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

        {/* Debug info */}
        <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
          <p>Debug: Completed questions: {completedQuestions.size}</p>
          <p>Debug: Mining eligible: {mempool.isMiningEligible().toString()}</p>
          <p>Debug: Should show button: {(completedQuestions.size > 0 && mempool.isMiningEligible()).toString()}</p>
        </div>

        {/* Request Attestations Button */}
        {completedQuestions.size > 0 && mempool.isMiningEligible() && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg shadow-sm border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">Ready for Attestation</h3>
                <p className="text-sm text-blue-700">
                  You've completed {completedQuestions.size} question(s) and are eligible for mining.
                  Request attestations from peers to proceed.
                </p>
              </div>
              <button
                onClick={() => setShowAttestModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Request Attestations
              </button>
            </div>
          </div>
        )}

        {/* Always show button for testing */}
        {!completedQuestions.size && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg shadow-sm border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-yellow-900">Testing Mode</h3>
                <p className="text-sm text-yellow-700">
                  Button hidden because no completed questions. Try answering the quiz again.
                </p>
              </div>
              <button
                onClick={() => setShowAttestModal(true)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Test Attestations
              </button>
            </div>
          </div>
        )}

        {/* Quiz component */}
        <QuizViewer 
          question={sampleMCQ}
          onProgress={handleQuizCompletion}
        />

        {/* AttestModal */}
        <AttestModal
          isOpen={showAttestModal}
          onClose={() => setShowAttestModal(false)}
          lessons={lessons}
          onMiningTriggered={handleMiningTriggered}
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