# 033. QR Attestation and Mining Integration

- **Status:** Accepted
- **Date:** 1/27/2025

## Context

Building on [ADR-032: QR Sync for Proximity P2P](./032-QR-Sync-for-Proximity-P2P.md) and [ADR-028: Emergent Attestation with Optional Reveals](./028-emergent-attestation-with-optional-reveals.md), we need to integrate QR-based attestation requests with the mining workflow to enable efficient batch attestation and autonomous mining triggers.

The current attestation system requires individual peer-to-peer negotiations for each attestation, which creates coordination overhead and limits scalability. Students need to manually coordinate attestation requests for each completed lesson, leading to fragmented interactions and reduced system efficiency.

Additionally, the mining trigger mechanism lacks clear integration with the attestation quorum system, creating uncertainty about when blocks can be mined and how attestation convergence drives block finalization.

## Decision

We will implement an **Integrated QR Attestation and Mining System** that combines QR-based attestation requests with automatic mining triggers based on quorum achievement and convergence thresholds.

### Batch Attestation Request System

Instead of individual attestation requests, students will batch 5-10 completed lessons into a single attestation request:

```typescript
interface BatchAttestationRequest {
  type: 'batch_attestation_request';
  requestId: string;
  requesterPubKey: string;
  lessons: {
    lessonId: string;
    questionId: string;
    questionType: 'mcq' | 'frq';
    questionText: string;
    answerOptions?: string[];  // For MCQs
    rubricCriteria?: string;   // For FRQs
    difficultyLevel: 1 | 2 | 3 | 4 | 5;
  }[];
  timestamp: number;
  signature: string;
}
```

### QR-Based Attestation Flow

1. **Request Generation**: Student completes 5-10 lessons, generates single QR code containing batch request
2. **Attestation Response**: Peers scan QR code, select 1-3 questions to attest, submit attestation transactions
3. **Distribution Tracking**: System tracks answer distributions for convergence calculation
4. **Mining Trigger**: Automatic block mining when quorum thresholds are met

### Mining Integration Logic

The system will automatically trigger mining when attestation distributions meet convergence and quorum requirements:

```typescript
interface MiningTrigger {
  questionId: string;
  distribution: QuestionDistribution;
  quorumMet: boolean;
  convergenceScore: number;
  readyForMining: boolean;
  requiredAttestations: number;
  achievedAttestations: number;
}

interface MiningEligibility {
  totalQuestions: number;
  questionsReadyForMining: number;
  minimumThreshold: number;  // 60% of questions must be ready
  eligible: boolean;
  estimatedBlockSize: number;
}
```

### Emergent Update Mechanism

The system will track attestation accuracy over time to enable emergent consensus refinement:

```typescript
interface AttestationAccuracy {
  attesterPubKey: string;
  totalAttestations: number;
  convergentAttestations: number;  // Attestations that aligned with final consensus
  accuracy: number;  // convergentAttestations / totalAttestations
  weight: number;    // Reputation-based weight for future attestations
  lastUpdated: number;
}

interface ConsensusUpdate {
  questionId: string;
  previousConsensus: string;
  newConsensus: string;
  convergenceScore: number;
  triggerAttestations: number;
  updateReason: 'new_evidence' | 'ap_reveal' | 'reputation_reweight';
  timestamp: number;
}
```

## Technical Implementation

### QR Code Structure for Attestation Requests

Each attestation request QR code contains:

```typescript
interface AttestationQRPayload {
  type: 'attestation_request';
  version: '1.0';
  requestId: string;
  requesterPubKey: string;
  lessonBatch: {
    lessonId: string;
    questionId: string;
    questionData: string;  // Compressed question content
    expectedAnswerHash?: string;  // For verification tracking
  }[];
  expirationTime: number;
  signature: string;
}
```

### Mining Trigger Algorithm

```typescript
function evaluateMiningEligibility(
  attestationDistributions: Map<string, QuestionDistribution>,
  mempool: CompletionTransaction[]
): MiningEligibility {
  const readyQuestions = Array.from(attestationDistributions.values())
    .filter(distribution => 
      checkQuorum(distribution) && 
      distribution.convergenceScore >= 0.6
    );
  
  const totalQuestions = attestationDistributions.size;
  const minimumThreshold = Math.ceil(totalQuestions * 0.6);
  
  return {
    totalQuestions,
    questionsReadyForMining: readyQuestions.length,
    minimumThreshold,
    eligible: readyQuestions.length >= minimumThreshold,
    estimatedBlockSize: calculateEstimatedBlockSize(mempool, readyQuestions)
  };
}
```

### Convergence Score Calculation

