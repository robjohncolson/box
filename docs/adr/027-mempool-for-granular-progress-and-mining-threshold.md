# ADR-027: Mempool for Granular Progress and Mining Threshold

**Date:** 2025-01-27  
**Status:** Accepted  
**Context:** V2 Development Phase - Blockchain-Powered Student Experience  

## Context

Building on [ADR-026: Granular Progress Transactions for PoK](./026-granular-progress-transactions-for-pok.md), we need a mempool system that serves as a queue for batched completion transactions while implementing a points-based mining threshold system. This mempool bridges the gap between individual question completions and mining eligibility, providing clear motivation for students through leaderboard eligibility and mining rewards.

The current transaction system from ADR-026 handles individual question completions, but lacks:
1. **Accumulation Mechanism**: No system to accumulate points from completed questions
2. **Mining Threshold**: No clear threshold for when students become eligible to mine
3. **Motivational Framework**: No connection to leaderboard eligibility or rewards
4. **Efficient Batching**: No optimization for network efficiency through transaction batching

As outlined in [ADR-016: Priority Transaction Reward for Miners](./016-priority-transaction-reward-for-miners.md), successful miners receive priority transaction processing, creating a direct incentive for mining participation. The mempool system must support this incentive structure while maintaining fair access to mining opportunities.

## Decision

We will implement a **Points-Based Mempool System** with the following architecture:

### Core Mempool Design

```typescript
interface MempoolEntry {
  transaction: CompletionTransaction;
  points: number;
  timestamp: number;
}

interface MempoolState {
  entries: MempoolEntry[];
  totalPoints: number;
  miningThreshold: number;
  userPubKey: string;
}
```

### Points System Integration

**Points Source**: Points are derived from `lessons_export.json` activity contributions:
- **MCQ Completions**: Points = `activity.contribution * 100` (scaled for granularity)
- **FRQ Completions**: Points = `activity.contribution * 100` (scaled for granularity)  
- **Video Activities**: Points = `activity.contribution * 100` (baseline engagement)
- **Blooket Games**: Points = `activity.contribution * 100` (gamification rewards)
- **Origami Activities**: Points = `activity.contribution * 100` (creative engagement)

**Example Point Values**:
- Quiz with 0.5 contribution = 50 points
- Video with 0.3 contribution = 30 points
- Blooket with 0.15 contribution = 15 points
- Origami with 0.05 contribution = 5 points

### Mining Threshold System

**Base Threshold**: 50 points (configurable)
- **Rationale**: Ensures students complete 5-10 substantial questions before mining eligibility
- **Flexibility**: Can be adjusted based on network participation and academic goals
- **Fairness**: Prevents spam mining while maintaining reasonable accessibility

**Dynamic Scaling**: Future enhancement to adjust threshold based on:
- Network participation levels
- Average student progress rates
- Academic calendar considerations

### Motivational Framework

**Leaderboard Eligibility**: 
- Students must reach mining threshold to appear on leaderboards
- Creates clear progression goals with tangible rewards
- Encourages completion of diverse activity types

**Mining Rewards**: Integration with ADR-016 priority transaction system:
- Successful miners receive priority processing for next transaction
- Direct benefit for network participation
- Incentivizes continued engagement with mining process

### Batching Strategy

**Efficient Network Usage**:
- Accumulate 5-10 transactions before considering mining
- Atomic batch processing for network efficiency
- Signature optimization across batch transactions

**Threshold-Based Triggering**:
- Mining becomes available when point threshold is reached
- Automatic batch preparation for optimal network performance
- Clear feedback to students about mining eligibility

## Technical Implementation

### Mempool Class Structure

```typescript
class Mempool {
  private entries: MempoolEntry[];
  private userPubKey: string;
  private readonly miningThreshold: number;
  
  addTransaction(tx: CompletionTransaction): void;
  getTotalPoints(): number;
  isMiningEligible(): boolean;
  prepareBatch(): TransactionBatch | null;
  clear(): void;
}
```

