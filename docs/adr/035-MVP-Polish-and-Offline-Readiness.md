# 035. MVP Polish and Offline Readiness

- **Status:** Accepted
- **Date:** 1/28/2025

## Context

With the core MVP architecture established through [ADR-032: QR Sync for Proximity P2P](./032-QR-Sync-for-Proximity-P2P.md), [ADR-033: QR Attestation and Mining Integration](./033-QR-Attestation-and-Mining-Integration.md), and [ADR-031: Local Chain and Leaderboard](./031-local-chain-and-leaderboard.md), we need to prepare the application for real-world deployment and testing, particularly for offline environments and mobile usage scenarios.

The system demonstrates a lean MVP with three core pillars:
1. **QR Sync**: Visual blockchain synchronization for proximity-based P2P
2. **Granular PoK**: Batch attestation requests with quorum-based mining
3. **FRQ Handoff**: Complex question handling with rubric-based attestation

However, the application lacks production-ready polish, robust error handling, and mobile optimization needed for field testing, especially in environments with limited connectivity such as international travel scenarios.

## Decision

We will implement **MVP Polish and Offline Readiness** focusing on production reliability, mobile compatibility, and comprehensive offline functionality for travel testing scenarios.

### Core MVP Architecture Summary

**QR Sync for Proximity P2P**:
- Visual blockchain synchronization through QR codes (~3KB per block)
- Multi-QR chunking for large payloads (2-3 QR codes maximum)
- 3-second rotation intervals with automatic reconstruction
- Merkle tree diff for efficient delta synchronization
- Sneakernet-style data exchange for offline environments

**Granular Proof of Knowledge (PoK)**:
- Batch attestation requests (5-10 lessons per request)
- Quorum requirements: 3+ attestations, 60% convergence threshold
- Mining eligibility when 60% of questions meet individual quorum
- Reputation-weighted consensus with emergent updates
- Points-based progression tracking (50-point mining threshold)

**FRQ Handoff for Complex Questions**:
- Rubric-based attestation for free-response questions
- Peer verification through structured evaluation criteria
- Consensus building through multiple attestation rounds
- Integration with MCQ attestation workflow

### Production Polish Features

**Error Handling and Resilience**:
```typescript
interface ErrorState {
  type: 'network' | 'qr_invalid' | 'attestation_failed' | 'mining_timeout' | 'storage_error';
  message: string;
  recoverable: boolean;
  retryAction?: () => Promise<void>;
  timestamp: number;
}

class ErrorManager {
  private errorHistory: ErrorState[] = [];
  private maxRetries = 3;
  private retryDelay = 1000;

  async handleError(error: ErrorState): Promise<void> {
    // Log error with context
    this.errorHistory.push(error);
    
    // Attempt automatic recovery for recoverable errors
    if (error.recoverable && error.retryAction) {
      await this.retryWithExponentialBackoff(error.retryAction);
    }
    
    // Notify user with actionable feedback
    this.notifyUser(error);
  }

  private async retryWithExponentialBackoff(action: () => Promise<void>): Promise<void> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        await action();
        return;
      } catch (error) {
        if (attempt === this.maxRetries - 1) throw error;
        await this.delay(this.retryDelay * Math.pow(2, attempt));
      }
    }
  }
}
```

**Invalid QR Code Handling**:
- Automatic QR code validation with checksum verification
- Visual feedback for scanning errors (red border, error icon)
- Automatic retry with improved camera focus
- Manual QR code entry fallback for difficult scanning conditions
- Clear error messages: "Invalid QR code", "Corrupted data", "Wrong format"

**UI Feedback and Loading States**:
```typescript
interface LoadingState {
  isLoading: boolean;
  progress?: number;
  stage: 'generating' | 'scanning' | 'processing' | 'mining' | 'syncing';
  message: string;
  estimatedTimeRemaining?: number;
}

const ProgressSpinner = ({ state }: { state: LoadingState }) => (
  <div className="flex flex-col items-center space-y-2">
    <div className="relative">
      <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin border-t-blue-500" />
      {state.progress && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium">{Math.round(state.progress)}%</span>
        </div>
      )}
    </div>
    <p className="text-sm text-gray-600">{state.message}</p>
    {state.estimatedTimeRemaining && (
      <p className="text-xs text-gray-400">
        ~{Math.round(state.estimatedTimeRemaining / 1000)}s remaining
      </p>
    )}
  </div>
);
```

**Progressive Loading States**:
- QR Generation: "Generating attestation request..." (0-30%)
- QR Display: "Waiting for peers..." (30-60%)
- Attestation Processing: "Processing attestations..." (60-90%)
- Mining: "Mining block..." (90-100%)
- Leaderboard Update: "Updating leaderboard..." (100%)

### Mobile Optimization and Capacitor Setup

**Capacitor Integration**:
```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.apstats.chain',
  appName: 'AP Stats Chain',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Camera: {
      permissions: ['camera']
    },
    Storage: {
      group: 'APStatsChain'
    },
    Network: {
      permissions: ['network']
    }
  }
};

export default config;
```

**Mobile-Specific Features**:
- Camera permissions and QR scanning optimization
- Haptic feedback for successful scans and completions
- Background processing for peer discovery
- Offline storage with SQLite for large datasets
- Push notifications for attestation requests

**Responsive Design Enhancements**:
- Touch-optimized QR code display (larger tap targets)
- Swipe gestures for QR code navigation
- Mobile-friendly attestation UI with simplified inputs
- Leaderboard optimized for portrait orientation

### Offline-First Architecture

