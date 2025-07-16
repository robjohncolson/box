# ADR-031: Local Chain and Leaderboard

**Date:** 2025-01-27  
**Status:** Accepted  
**Context:** V2 Development Phase - Blockchain-Powered Student Experience  

## Context

Building on the foundational emergent consensus model established in [ADR-028: Emergent Attestation with Optional Reveals](./028-emergent-attestation-with-optional-reveals.md) and the block structure defined in [ADR-029: Block Structure for Emergent PoK](./029-block-structure-for-emergent-pok.md), we need to implement local chain persistence and a leaderboard system that incentivizes participation while maintaining the decentralized nature of the system.

The current blockchain implementation from `packages/core/src/chain/index.ts` provides basic block validation and chain management but lacks:
1. **Persistent Storage**: Blocks exist only in memory and are lost on application restart
2. **Leaderboard System**: No mechanism to track and rank student performance
3. **Reputation Scoring**: No way to measure consensus participation quality
4. **Local Performance Tracking**: No efficient way to calculate student rankings

Following the emergent model where "the correct answer will be.. whatever the students agree it to be" (per [ADR-028](./028-emergent-attestation-with-optional-reveals.md)), the leaderboard system must reward both completion progress and consensus participation quality, creating a self-reinforcing cycle of engagement and knowledge validation.

## Decision

We will implement a **Local Chain Persistence and Leaderboard System** with the following components:

### IndexedDB Chain Persistence

**Storage Architecture**:
```typescript
interface ChainStorage {
  blocks: Block[];              // Complete block history
  leaderboard: LeaderboardEntry[];  // Cached leaderboard data
  metadata: {
    chainHeight: number;
    lastUpdate: number;
    totalTransactions: number;
  };
}

interface LeaderboardEntry {
  pubKey: string;
  totalPoints: number;
  reputationScore: number;
  convergenceRate: number;
  lastActivity: number;
  rank: number;
}
```

**Storage Benefits**:
- **Offline Capability**: Complete chain history available without network
- **Performance**: Fast local queries for leaderboard calculations
- **Persistence**: Survives browser refresh and application restart
- **Synchronization**: Efficient diff-based updates during P2P sync

### Leaderboard from Aggregated Transactions

**Points Calculation**:
```typescript
function calculateLeaderboard(chain: Block[]): LeaderboardEntry[] {
  const userStats = new Map<string, UserStats>();
  
  // Aggregate completion transactions
  for (const block of chain) {
    for (const transaction of block.body.transactions) {
      const stats = userStats.get(transaction.userPubKey) || {
        totalPoints: 0,
        completions: 0,
        attestations: 0,
        convergenceHits: 0
      };
      
      // Add points from lesson contributions (ADR-026)
      stats.totalPoints += getTransactionPoints(transaction);
      stats.completions += 1;
      
      userStats.set(transaction.userPubKey, stats);
    }
    
    // Process attestation quality
    for (const attestation of block.body.attestations) {
      const stats = userStats.get(attestation.attesterPubKey) || defaultStats;
      stats.attestations += 1;
      
      // Reward convergence participation
      if (block.body.quorumData.convergenceScore > 70) {
        stats.convergenceHits += 1;
      }
      
      userStats.set(attestation.attesterPubKey, stats);
    }
  }
  
  return Array.from(userStats.entries()).map(([pubKey, stats]) => ({
    pubKey,
    totalPoints: stats.totalPoints,
    reputationScore: calculateReputationScore(stats),
    convergenceRate: stats.convergenceHits / stats.attestations,
    lastActivity: getLastActivity(pubKey, chain),
    rank: 0 // Calculated after sorting
  }));
}
```

**Points Sources**:
- **Completion Transactions**: Points from `lessons_export.json` activity contributions
- **Mining Rewards**: Bonus points for successful block mining
- **Attestation Quality**: Points for participating in high-convergence consensus
- **Consistency Bonus**: Additional points for maintaining reputation score

### Reputation from Convergence Consistency

**Reputation Scoring Algorithm**:
```typescript
function calculateReputationScore(stats: UserStats): number {
  // Base reputation from completion consistency
  const completionRate = stats.completions / getTotalLessons();
  
  // Attestation quality factor
  const attestationQuality = stats.convergenceHits / Math.max(stats.attestations, 1);
  
  // Consistency over time (prevents gaming)
  const consistencyFactor = calculateConsistencyFactor(stats);
  
  // Weighted reputation score (0-100)
  const reputation = Math.min(100, 
    (completionRate * 40) + 
    (attestationQuality * 35) + 
    (consistencyFactor * 25)
  );
  
  return Math.round(reputation);
}
```

**Reputation Components**:
- **Completion Consistency (40%)**: Regular lesson completion without long gaps
- **Attestation Quality (35%)**: Participation in high-convergence consensus decisions
- **Consistency Factor (25%)**: Steady participation over time, prevents gaming

### Chain Class Implementation

