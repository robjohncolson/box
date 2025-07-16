# ADR-034: Optional Reveals and Guardrails

**Date:** 2025-01-27  
**Status:** Accepted  
**Context:** V2 Development Phase - Blockchain-Powered Student Experience  

## Context

Building on [ADR-028: Emergent Attestation with Optional Reveals](./028-emergent-attestation-with-optional-reveals.md), we need to implement optional answer reveals triggered by convergence thresholds, along with reputation-based guardrails to ensure system integrity.

The current emergent attestation system enables decentralized consensus, but lacks mechanisms for:
1. **Anonymous AP Transaction Injection**: Once 50% convergence is achieved, students should be able to inject official AP exam answers anonymously to validate emergent consensus
2. **Reputation System**: Track consistency of student attestations to prevent gaming and flip-flopping behavior
3. **Safeguards**: Implement checks to maintain system integrity while preserving decentralized nature

This system will enable validation of emergent consensus against official standards while maintaining the decentralized trust model and preventing malicious behavior.

## Decision

We will implement an **Optional Reveals and Guardrails System** with the following components:

### Anonymous AP Transaction Injection

```typescript
interface APRevealTransaction {
  type: 'ap-reveal';
  questionId: string;
  officialAnswerHash: string;     // SHA-256 hash of official AP answer
  convergenceAtReveal: number;    // Convergence score when revealed
  signature: string;              // Anonymous signature
  timestamp: number;
}
```

**Trigger Conditions:**
- Convergence score ≥ 50% for a question
- No existing AP reveal for that question
- Valid anonymous signature (teacher or admin role)

### Reputation System

```typescript
interface ReputationMetrics {
  userPubKey: string;
  totalAttestations: number;
  consistencyScore: number;       // 0-100 based on answer stability
  flipFlopCount: number;          // Number of answer changes
  accuracyScore: number;          // Alignment with emergent consensus
  lastUpdated: number;
}

interface AttestationHistory {
  questionId: string;
  userPubKey: string;
  attestationHistory: Array<{
    answerHash: string;
    timestamp: number;
    blockHeight: number;
  }>;
}
```

**Reputation Calculations:**
- **Consistency Score**: Penalize frequent answer changes (flip-flops)
- **Accuracy Score**: Reward alignment with final emergent consensus
- **Flip-Flop Detection**: Track answer changes within sliding time windows

### Guardrails and Safeguards

1. **Flip-Flop Prevention**:
   - Maximum 3 answer changes per question per user
   - Exponential time penalties for rapid changes
   - Reputation penalties for excessive flip-flopping

2. **Sybil Attack Prevention**:
   - Minimum time between attestations from same user
   - Reputation weighting in consensus calculations
   - Anomaly detection for suspicious patterns

3. **Consensus Validation**:
   - Cross-reference emergent consensus with AP reveals
   - Flag significant discrepancies for review
   - Maintain audit trails for all attestations

### Teacher Toggle UI

```typescript
interface TeacherControls {
  canTriggerReveal: boolean;      // Permission to inject AP answers
  viewReputationMetrics: boolean; // Access to reputation dashboard
  moderateAttestations: boolean;  // Flag suspicious behavior
}
```

## Implementation Details

### Core Functions

1. **Reveal Trigger**: `triggerAPReveal(questionId: string, officialAnswer: string, teacherKey: PrivateKey)`
2. **Reputation Update**: `updateReputation(userPubKey: string, attestation: AttestationTransaction)`
3. **Flip-Flop Detection**: `detectFlipFlop(userPubKey: string, questionId: string, newAnswer: string)`

### Data Storage

- **Reputation Metrics**: Stored in blockchain as special transactions
- **Attestation History**: Indexed by user and question for efficiency
- **AP Reveals**: Immutable records of official answer injections

### Privacy Considerations

- AP reveals use anonymous signatures to protect teacher identity
- Reputation metrics are public for transparency
- Attestation history maintains user privacy while enabling verification

## Consequences

### Benefits

1. **Validation Mechanism**: Emergent consensus can be validated against official standards
2. **Quality Assurance**: Reputation system incentivizes honest participation
3. **Gaming Prevention**: Guardrails prevent manipulation and abuse
4. **Educational Value**: Students learn from consensus validation
5. **Transparency**: Public reputation metrics build trust

### Risks

1. **Centralization Risk**: Teacher reveal authority introduces centralized element
2. **Privacy Concerns**: Reputation tracking may discourage experimentation
3. **Complexity**: Additional system components increase maintenance burden
4. **Performance**: Reputation calculations may impact system performance

### Mitigation Strategies

1. **Distributed Authority**: Multiple teachers can trigger reveals independently
2. **Reputation Decay**: Older attestations have less weight in reputation calculations
3. **Modular Design**: Guardrails can be disabled or modified as needed
4. **Optimization**: Efficient algorithms for reputation calculations

## Testing Strategy

1. **Unit Tests**: Test individual functions for reveal triggers and reputation calculations
2. **Integration Tests**: Test interaction between attestations and reputation updates
3. **Scenario Tests**: Test edge cases like rapid flip-flopping and sybil attacks
4. **Performance Tests**: Ensure reputation calculations don't impact system performance

## Future Considerations

1. **Machine Learning**: Advanced anomaly detection for suspicious patterns
2. **Gamification**: Reputation-based rewards and achievements
3. **Cross-Question Analysis**: Reputation patterns across multiple questions
4. **Community Governance**: Decentralized moderation mechanisms

This system maintains the decentralized nature of emergent consensus while providing necessary safeguards and validation mechanisms for educational integrity. 