import QRCode from 'qrcode';
import jsQR from 'jsqr';
import * as secp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';

// QR code configuration
const QR_SIZE = 256;
const MAX_QR_DATA_SIZE = 2800; // Conservative limit for QR code data
const CHUNK_HEADER_SIZE = 100; // Estimated size for chunk metadata

// Local Block type definition for QR sync
export interface Block {
  readonly header: {
    readonly previousHash: string;
    readonly merkleRoot: string;
    readonly timestamp: number;
    readonly blockHeight: number;
    readonly nonce: number;
  };
  readonly body: {
    readonly transactions: readonly any[];
    readonly attestations: readonly any[];
    readonly quorumData: {
      readonly requiredQuorum: number;
      readonly achievedQuorum: number;
      readonly convergenceScore: number;
    };
  };
  readonly signature: string;
  readonly producerPubKey: string;
  readonly blockId: string;
}

// Local hash function
function hash256(data: Uint8Array): string {
  const hashBytes = sha256(data);
  return secp256k1.etc.bytesToHex(hashBytes);
}

export interface QRChunk {
  chunkIndex: number;
  totalChunks: number;
  blockHash: string;
  data: Uint8Array;
  checksum: string;
}

export interface QRScanResult {
  success: boolean;
  chunk?: QRChunk;
  error?: string;
}

/**
 * Serialize a block to compact binary format
 */
export function serializeBlock(block: Block): Uint8Array {
  // Convert block to JSON string with deterministic ordering
  const blockJson = JSON.stringify(block, (key, value) => {
    if (key === 'bytes' && value instanceof Uint8Array) {
      return Array.from(value);
    }
    return value;
  });
  
  // Convert to UTF-8 bytes
  const encoder = new TextEncoder();
  return encoder.encode(blockJson);
}

/**
 * Deserialize binary data back to block format
 */
export function deserializeBlock(data: Uint8Array): Block {
  const decoder = new TextDecoder();
  const blockJson = decoder.decode(data);
  
  return JSON.parse(blockJson, (key, value) => {
    if (key === 'bytes' && Array.isArray(value)) {
      return new Uint8Array(value);
    }
    return value;
  });
}

/**
 * Calculate SHA-256 checksum for data integrity
 */
function calculateChecksum(data: Uint8Array): string {
  return hash256(data);
}

/**
 * Chunk large data into multiple QR-compatible pieces
 */
export function chunkData(data: Uint8Array, blockHash: string): QRChunk[] {
  const maxChunkSize = MAX_QR_DATA_SIZE - CHUNK_HEADER_SIZE;
  const totalChunks = Math.ceil(data.length / maxChunkSize);
  const chunks: QRChunk[] = [];
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * maxChunkSize;
    const end = Math.min(start + maxChunkSize, data.length);
    const chunkData = data.slice(start, end);
    
    chunks.push({
      chunkIndex: i,
      totalChunks,
      blockHash,
      data: chunkData,
      checksum: calculateChecksum(chunkData)
    });
  }
  
  return chunks;
}

/**
 * Merge chunks back to original data
 */
export function mergeChunks(chunks: QRChunk[]): Uint8Array {
  if (chunks.length === 0) {
    throw new Error('No chunks to merge');
  }
  
  // Sort chunks by index
  const sortedChunks = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
  
  // Validate chunk sequence
  const totalChunks = sortedChunks[0].totalChunks;
  if (sortedChunks.length !== totalChunks) {
    throw new Error(`Missing chunks: expected ${totalChunks}, got ${sortedChunks.length}`);
  }
  
  // Validate chunk integrity
  for (const chunk of sortedChunks) {
    const calculatedChecksum = calculateChecksum(chunk.data);
    if (calculatedChecksum !== chunk.checksum) {
      throw new Error('Chunk integrity validation failed');
    }
  }
  
  // Merge data
  const totalLength = sortedChunks.reduce((sum, chunk) => sum + chunk.data.length, 0);
  const mergedData = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const chunk of sortedChunks) {
    mergedData.set(chunk.data, offset);
    offset += chunk.data.length;
  }
  
  return mergedData;
}

/**
 * Generate QR codes for block data
 */
export async function generateQRCodes(blockData: Uint8Array, blockHash: string): Promise<string[]> {
  const chunks = chunkData(blockData, blockHash);
  const qrCodes: string[] = [];
  
  for (const chunk of chunks) {
    // Convert chunk to JSON string
    const chunkJson = JSON.stringify({
      ...chunk,
      data: Array.from(chunk.data) // Convert Uint8Array to array for JSON
    });
    
    try {
      const qrDataUrl = await QRCode.toDataURL(chunkJson, {
        width: QR_SIZE,
        margin: 2,
        errorCorrectionLevel: 'M'
      });
      qrCodes.push(qrDataUrl);
    } catch (error) {
      throw new Error(`Failed to generate QR code for chunk ${chunk.chunkIndex}: ${error}`);
    }
  }
  
  return qrCodes;
}

/**
 * Process QR scan data and extract chunk information
 */
export function processQRScan(qrData: string): QRChunk | null {
  try {
    const chunkData = JSON.parse(qrData);
    
    // Validate chunk structure
    if (!chunkData || 
        typeof chunkData.chunkIndex !== 'number' ||
        typeof chunkData.totalChunks !== 'number' ||
        typeof chunkData.blockHash !== 'string' ||
        !Array.isArray(chunkData.data) ||
        typeof chunkData.checksum !== 'string') {
      return null;
    }
    
    // Convert array back to Uint8Array
    const chunk: QRChunk = {
      chunkIndex: chunkData.chunkIndex,
      totalChunks: chunkData.totalChunks,
      blockHash: chunkData.blockHash,
      data: new Uint8Array(chunkData.data),
      checksum: chunkData.checksum
    };
    
    // Validate checksum
    const calculatedChecksum = calculateChecksum(chunk.data);
    if (calculatedChecksum !== chunk.checksum) {
      return null;
    }
    
    return chunk;
  } catch (error) {
    return null;
  }
}

