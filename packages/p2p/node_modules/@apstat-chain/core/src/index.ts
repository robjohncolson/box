// Main entry point for @apstat-chain/core package
export * from './crypto/index.js';
export * from './chain/index.js';
export * from './block/index.js';
export * from './transaction/index.js';
export * from './attestation/index.js';
export * from './types/index.js';
export * from './tx.js';
export { Wallet } from './crypto/Wallet.js';

// Explicitly re-export from reveals to avoid conflicts
export { 
  triggerAPReveal, 
  updateReputation, 
  detectFlipFlop, 
  calculateConsistencyScore,
  getReputationMetrics,
  isRevealThresholdMet,
  hashMessage,
  resetRevealsData,
  type APRevealTransaction,
  type ReputationMetrics,
  type AttestationHistory,
  type TeacherControls
} from './reveals.js';

export * as gateway from './gateway';