```typescript
function calculateConvergenceScore(attestations: AttestationTransaction[]): number {
  const distributions = groupAttestationsByQuestion(attestations);
  let totalScore = 0;
  
  for (const [questionId, questionAttestations] of distributions) {
    const distribution = calculateQuestionDistribution(questionAttestations);
    totalScore += distribution.convergenceScore;
  }
  
  return totalScore / distributions.size;
}
```

## User Experience Flow

### For Attestation Requesters

1. **Complete Lessons**: Student completes 5-10 lessons in learning session
2. **Generate QR Request**: Single tap generates QR code with batch attestation request
3. **Display QR**: QR code displayed with timer showing expiration (15 minutes)
4. **Monitor Progress**: Real-time feedback shows attestation collection progress
5. **Automatic Mining**: Block automatically mines when quorum thresholds are met

### For Attestation Providers

1. **Scan QR Code**: Peer scans displayed QR code to see attestation request
2. **Select Questions**: Choose 1-3 questions from batch to attest (based on confidence)
3. **Submit Attestations**: Answer questions and submit signed attestations
4. **Track Reputation**: System tracks attestation accuracy for reputation building

## Progressive Quorum System

Following ADR-028's quorum requirements, but optimized for batch processing:

- **Batch Minimum**: Each batch requires 60% of questions to meet individual quorum
- **Individual Quorum**: Each question requires 3-5 attestations based on convergence
- **Mining Threshold**: Block can be mined when batch quorum is achieved
- **Convergence Weighting**: Higher convergence questions need fewer attestations

## Emergent Updates and Consensus Evolution

### Reputation-Weighted Attestations

Over time, attestations from high-reputation peers carry more weight:

```typescript
function calculateWeightedConsensus(
  attestations: AttestationTransaction[],
  reputationMap: Map<string, number>
): WeightedConsensus {
  const weightedVotes = attestations.map(attestation => ({
    answer: attestation.answerHash || attestation.answerText,
    weight: reputationMap.get(attestation.attesterPubKey) || 1.0
  }));
  
  return computeWeightedDistribution(weightedVotes);
}
```

### Consensus Revision Mechanism

When new evidence suggests a different answer is correct:

1. **Threshold Detection**: New attestations create >30% minority consensus
2. **Revision Request**: System generates consensus revision proposal
3. **Re-attestation**: Original attesters can revise their responses
4. **Convergence Update**: New consensus adopted if >80% convergence achieved

## Security and Anti-Gaming Measures

### Sybil Resistance

- **Reputation Staking**: High-reputation attesters have more to lose from incorrect attestations
- **Attestation Limits**: Each peer can only attest to 3 questions per batch
- **Cooldown Periods**: 5-minute cooldown between attestation submissions

### Collusion Prevention

- **Distributed Batching**: Questions in batches are from different units/topics
- **Temporal Dispersal**: Attestations must be submitted over minimum 2-minute window
- **Cross-Validation**: Random subset of attestations verified against teacher ground truth

## Consequences

**Positive:**
- **Reduced Coordination Overhead**: Batch attestation requests eliminate individual negotiations
- **Automatic Mining**: Reduces manual intervention in block creation process
- **Improved Scalability**: 5-10x reduction in QR code interactions per lesson
- **Enhanced Reputation System**: Enables emergent consensus quality improvement
- **Better User Experience**: Clear progress feedback and automatic workflows

**Negative:**
- **Increased Complexity**: More sophisticated quorum and convergence calculations
- **Larger QR Codes**: Batch requests may require 2-3 QR codes for large batches
- **Gaming Vulnerability**: Sophisticated attackers could potentially game reputation system
- **Delayed Finality**: Consensus may evolve after initial block mining

**Risks:**
- **Consensus Thrashing**: Frequent consensus updates could undermine system stability
- **Reputation Centralization**: High-reputation peers could dominate consensus
- **Batch Size Optimization**: Wrong batch sizes could hurt user experience or security
- **QR Code Scanning Reliability**: Poor scanning conditions could block attestation process

## Implementation Strategy

### Phase 1: Core QR Attestation System
- Implement `BatchAttestationRequest` generation and QR encoding
- Build attestation scanning and submission workflow
- Create basic quorum and convergence tracking

### Phase 2: Mining Integration
- Implement automatic mining trigger based on quorum achievement
- Add convergence score calculation to block validation
- Create mining eligibility evaluation system

### Phase 3: Emergent Updates
- Add reputation tracking and weighted consensus
- Implement consensus revision mechanism
- Create emergent update notification system

### Phase 4: Security Hardening
- Add sybil resistance measures
- Implement collusion detection algorithms
- Create teacher verification integration for calibration 