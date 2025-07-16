import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { 
  serializeBlock, 
  deserializeBlock, 
  chunkData, 
  mergeChunks, 
  generateQRCodes, 
  processQRScan,
  calculateBlockDelta,
  QRChunk,
  QRSyncManager,
  Block
} from '../src/qrSync';

// Mock QR code generation and scanning libraries
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockqrcode'),
    toString: vi.fn().mockResolvedValue('mock-qr-string')
  },
  toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockqrcode'),
  toString: vi.fn().mockResolvedValue('mock-qr-string')
}));

vi.mock('jsqr', () => ({
  default: vi.fn().mockReturnValue({
    data: 'mock-qr-data',
    location: {
      topLeftCorner: { x: 0, y: 0 },
      topRightCorner: { x: 100, y: 0 },
      bottomLeftCorner: { x: 0, y: 100 },
      bottomRightCorner: { x: 100, y: 100 }
    }
  })
}));

// Mock navigator.mediaDevices for camera access
Object.defineProperty(global, 'navigator', {
  value: {
    mediaDevices: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: vi.fn().mockReturnValue([
          { stop: vi.fn() }
        ])
      })
    }
  },
  writable: true
});

// Mock window.setInterval and clearInterval
global.setInterval = vi.fn().mockImplementation((callback, delay) => {
  return 123; // Mock interval ID
});

global.clearInterval = vi.fn();

// Mock HTML canvas and video elements
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn().mockImplementation((tag) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue({
            drawImage: vi.fn(),
            getImageData: vi.fn().mockReturnValue({
              data: new Uint8ClampedArray(4),
              width: 1,
              height: 1
            })
          })
        };
      }
      if (tag === 'video') {
        return {
          srcObject: null,
          videoWidth: 640,
          videoHeight: 480,
          play: vi.fn(),
          addEventListener: vi.fn()
        };
      }
      return {};
    })
  },
  writable: true
});

// Mock block data
const mockBlock: Block = {
  header: {
    previousHash: '000000000000000000000000000000000000000000000000000000000000000',
    merkleRoot: '123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0',
    timestamp: 1737974400000,
    blockHeight: 1,
    nonce: 12345
  },
  body: {
    transactions: [
      {
        type: 'completion',
        userId: 'user123',
        questionId: 'q1',
        answer: 'A',
        timestamp: 1737974400000,
        signature: 'mock-signature',
        publicKey: 'mock-public-key'
      }
    ],
    attestations: [
      {
        type: 'attestation',
        questionId: 'q1',
        answerHash: 'hash123',
        attesterPubKey: 'attester-key',
        signature: 'attestation-signature',
        timestamp: 1737974400000
      }
    ],
    quorumData: {
      requiredQuorum: 3,
      achievedQuorum: 5,
      convergenceScore: 85
    }
  },
  signature: 'block-signature',
  producerPubKey: 'producer-key',
  blockId: 'block-123'
};

describe('QR Sync - Block Serialization', () => {
  it('should serialize block to compact binary format', () => {
    const serialized = serializeBlock(mockBlock);
    
    expect(serialized).toBeDefined();
    expect(serialized).toHaveProperty('length');
    expect(serialized.length).toBeLessThan(3072); // Should be under 3KB
    expect(serialized.length).toBeGreaterThan(0);
  });

  it('should deserialize block back to original format', () => {
    const serialized = serializeBlock(mockBlock);
    const deserialized = deserializeBlock(serialized);
    
    expect(deserialized).toEqual(mockBlock);
  });

  it('should handle empty blocks', () => {
    const emptyBlock: Block = {
      ...mockBlock,
      body: {
        transactions: [],
        attestations: [],
        quorumData: {
          requiredQuorum: 0,
          achievedQuorum: 0,
          convergenceScore: 0
        }
      }
    };
    
    const serialized = serializeBlock(emptyBlock);
    const deserialized = deserializeBlock(serialized);
    
    expect(deserialized).toEqual(emptyBlock);
  });
});

