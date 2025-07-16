import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
// QR Sync functionality - using direct implementation for now
// import { 
//   generateBlockQRCodes, 
//   scanAndReconstructBlocks, 
//   getQRSyncManager,
//   type QRSyncManager,
//   chunkData,
//   processQRScan 
// } from '@apstat-chain/p2p';
import { 
  createAttestation, 
  updateDistribution, 
  checkQuorum, 
  type AttestationTransaction,
  type QuestionDistribution 
} from '@apstat-chain/core';
import { generateKeyPair } from '@apstat-chain/core';
import type { MCQQuestion, FRQQuestion } from '../types/quiz';

// Mock QR Sync Manager for development
interface QRSyncManager {
  startScanning: () => Promise<void>;
  stopScanning: () => void;
}

// Mock implementations for QR functionality
const mockQRSyncManager: QRSyncManager = {
  startScanning: async () => console.log('Mock QR scanning started'),
  stopScanning: () => console.log('Mock QR scanning stopped')
};

const getQRSyncManager = (): QRSyncManager => mockQRSyncManager;

const chunkData = (data: Uint8Array, hash: string) => {
  return [{
    chunkIndex: 0,
    totalChunks: 1,
    blockHash: hash,
    data: data,
    checksum: 'mock-checksum'
  }];
};

interface AttestModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessons: {
    lessonId: string;
    questionId: string;
    questionType: 'mcq' | 'frq';
    questionText: string;
    answerOptions?: string[];
    rubricCriteria?: string;
    difficultyLevel: 1 | 2 | 3 | 4 | 5;
  }[];
  onMiningTriggered: (blockId: string) => void;
}

interface AttestationState {
  mode: 'request' | 'scan' | 'processing' | 'complete';
  requestId: string;
  qrCodes: string[];
  currentQRIndex: number;
  scannedAttestations: AttestationTransaction[];
  distributions: Map<string, QuestionDistribution>;
  miningEligible: boolean;
  error?: string;
  isLoading: boolean;
}

interface BatchAttestationRequest {
  type: 'batch_attestation_request';
  requestId: string;
  requesterPubKey: string;
  lessons: {
    lessonId: string;
    questionId: string;
    questionType: 'mcq' | 'frq';
    questionText: string;
    answerOptions?: string[];
    rubricCriteria?: string;
    difficultyLevel: 1 | 2 | 3 | 4 | 5;
  }[];
  timestamp: number;
  signature: string;
}