/**
 * Calculate block delta between local and remote chains
 */
export function calculateBlockDelta(localChain: Block[], remoteHashes: string[]): string[] {
  const localHashes = new Set(localChain.map(block => block.blockId));
  return remoteHashes.filter(hash => !localHashes.has(hash));
}

/**
 * QR Sync Manager for handling scanning and reconstruction
 */
export class QRSyncManager {
  private pendingChunks: Map<string, QRChunk[]> = new Map();
  private reconstructedBlocks: Uint8Array[] = [];
  private scanning = false;
  private videoStream?: MediaStream;
  private canvas?: HTMLCanvasElement;
  private context?: CanvasRenderingContext2D;
  private scanInterval?: number;
  private reconstructedHashes: Set<string> = new Set();

  /**
   * Initialize video stream for QR scanning
   */
  async startScanning(): Promise<void> {
    if (this.scanning) return;
    
    try {
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Prefer back camera
      });
      
      this.canvas = document.createElement('canvas');
      const context = this.canvas.getContext('2d');
      if (!context) {
        throw new Error('Failed to get 2D context from canvas');
      }
      this.context = context;
      
      this.scanning = true;
      this.startScanLoop();
    } catch (error) {
      throw new Error(`Failed to start camera: ${error}`);
    }
  }

  /**
   * Stop QR scanning and cleanup resources
   */
  stopScanning(): void {
    this.scanning = false;
    
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      delete this.scanInterval;
    }
    
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      delete this.videoStream;
    }
    
    delete this.canvas;
    delete this.context;
  }

  /**
   * Scan loop for detecting QR codes
   */
  private startScanLoop(): void {
    this.scanInterval = window.setInterval(() => {
      if (!this.scanning || !this.videoStream || !this.canvas || !this.context) return;
      
      const video = document.createElement('video');
      video.srcObject = this.videoStream;
      video.play();
      
      video.addEventListener('loadedmetadata', () => {
        this.canvas!.width = video.videoWidth;
        this.canvas!.height = video.videoHeight;
        this.context!.drawImage(video, 0, 0);
        
        const imageData = this.context!.getImageData(0, 0, this.canvas!.width, this.canvas!.height);
        const qrResult = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (qrResult) {
          const chunk = processQRScan(qrResult.data);
          if (chunk) {
            this.addChunk(chunk);
          }
        }
      });
    }, 100); // Scan every 100ms
  }

  /**
   * Add a chunk to pending collection
   */
  addChunk(chunk: QRChunk): void {
    const { blockHash } = chunk;
    
    if (this.reconstructedHashes.has(blockHash)) return;
    
    if (!this.pendingChunks.has(blockHash)) {
      this.pendingChunks.set(blockHash, []);
    }
    
    const chunks = this.pendingChunks.get(blockHash)!;
    
    // Check if chunk already exists
    const existingChunk = chunks.find(c => c.chunkIndex === chunk.chunkIndex);
    if (existingChunk) return;
    
    chunks.push(chunk);
    
    // Check if we have all chunks for this block
    if (chunks.length === chunk.totalChunks) {
      try {
        const reconstructedData = mergeChunks(chunks);
        this.reconstructedBlocks.push(reconstructedData);
        this.pendingChunks.delete(blockHash);
        this.reconstructedHashes.add(blockHash);
      } catch (error) {
        console.error('Failed to reconstruct block:', error);
      }
    }
  }

  /**
   * Get pending chunks for debugging
   */
  getPendingChunks(): QRChunk[] {
    const allChunks: QRChunk[] = [];
    for (const chunks of this.pendingChunks.values()) {
      allChunks.push(...chunks);
    }
    return allChunks;
  }

  /**
   * Get reconstructed blocks
   */
  getReconstructedBlocks(): Uint8Array[] {
    return [...this.reconstructedBlocks];
  }

  /**
   * Clear reconstructed blocks
   */
  clearReconstructedBlocks(): void {
    this.reconstructedBlocks = [];
  }

  /**
   * Check if currently scanning
   */
  isScanning(): boolean {
    return this.scanning;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopScanning();
    this.pendingChunks.clear();
    this.reconstructedBlocks = [];
    this.reconstructedHashes.clear();
  }
}

/**
 * Utility function to create QR sync manager singleton
 */
let qrSyncManager: QRSyncManager | null = null;

export function getQRSyncManager(): QRSyncManager {
  if (!qrSyncManager) {
    qrSyncManager = new QRSyncManager();
  }
  return qrSyncManager;
}

/**
 * Generate QR codes for a block with UI-friendly format
 */
export async function generateBlockQRCodes(block: Block): Promise<{
  qrCodes: string[];
  blockHash: string;
  totalChunks: number;
}> {
  const serializedBlock = serializeBlock(block);
  const qrCodes = await generateQRCodes(serializedBlock, block.blockId);
  
  return {
    qrCodes,
    blockHash: block.blockId,
    totalChunks: qrCodes.length
  };
}

/**
 * Scan and reconstruct blocks from QR codes
 */
export async function scanAndReconstructBlocks(): Promise<Block[]> {
  const manager = getQRSyncManager();
  const reconstructedData = manager.getReconstructedBlocks();
  const blocks: Block[] = [];
  
  for (const data of reconstructedData) {
    try {
      const block = deserializeBlock(data);
      blocks.push(block);
    } catch (error) {
      console.error('Failed to deserialize block:', error);
    }
  }
  
  manager.clearReconstructedBlocks();
  return blocks;
} 