describe('QR Sync - Data Chunking', () => {
  it('should chunk large data into multiple pieces', () => {
    const largeData = new Uint8Array(5000); // 5KB data
    largeData.fill(0xFF);
    
    const chunks = chunkData(largeData, 'test-hash');
    
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.length).toBeLessThanOrEqual(3); // Should fit in 2-3 QR codes
    
    chunks.forEach((chunk, index) => {
      expect(chunk.chunkIndex).toBe(index);
      expect(chunk.totalChunks).toBe(chunks.length);
      expect(chunk.blockHash).toBe('test-hash');
      expect(chunk.data).toBeInstanceOf(Uint8Array);
    });
  });

  it('should handle small data in single chunk', () => {
    const smallData = new Uint8Array(100);
    smallData.fill(0xAA);
    
    const chunks = chunkData(smallData, 'small-hash');
    
    expect(chunks.length).toBe(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].totalChunks).toBe(1);
    expect(chunks[0].blockHash).toBe('small-hash');
    expect(chunks[0].data).toEqual(smallData);
  });

  it('should merge chunks back to original data', () => {
    const originalData = new Uint8Array(3000);
    originalData.fill(0x42);
    
    const chunks = chunkData(originalData, 'merge-test');
    const mergedData = mergeChunks(chunks);
    
    expect(mergedData).toEqual(originalData);
  });

  it('should handle chunks received out of order', () => {
    const originalData = new Uint8Array(3000);
    originalData.fill(0x33);
    
    const chunks = chunkData(originalData, 'order-test');
    const shuffledChunks = [...chunks].reverse(); // Reverse order
    
    const mergedData = mergeChunks(shuffledChunks);
    expect(mergedData).toEqual(originalData);
  });

  it('should validate chunk integrity', () => {
    const originalData = new Uint8Array(1000);
    originalData.fill(0x11);
    
    const chunks = chunkData(originalData, 'integrity-test');
    
    // Corrupt a chunk
    chunks[0].data[0] = 0xFF;
    
    expect(() => mergeChunks(chunks)).toThrow('Chunk integrity validation failed');
  });
});

describe('QR Sync - QR Code Generation', () => {
  it('should generate QR codes for block chunks', async () => {
    const serialized = serializeBlock(mockBlock);
    const qrCodes = await generateQRCodes(serialized, mockBlock.blockId);
    
    expect(qrCodes).toBeInstanceOf(Array);
    expect(qrCodes.length).toBeGreaterThan(0);
    expect(qrCodes.length).toBeLessThanOrEqual(3);
    
    qrCodes.forEach(qr => {
      expect(qr).toMatch(/^data:image\/png;base64,/);
    });
  });

  it('should generate single QR for small blocks', async () => {
    const smallBlock = {
      ...mockBlock,
      body: {
        transactions: [],
        attestations: [],
        quorumData: { requiredQuorum: 0, achievedQuorum: 0, convergenceScore: 0 }
      }
    };
    
    const serialized = serializeBlock(smallBlock);
    const qrCodes = await generateQRCodes(serialized, smallBlock.blockId);
    
    expect(qrCodes.length).toBe(1);
  });
});

describe('QR Sync - QR Scanning', () => {
  it('should process QR scan data and return chunk', () => {
    const originalData = new Uint8Array(1000);
    originalData.fill(0x55);
    
    const chunks = chunkData(originalData, 'scan-test');
    const qrData = JSON.stringify({
      ...chunks[0],
      data: Array.from(chunks[0].data) // Convert Uint8Array to array for JSON
    });
    
    const result = processQRScan(qrData);
    
    expect(result).toBeDefined();
    expect(result?.chunkIndex).toBe(0);
    expect(result?.blockHash).toBe('scan-test');
  });

  it('should handle invalid QR data gracefully', () => {
    const invalidData = 'invalid-qr-data';
    const result = processQRScan(invalidData);
    
    expect(result).toBeNull();
  });

  it('should validate chunk structure in QR data', () => {
    const invalidChunk = {
      chunkIndex: 0,
      totalChunks: 1,
      // Missing blockHash and data
    };
    
    const result = processQRScan(JSON.stringify(invalidChunk));
    expect(result).toBeNull();
  });
});