**Complete Offline Functionality**:
```typescript
interface OfflineCapabilities {
  lessonCompletion: boolean;      // ✓ Complete lessons without network
  qrGeneration: boolean;          // ✓ Generate QR codes offline
  qrScanning: boolean;            // ✓ Scan and process QR codes
  attestationCreation: boolean;   // ✓ Create attestations locally
  blockMining: boolean;           // ✓ Mine blocks with local data
  leaderboardUpdate: boolean;     // ✓ Update local leaderboard
  dataSync: boolean;              // ✓ Sync when connectivity returns
}

class OfflineManager {
  private syncQueue: SyncOperation[] = [];
  private isOnline = navigator.onLine;

  async queueOperation(operation: SyncOperation): Promise<void> {
    this.syncQueue.push(operation);
    if (this.isOnline) {
      await this.processSyncQueue();
    }
  }

  private async processSyncQueue(): Promise<void> {
    while (this.syncQueue.length > 0 && this.isOnline) {
      const operation = this.syncQueue.shift()!;
      try {
        await operation.execute();
      } catch (error) {
        // Return to queue for retry
        this.syncQueue.unshift(operation);
        break;
      }
    }
  }
}
```

**IndexedDB Persistence Strategy**:
- Complete blockchain storage (blocks, transactions, attestations)
- Cached leaderboard data with staleness indicators
- Offline-first lesson completion tracking
- Sync operation queue for network reconnection
- Automatic conflict resolution during sync

**Travel Testing Readiness**:
- **Airplane Mode Support**: Full functionality without network
- **Hotel WiFi Resilience**: Automatic reconnection with queued operations
- **International Roaming**: Minimal data usage with QR-based sync
- **Time Zone Handling**: UTC timestamps with local display
- **Battery Optimization**: Efficient background processing

### End-to-End Testing Strategy

**Critical User Flows**:
1. **Complete Lesson → Attest → Mine → Leaderboard Update**
2. **Offline Lesson Completion → QR Sync → Network Reconciliation**
3. **Invalid QR Recovery → Manual Entry → Successful Attestation**
4. **Mobile Background Processing → Notification → Attestation Response**

**Testing Scenarios**:
- **Connectivity Loss**: Mid-attestation network failure with recovery
- **QR Code Corruption**: Damaged QR codes with automatic retry
- **Concurrent Users**: Multiple students attesting simultaneously
- **Battery Constraints**: Low power mode with reduced functionality
- **Storage Limits**: Full device storage with cleanup routines

### Implementation Strategy

**Phase 1: Core Polish (Week 1)**
- Implement comprehensive error handling system
- Add progress spinners and loading states
- Create invalid QR code recovery flows
- Test offline lesson completion and QR generation

**Phase 2: Mobile Optimization (Week 2)**
- Setup Capacitor with proper permissions
- Implement camera optimization for QR scanning
- Add mobile-specific UI enhancements
- Test on multiple device types and screen sizes

**Phase 3: Travel Testing Preparation (Week 3)**
- Complete offline functionality validation
- Implement sync queue with conflict resolution
- Add international usage optimizations
- Conduct comprehensive end-to-end testing

### Japan Testing Scenarios

**Classroom Environment**:
- **Airport WiFi**: Initial setup and baseline sync
- **Hotel Networks**: Evening sync sessions with rate limiting
- **Classroom Proximity**: QR-based sync without internet
- **Cultural Adaptation**: UI localization for Japanese context

**Technical Validation**:
- **30-Student Classroom**: Simultaneous attestation requests
- **Week-Long Isolation**: Complete offline operation
- **Return Journey**: Bulk synchronization with main network
- **Data Integrity**: Merkle tree validation across all devices

## Benefits

### Educational Impact
- **Reliable Learning**: Consistent experience regardless of connectivity
- **Mobile Accessibility**: Native mobile app experience
- **International Compatibility**: Seamless operation across time zones
- **Peer Collaboration**: Efficient QR-based attestation workflows

### Technical Advantages
- **Offline Resilience**: Complete functionality without network
- **Error Recovery**: Automatic handling of common failure modes
- **Mobile Performance**: Optimized for battery and data usage
- **Data Integrity**: Cryptographic verification of all operations

### Deployment Readiness
- **Production Polish**: Professional error handling and UX
- **Mobile Distribution**: App store ready with proper permissions
- **Field Testing**: Validated in real-world educational scenarios
- **International Deployment**: Ready for global classroom usage

## Consequences

**Positive:**
- **Production Ready**: Robust error handling and user experience
- **Mobile Native**: Full mobile app capabilities with offline support
- **Travel Validated**: Proven functionality in international scenarios
- **Scalable Architecture**: Handles concurrent users and network variability

**Negative:**
- **Complexity Increase**: More sophisticated error handling and sync logic
- **Development Overhead**: Additional testing and mobile-specific features
- **Storage Requirements**: Offline-first requires more local storage
- **Battery Usage**: Background processing and camera usage impact

**Risks:**
- **Mobile Permissions**: App store approval and permission complexity
- **Sync Conflicts**: Potential data conflicts during network reconciliation
- **International Regulations**: Compliance with data protection laws
- **Performance Degradation**: Offline-first architecture may impact speed

## Implementation Timeline

**Immediate (Week 1)**:
- Complete error handling system
- Implement progress feedback UI
- Add QR code validation and recovery

**Short-term (Week 2)**:
- Setup Capacitor mobile packaging
- Optimize camera and QR scanning
- Test offline functionality comprehensively

**Medium-term (Week 3)**:
- Conduct end-to-end testing
- Prepare for Japan travel testing
- Validate international deployment readiness

This ADR establishes the foundation for a production-ready, mobile-optimized, offline-first educational blockchain application suitable for international classroom deployment and travel testing scenarios. 