interface AttestationResponse {
  type: 'attestation_response';
  requestId: string;
  questionId: string;
  answerHash?: string;
  answerText?: string;
  attesterPubKey: string;
  signature: string;
  timestamp: number;
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

const AttestModal = ({ isOpen, onClose, lessons, onMiningTriggered }: AttestModalProps) => {
  const [state, setState] = useState<AttestationState>({
    mode: 'request',
    requestId: '',
    qrCodes: [],
    currentQRIndex: 0,
    scannedAttestations: [],
    distributions: new Map(),
    miningEligible: false,
    isLoading: false,
  });

  const [qrSyncManager, setQRSyncManager] = useState<QRSyncManager | null>(null);
  const [userKeyPair, setUserKeyPair] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrRotationInterval = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize user key pair and QR sync manager
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        const keyPair = generateKeyPair();
        setUserKeyPair(keyPair);
        
        const manager = getQRSyncManager();
        setQRSyncManager(manager);
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: `Failed to initialize system: ${error}` 
        }));
      }
    };

    if (isOpen) {
      initializeSystem();
    }
  }, [isOpen]);

  // Generate attestation request and QR codes
  const generateAttestationRequest = useCallback(async () => {
    if (!userKeyPair) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));

      const requestId = `request-${Date.now()}`;
      const batchRequest: BatchAttestationRequest = {
        type: 'batch_attestation_request',
        requestId,
        requesterPubKey: userKeyPair.publicKey.hex,
        lessons,
        timestamp: Date.now(),
        signature: `signature-${requestId}` // TODO: Implement proper signing
      };

      // Serialize and chunk the request
      const serializedRequest = new TextEncoder().encode(JSON.stringify(batchRequest));
      const chunks = chunkData(serializedRequest, requestId);

      // Generate QR codes for each chunk
      const qrCodes: string[] = [];
      for (const chunk of chunks) {
        const chunkJson = JSON.stringify({
          ...chunk,
          data: Array.from(chunk.data)
        });
        
        // Mock QR code generation for development
        const qrDataUrl = `data:image/png;base64,${btoa(chunkJson)}`;
        qrCodes.push(qrDataUrl);
      }

      setState(prev => ({
        ...prev,
        mode: 'request',
        requestId,
        qrCodes,
        currentQRIndex: 0,
        isLoading: false,
      }));

      // Start QR code rotation
      startQRRotation();
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: `Failed to generate request: ${error}`, 
        isLoading: false 
      }));
    }
  }, [userKeyPair, lessons]);

  // Start QR code rotation
  const startQRRotation = useCallback(() => {
    if (qrRotationInterval.current) {
      clearInterval(qrRotationInterval.current);
    }

    qrRotationInterval.current = setInterval(() => {
      setState(prev => ({
        ...prev,
        currentQRIndex: (prev.currentQRIndex + 1) % prev.qrCodes.length
      }));
    }, 3000); // Rotate every 3 seconds
  }, []);

  // Stop QR code rotation
  const stopQRRotation = useCallback(() => {
    if (qrRotationInterval.current) {
      clearInterval(qrRotationInterval.current);
      qrRotationInterval.current = null;
    }
  }, []);

  // Switch to scanning mode
  const switchToScanMode = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));
      
      if (qrSyncManager) {
        await qrSyncManager.startScanning();
      }
      
      setState(prev => ({ 
        ...prev, 
        mode: 'scan', 
        isLoading: false 
      }));
      
      stopQRRotation();
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: `Failed to start scanning: ${error}`, 
        isLoading: false 
      }));
    }
  }, [qrSyncManager, stopQRRotation]);

  // Process scanned attestation response
  const processAttestationResponse = useCallback(async (responseData: AttestationResponse) => {
    try {
      // Create attestation transaction
      const attestationTx: AttestationTransaction = {
        type: 'attestation',
        questionId: responseData.questionId,
        answerHash: responseData.answerHash,
        answerText: responseData.answerText,
        attesterPubKey: responseData.attesterPubKey,
        signature: responseData.signature,
        timestamp: responseData.timestamp
      };

      // Update local state
      setState(prev => {
        const newAttestations = [...prev.scannedAttestations, attestationTx];
        const newDistributions = new Map(prev.distributions);
        
        // Update distribution for this question
        const answer = attestationTx.answerHash || attestationTx.answerText || '';
        const existingDistribution = newDistributions.get(attestationTx.questionId) || null;
        const updatedDistribution = updateDistribution(existingDistribution, answer, attestationTx.questionId);
        newDistributions.set(attestationTx.questionId, updatedDistribution);
        
        // Check mining eligibility
        const readyQuestions = Array.from(newDistributions.values()).filter(distribution => 
          checkQuorum(distribution) && distribution.convergenceScore >= 0.6
        );
        
        const totalQuestions = lessons.length;
        const minimumThreshold = Math.ceil(totalQuestions * 0.6);
        const miningEligible = readyQuestions.length >= minimumThreshold;

        return {
          ...prev,
          scannedAttestations: newAttestations,
          distributions: newDistributions,
          miningEligible,
          mode: miningEligible ? 'complete' : 'processing'
        };
      });
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: `Failed to process attestation: ${error}` 
      }));
    }
  }, [lessons]);

  // Trigger mining when eligible
  const triggerMining = useCallback(async () => {
    if (!state.miningEligible || !userKeyPair) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));

      // Create mock block for mining
      const mockBlock = {
        header: {
          previousHash: '0'.repeat(64),
          merkleRoot: 'mining-merkle-root',
          timestamp: Date.now(),
          blockHeight: 1,
          nonce: 0
        },
        body: {
          transactions: lessons.map(lesson => ({
            type: 'completion',
            lessonId: lesson.lessonId,
            studentPubKey: userKeyPair.publicKey.hex,
            points: 100,
            timestamp: Date.now(),
            signature: `completion-sig-${lesson.lessonId}`
          })),
          attestations: state.scannedAttestations,
          quorumData: {
            requiredQuorum: 3,
            achievedQuorum: state.scannedAttestations.length,
            convergenceScore: Array.from(state.distributions.values())
              .reduce((sum, dist) => sum + dist.convergenceScore, 0) / state.distributions.size
          }
        },
        signature: 'mining-block-signature',
        producerPubKey: userKeyPair.publicKey.hex,
        blockId: `mined-block-${Date.now()}`
      };

      // Simulate mining success
      setTimeout(() => {
        setState(prev => ({ 
          ...prev, 
          mode: 'complete', 
          isLoading: false 
        }));
        onMiningTriggered(mockBlock.blockId);
      }, 2000);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: `Failed to trigger mining: ${error}`, 
        isLoading: false 
      }));
    }
  }, [state.miningEligible, state.scannedAttestations, state.distributions, lessons, userKeyPair, onMiningTriggered]);

  // Handle modal close
  const handleClose = useCallback(() => {
    stopQRRotation();
    if (qrSyncManager) {
      qrSyncManager.stopScanning();
    }
    onClose();
  }, [stopQRRotation, qrSyncManager, onClose]);

  // Initialize request generation on open
  useEffect(() => {
    if (isOpen && userKeyPair && state.mode === 'request' && state.qrCodes.length === 0) {
      generateAttestationRequest();
    }
  }, [isOpen, userKeyPair, state.mode, state.qrCodes.length, generateAttestationRequest]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopQRRotation();
    };
  }, [stopQRRotation]);

  // Development/Testing Functions
  const simulateAttestationResponses = useCallback(async () => {
    if (!userKeyPair || lessons.length === 0) return;

    const questionId = lessons[0].questionId;
    const baseTimestamp = Date.now();
    
    const mockResponses = [
      {
        type: 'attestation_response' as 'attestation_response',
        requestId: state.requestId,
        questionId: questionId,
        answerHash: 'answer-hash-C',
        attesterPubKey: '0x1234567890abcdef1234567890abcdef12345678',
        signature: 'mock-signature-peer1',
        timestamp: baseTimestamp
      },
      {
        type: 'attestation_response' as 'attestation_response',
        requestId: state.requestId,
        questionId: questionId,
        answerHash: 'answer-hash-C',
        attesterPubKey: '0xabcdef1234567890abcdef1234567890abcdef12',
        signature: 'mock-signature-peer2',
        timestamp: baseTimestamp + 1000
      },
      {
        type: 'attestation_response' as 'attestation_response',
        requestId: state.requestId,
        questionId: questionId,
        answerHash: 'answer-hash-C',
        attesterPubKey: '0x567890abcdef1234567890abcdef1234567890ab',
        signature: 'mock-signature-peer3',
        timestamp: baseTimestamp + 2000
      }
    ];

    console.log('🎯 Simulating attestation responses for testing...');
    
    for (let i = 0; i < mockResponses.length; i++) {
      const response = mockResponses[i];
      console.log(`Processing mock attestation ${i + 1}/3...`);
      
      try {
        await processAttestationResponse(response);
        console.log(`✅ Mock attestation ${i + 1} processed successfully`);
      } catch (error) {
        console.error(`❌ Mock attestation ${i + 1} failed:`, error);
      }
      
      // Wait between processing
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }, [userKeyPair, lessons, state.requestId, processAttestationResponse]);

  // Expose functions for testing
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      (window as any).attestModalTest = {
        simulateAttestationResponses,
        processAttestationResponse,
        triggerMining,
        currentState: state,
        lessons
      };
    }
  }, [simulateAttestationResponses, processAttestationResponse, triggerMining, state, lessons]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Attestation Request</CardTitle>
          <CardDescription>
            {state.mode === 'request' && 'Show QR code to peers for attestation'}
            {state.mode === 'scan' && 'Scan attestation responses'}
            {state.mode === 'processing' && 'Processing attestations...'}
            {state.mode === 'complete' && 'Ready for mining!'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {state.error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {state.error}
            </div>
          )}

          {/* Development Testing Panel */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <div className="text-sm font-medium text-blue-800">🧪 Testing Panel</div>
              <div className="text-xs text-blue-600">
                Dev mode only - simulate peer responses
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={simulateAttestationResponses}
                  className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                  disabled={state.isLoading}
                >
                  Simulate 3 Peers
                </button>
                <button
                  onClick={() => {
                    console.log('Current state:', state);
                    console.log('Lessons:', lessons);
                  }}
                  className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                >
                  Log State
                </button>
              </div>
            </div>
          )}

          {/* Request Mode - Show QR Codes */}
          {state.mode === 'request' && (
            <div className="space-y-4">
              <div className="text-center">
                <Label>Batch Request ({lessons.length} lessons)</Label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  {state.qrCodes.length > 0 ? (
                    <div className="space-y-2">
                      <img 
                        src={state.qrCodes[state.currentQRIndex]} 
                        alt={`QR Code ${state.currentQRIndex + 1}`}
                        className="mx-auto w-48 h-48"
                      />
                      <p className="text-sm text-gray-600">
                        QR {state.currentQRIndex + 1} of {state.qrCodes.length}
                        {state.qrCodes.length > 1 && ' (auto-rotating)'}
                      </p>
                    </div>
                  ) : (
                    <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center mx-auto">
                      {state.isLoading ? 'Generating...' : 'No QR Code'}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={generateAttestationRequest}
                  disabled={state.isLoading}
                  variant="outline"
                >
                  {state.isLoading ? 'Generating...' : 'Regenerate QR'}
                </Button>
                <Button 
                  onClick={switchToScanMode}
                  disabled={state.isLoading}
                >
                  Scan Responses
                </Button>
              </div>
            </div>
          )}

          {/* Scan Mode - Camera View */}
          {state.mode === 'scan' && (
            <div className="space-y-4">
              <div className="text-center">
                <Label>Scan Attestation Responses</Label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                    <video 
                      ref={videoRef}
                      className="w-full h-full object-cover rounded-lg"
                      autoPlay
                      playsInline
                    />
                    <canvas 
                      ref={canvasRef}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Scanned: {state.scannedAttestations.length} attestations
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={() => setState(prev => ({ ...prev, mode: 'request' }))}
                    variant="outline"
                  >
                    Back to QR
                  </Button>
                  <Button 
                    onClick={() => setState(prev => ({ ...prev, mode: 'processing' }))}
                    disabled={state.scannedAttestations.length === 0}
                  >
                    Process ({state.scannedAttestations.length})
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Processing Mode - Show Progress */}
          {state.mode === 'processing' && (
            <div className="space-y-4">
              <div className="text-center">
                <Label>Processing Attestations</Label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-3">
                    {lessons.map((lesson, index) => {
                      const distribution = state.distributions.get(lesson.questionId);
                      const hasQuorum = distribution ? checkQuorum(distribution) : false;
                      const convergence = distribution?.convergenceScore || 0;
                      
                      return (
                        <div key={lesson.lessonId} className="flex items-center justify-between text-sm">
                          <span>{lesson.lessonId}</span>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              hasQuorum && convergence >= 0.6 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {hasQuorum && convergence >= 0.6 ? 'Ready' : 'Pending'}
                            </span>
                            <span className="text-gray-500">
                              {Math.round(convergence * 100)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={switchToScanMode}
                  variant="outline"
                >
                  Scan More
                </Button>
                <Button 
                  onClick={triggerMining}
                  disabled={!state.miningEligible || state.isLoading}
                >
                  {state.isLoading ? 'Mining...' : 'Mine Block'}
                </Button>
              </div>
            </div>
          )}

          {/* Complete Mode - Success */}
          {state.mode === 'complete' && (
            <div className="space-y-4">
              <div className="text-center">
                <Label>Mining Complete!</Label>
                <div className="mt-2 p-4 bg-green-50 rounded-lg">
                  <div className="space-y-2">
                    <p className="text-green-800 font-medium">
                      Block successfully mined
                    </p>
                    <p className="text-sm text-green-600">
                      {state.scannedAttestations.length} attestations processed
                    </p>
                    <p className="text-sm text-green-600">
                      {Array.from(state.distributions.values()).filter(d => 
                        checkQuorum(d) && d.convergenceScore >= 0.6
                      ).length} / {lessons.length} lessons ready
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleClose}
                className="w-full"
              >
                Close
              </Button>
            </div>
          )}

          {/* Common Close Button */}
          {state.mode !== 'complete' && (
            <Button 
              onClick={handleClose}
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttestModal; 