describe('QR Sync - Block Delta Calculation', () => {
  it('should calculate missing blocks between chains', () => {
    const localChain = [mockBlock];
    const remoteHashes = ['block-123', 'block-456', 'block-789'];
    
    const delta = calculateBlockDelta(localChain, remoteHashes);
    
    expect(delta).toEqual(['block-456', 'block-789']);
  });

  it('should handle empty local chain', () => {
    const localChain: Block[] = [];
    const remoteHashes = ['block-123', 'block-456'];
    
    const delta = calculateBlockDelta(localChain, remoteHashes);
    
    expect(delta).toEqual(['block-123', 'block-456']);
  });

  it('should return empty array when chains are synchronized', () => {
    const localChain = [mockBlock];
    const remoteHashes = ['block-123'];
    
    const delta = calculateBlockDelta(localChain, remoteHashes);
    
    expect(delta).toEqual([]);
  });
});

describe('QR Sync Manager', () => {
  let qrSyncManager: QRSyncManager;
  
  beforeEach(() => {
    qrSyncManager = new QRSyncManager();
  });

  afterEach(() => {
    qrSyncManager.cleanup();
  });

  it('should initialize with empty state', () => {
    expect(qrSyncManager.getPendingChunks()).toEqual([]);
    expect(qrSyncManager.isScanning()).toBe(false);
  });

  it('should start and stop scanning', async () => {
    await qrSyncManager.startScanning();
    expect(qrSyncManager.isScanning()).toBe(true);
    
    qrSyncManager.stopScanning();
    expect(qrSyncManager.isScanning()).toBe(false);
  });

  it('should collect chunks and reconstruct blocks', () => {
    const serializedBlock = serializeBlock(mockBlock);
    const chunks = chunkData(serializedBlock, 'manager-test');
    
    chunks.forEach(chunk => {
      qrSyncManager.addChunk(chunk);
    });
    
    const reconstructedBlocks = qrSyncManager.getReconstructedBlocks();
    expect(reconstructedBlocks).toHaveLength(1);
    
    const reconstructedBlock = deserializeBlock(reconstructedBlocks[0]);
    expect(reconstructedBlock).toBeDefined();
    expect(reconstructedBlock.blockId).toBe(mockBlock.blockId);
  });

  it('should handle duplicate chunks gracefully', () => {
    // Clear any existing reconstructed blocks from previous tests
    qrSyncManager.clearReconstructedBlocks();
    
    const serializedBlock = serializeBlock(mockBlock);
    const chunks = chunkData(serializedBlock, 'duplicate-test');
    
    const initialReconstructedCount = qrSyncManager.getReconstructedBlocks().length;
    const initialPendingCount = qrSyncManager.getPendingChunks().length;
    
    // Add same chunk twice
    qrSyncManager.addChunk(chunks[0]);
    qrSyncManager.addChunk(chunks[0]); // Duplicate
    
    // For single chunk blocks, it should be reconstructed immediately
    if (chunks.length === 1) {
      expect(qrSyncManager.getReconstructedBlocks().length).toBe(initialReconstructedCount + 1);
      expect(qrSyncManager.getPendingChunks().length).toBe(initialPendingCount);
    } else {
      // For multi-chunk blocks, should have one pending chunk (not duplicated)
      expect(qrSyncManager.getPendingChunks().length).toBe(initialPendingCount + 1);
    }
  });

  it('should clear pending chunks after reconstruction', () => {
    const originalData = new Uint8Array(1000);
    originalData.fill(0x99);
    
    const chunks = chunkData(originalData, 'clear-test');
    
    chunks.forEach(chunk => {
      qrSyncManager.addChunk(chunk);
    });
    
    expect(qrSyncManager.getPendingChunks()).toHaveLength(0);
    expect(qrSyncManager.getReconstructedBlocks()).toHaveLength(1);
  });
}); 