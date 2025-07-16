import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import QuizViewer from './components/QuizViewer'

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
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <QuizViewer 
        question={sampleMCQ}
        onProgress={(id, completed) => console.log(`Question ${id} completed: ${completed}`)}
      />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
) 