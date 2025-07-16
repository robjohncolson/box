export { P2PNode, type P2PMessage, type TransactionMessage, type BlockMessage } from './p2p-node.js';
export { discoverPeers, discoverPeersWithRetry } from './peer-discovery.js';
export { 
  QRSyncManager, 
  getQRSyncManager, 
  generateBlockQRCodes, 
  scanAndReconstructBlocks,
  serializeBlock,
  deserializeBlock,
  type QRChunk,
  type QRScanResult 
} from './qrSync.js';