### Point Calculation Logic

```typescript
function calculatePoints(questionId: string, questionType: 'MCQ' | 'FRQ'): number {
  // Lookup activity in lessons_export.json
  const activity = findActivityByQuestionId(questionId);
  if (!activity) return 0;
  
  // Base points from contribution value
  const basePoints = activity.contribution * 100;
  
  // Type-specific multipliers (future enhancement)
  const typeMultiplier = questionType === 'FRQ' ? 1.2 : 1.0;
  
  return Math.floor(basePoints * typeMultiplier);
}
```

### Mining Eligibility Check

```typescript
function isMiningEligible(mempool: Mempool): boolean {
  return mempool.getTotalPoints() >= mempool.miningThreshold &&
         mempool.getTransactionCount() >= 5; // Minimum batch size
}
```

## Implementation Strategy

### Phase 1: Core Mempool System
- Implement `Mempool` class in `packages/core/src/mempool.ts`
- Create point calculation utilities with `lessons_export.json` integration
- Implement mining eligibility logic with configurable thresholds

### Phase 2: Testing & Validation
- Comprehensive Vitest test suite in `packages/core/tests/mempool.test.ts`
- Test point accumulation for MCQ/FRQ transactions
- Validate mining threshold triggering and batch preparation
- Test mempool clearing after successful mining

### Phase 3: UI Integration
- Connect mempool to student progress dashboard
- Display current points and mining eligibility status
- Show progress towards mining threshold with visual indicators
- Integrate with leaderboard visibility logic

### Phase 4: Advanced Features
- Dynamic threshold adjustment based on network conditions
- Enhanced point multipliers for different question types
- Time-based point decay for inactive students
- Advanced batching strategies for optimal network performance

## Benefits

1. **Clear Progression Goals**: Students understand exactly what they need to accomplish to mine
2. **Motivational Framework**: Direct connection between learning activities and mining rewards
3. **Network Efficiency**: Optimal batching reduces P2P network overhead
4. **Leaderboard Integrity**: Mining threshold ensures meaningful participation for ranking
5. **Flexible Configuration**: Threshold can be adjusted for different academic contexts
6. **Fair Access**: Prevents spam mining while maintaining reasonable accessibility

## Consequences

**Positive:**
- Creates clear educational progression with blockchain incentives
- Provides foundation for sophisticated gamification systems
- Enables efficient network resource utilization through batching
- Supports fair competition through threshold-based leaderboard access
- Integrates seamlessly with existing priority transaction reward system

**Negative:**
- Increases complexity of progress tracking and mining eligibility
- Requires careful balance of threshold to maintain accessibility
- May create pressure to rush through content to reach mining threshold
- Additional state management for mempool persistence

**Risk Mitigation:**
- Threshold can be adjusted based on student feedback and participation data
- Points system rewards diverse activity completion rather than just quantity
- UI guidance helps students understand progression requirements
- Clear documentation prevents gaming of the points system

## References

- [ADR-026: Granular Progress Transactions for PoK](./026-granular-progress-transactions-for-pok.md)
- [ADR-016: Priority Transaction Reward for Miners](./016-priority-transaction-reward-for-miners.md)
- [ADR-012: Social Consensus and Proof of Knowledge](./012-social-consensus-and-proof-of-knowledge.md)
- [ADR-015: Mempool Synchronization Protocol](./015-mempool-synchronization-protocol.md)

## Success Criteria

- [ ] Mempool class supports transaction addition and point accumulation
- [ ] Point calculation integrates with `lessons_export.json` activity data
- [ ] Mining eligibility check works with configurable threshold (50 points default)
- [ ] Batch preparation optimizes network efficiency for 5-10 transactions
- [ ] Clear operation empties mempool after successful mining
- [ ] 100% test coverage for core mempool functionality
- [ ] Integration ready for leaderboard eligibility and priority transaction rewards 