**Core Chain Methods**:
```typescript
export class Chain {
  private storage: ChainStorage;
  private db: IDBDatabase;
  
  constructor() {
    this.initializeIndexedDB();
  }
  
  /**
   * Append a new block to the chain with persistence
   */
  async appendBlock(block: Block): Promise<boolean> {
    // Validate block integrity
    if (!verifyBlock(block)) {
      return false;
    }
    
    // Validate chain continuity
    if (!this.validateChainContinuity(block)) {
      return false;
    }
    
    // Persist to IndexedDB
    await this.persistBlock(block);
    
    // Update cached leaderboard
    await this.updateLeaderboard();
    
    return true;
  }
  
  /**
   * Get current leaderboard with caching
   */
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    // Check cache freshness
    if (this.isLeaderboardCacheValid()) {
      return this.storage.leaderboard;
    }
    
    // Recalculate from chain
    const leaderboard = calculateLeaderboard(this.storage.blocks);
    
    // Update cache
    await this.cacheLeaderboard(leaderboard);
    
    return leaderboard;
  }
  
  /**
   * Get user's individual stats
   */
  async getUserStats(pubKey: string): Promise<UserStats | null> {
    const leaderboard = await this.getLeaderboard();
    return leaderboard.find(entry => entry.pubKey === pubKey) || null;
  }
}
```

### IndexedDB Adapter

**Database Schema**:
```javascript
const DB_NAME = 'APStatsChain';
const DB_VERSION = 1;

const schema = {
  blocks: {
    keyPath: 'blockId',
    indexes: [
      { name: 'blockHeight', keyPath: 'header.blockHeight' },
      { name: 'timestamp', keyPath: 'header.timestamp' },
      { name: 'producerPubKey', keyPath: 'producerPubKey' }
    ]
  },
  leaderboard: {
    keyPath: 'pubKey',
    indexes: [
      { name: 'rank', keyPath: 'rank' },
      { name: 'totalPoints', keyPath: 'totalPoints' },
      { name: 'reputationScore', keyPath: 'reputationScore' }
    ]
  },
  metadata: {
    keyPath: 'key'
  }
};
```

**Performance Optimizations**:
- **Indexed Queries**: Fast lookups by block height, user, and timestamp
- **Batch Operations**: Efficient bulk inserts during synchronization
- **Lazy Loading**: Only load blocks when needed for calculations
- **Cache Invalidation**: Smart cache updates to minimize recalculation

## Implementation Strategy

### Phase 1: Core Chain Persistence
- Implement IndexedDB adapter with proper schema
- Create Chain class with appendBlock and basic persistence
- Add chain validation and continuity checks
- Test with mock data and basic operations

### Phase 2: Leaderboard Calculation
- Implement points aggregation from completion transactions
- Add reputation scoring algorithm with convergence tracking
- Create leaderboard caching system for performance
- Test with realistic transaction data

### Phase 3: UI Integration
- Create basic leaderboard table component
- Add real-time updates during chain synchronization
- Implement user stats display and ranking
- Test with multiple users and dynamic updates

## Benefits

### Educational Impact
- **Motivation Through Competition**: Visible progress ranking encourages engagement
- **Consensus Participation**: Reputation system rewards quality attestations
- **Statistical Learning**: Students observe real-time convergence patterns
- **Peer Recognition**: Leaderboard provides social validation for achievement

### Technical Advantages
- **Offline Performance**: Complete functionality without network dependency
- **Efficient Queries**: IndexedDB enables fast leaderboard calculations
- **Persistent State**: Chain survives application restarts and browser sessions
- **Scalable Architecture**: Indexed storage supports large numbers of users

### Emergent System Benefits
- **Self-Reinforcing Engagement**: Leaderboard drives both completion and consensus participation
- **Quality Incentives**: Reputation scoring rewards meaningful contributions
- **Decentralized Validation**: No central authority required for rankings
- **Adaptive Learning**: System learns from student behavior patterns

## Risks and Mitigations

**Risk**: IndexedDB storage limits could be reached with large chains  
**Mitigation**: Implement chain pruning for old blocks, configurable retention policies

**Risk**: Reputation gaming through coordinated attestations  
**Mitigation**: Consistency factor detection, time-based reputation decay

**Risk**: Leaderboard performance degradation with scale  
**Mitigation**: Incremental updates, pagination, and smart caching strategies

**Risk**: Storage corruption could lose student progress  
**Mitigation**: Regular integrity checks, backup mechanisms, and recovery procedures

## Success Criteria

- **Performance**: Leaderboard calculations complete in <100ms for 1000+ students
- **Persistence**: Chain survives 100% of application restarts without data loss
- **Accuracy**: Reputation scores accurately reflect consensus participation quality
- **Engagement**: Students report increased motivation from visible progress tracking
- **Scalability**: System handles 50+ concurrent users without performance degradation

## References

- [ADR-028: Emergent Attestation with Optional Reveals](./028-emergent-attestation-with-optional-reveals.md)
- [ADR-029: Block Structure for Emergent PoK](./029-block-structure-for-emergent-pok.md)
- [ADR-026: Granular Progress Transactions for PoK](./026-granular-progress-transactions-for-pok.md)
- [ADR-027: Mempool for Granular Progress and Mining Threshold](./027-mempool-for-granular-progress-and-mining-threshold.md)
- [IndexedDB API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Reputation System Design Patterns](https://en.wikipedia.org/wiki/Reputation_system)

---

This ADR establishes a comprehensive local chain persistence and leaderboard system that transforms the blockchain from a temporary network state into a persistent, motivating educational tool. The reputation system rewards both completion consistency and consensus participation, creating a self-reinforcing cycle of engagement that supports the emergent knowledge validation model. 