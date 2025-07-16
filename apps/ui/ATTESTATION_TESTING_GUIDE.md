# Attestation and Mining Flow Testing Guide

This guide explains how to test the complete QR sync and mining flow in the AP Statistics blockchain application.

## Overview

The attestation and mining flow consists of these steps:
1. **Quiz Completion**: User completes a quiz, adding a completion transaction to the mempool
2. **Attestation Request**: User requests attestations from peers via QR codes
3. **Peer Responses**: Peers scan QR codes and provide attestations
4. **Mining Eligibility**: System checks if conditions are met for mining
5. **Block Mining**: A new block is mined and the mempool is cleared

## Testing Prerequisites

Before testing, ensure you have:
1. ✅ Completed a quiz question (adds transaction to mempool)
2. ✅ Mempool shows "Mining Eligible" status (50+ points)
3. ✅ Development server running (`npm run dev`)

## Testing Methods

### Method 1: Built-in Testing Panel (Recommended)

The AttestModal now includes a blue testing panel in development mode.

**Steps:**
1. Complete a quiz question
2. Click "Request Attestations" button
3. Click "Generate Request QR" if needed
4. Look for the blue "🧪 Testing Panel" in the modal
5. Click "Simulate 3 Peers" to mock attestation responses
6. Watch the modal transition through states:
   - `request` → `processing` → `complete`
7. Click "Mine Block" when it becomes available
8. Verify "Mining Complete!" message appears

**What to Expect:**
- Console logs showing each attestation being processed
- Modal UI updating with progress indicators
- Mining eligibility check and block creation
- Success message and modal state change

### Method 2: Browser Console Testing

Use the test scripts directly in the browser console.

**Steps:**
1. Complete a quiz and open the AttestModal
2. Open browser console (F12)
3. Load the direct test script:
   ```javascript
   // Copy and paste contents of direct-attestation-test.js
   ```
4. Run the test:
   ```javascript
   directAttestationTest.runDirectAttestationTest()
   ```

**Alternative Functions:**
```javascript
// Check current mempool state
directAttestationTest.verifyMempoolState()

// Use DOM-based testing approach
directAttestationTest.alternativeTestApproach()

// Test individual components
directAttestationTest.createValidAttestationResponses('U1-L2-Q01')
```

### Method 3: Global Testing Functions

The AttestModal exposes testing functions globally in development mode.

**Steps:**
1. Complete a quiz and open the AttestModal
2. Open browser console
3. Access the global testing interface:
   ```javascript
   // Check current state
   window.attestModalTest.currentState

   // Simulate attestation responses
   window.attestModalTest.simulateAttestationResponses()

   // Manually trigger mining
   window.attestModalTest.triggerMining()

   // Process individual attestation
   window.attestModalTest.processAttestationResponse({
     type: 'attestation_response',
     requestId: 'test-123',
     questionId: 'U1-L2-Q01',
     answerHash: 'answer-hash-C',
     attesterPubKey: '0x1234567890abcdef1234567890abcdef12345678',
     signature: 'mock-signature',
     timestamp: Date.now()
   })
   ```

## Expected Test Results

### Successful Flow
✅ **Quiz Completion**: Transaction added to mempool  
✅ **Attestation Processing**: 3 attestations processed successfully  
✅ **Convergence Check**: High convergence score (100%) achieved  
✅ **Quorum Verification**: Minimum 3 attestations collected  
✅ **Mining Eligibility**: All conditions met for mining  
✅ **Block Creation**: New block mined with proper structure  
✅ **Mempool Clearing**: Mempool cleared after successful mining  

### Console Output Example
```
🎯 Simulating attestation responses for testing...
Processing mock attestation 1/3...
✅ Mock attestation 1 processed successfully
Processing mock attestation 2/3...
✅ Mock attestation 2 processed successfully  
Processing mock attestation 3/3...
✅ Mock attestation 3 processed successfully
⛏️ Triggering mining directly...
🎉 Block mined successfully!
```

### UI State Changes
1. **Request Mode**: Shows QR codes and testing panel
2. **Processing Mode**: Shows attestation progress and convergence scores
3. **Complete Mode**: Shows "Mining Complete!" with green success message

## Troubleshooting

### Common Issues

**❌ "AttestModal not found"**
- Solution: Make sure the modal is open by clicking "Request Attestations"

**❌ "Mining not eligible"**
- Solution: Complete more quiz questions to reach 50+ points

**❌ "processAttestationResponse method not found"**
- Solution: Use the built-in testing panel instead of direct console access

**❌ "Convergence score too low"**
- Solution: The test uses identical answers for high convergence - this is expected

### Debug Commands

```javascript
// Check current mempool status
document.querySelector('.text-gray-600').textContent

// Check mining eligibility indicator
document.querySelector('.bg-green-100, .bg-yellow-100').textContent

// View AttestModal state
window.attestModalTest.currentState

// Log all lessons
window.attestModalTest.lessons
```

## Real-World vs. Test Environment

### Test Environment
- Uses mock attestation responses
- All peers agree on answer "C" for 100% convergence
- Instant processing without network delays
- Development-only testing panel

### Real-World Environment
- Actual peer-to-peer QR code scanning
- Varying attestation responses and convergence scores
- Network latency and connection issues
- Real cryptographic signatures and verification

## Mining Conditions

For mining to be triggered, all conditions must be met:

1. **Mempool Eligibility**: User has 50+ points from quiz completions
2. **Quorum Requirement**: Minimum 3 attestations collected
3. **Convergence Threshold**: 60% of questions must have sufficient convergence
4. **Attestation Quality**: Each question needs convergence score ≥ 60%

## Block Structure

A successfully mined block contains:

```javascript
{
  header: {
    previousHash: '0000...0000',
    merkleRoot: 'calculated-merkle-root',
    timestamp: 1234567890,
    blockHeight: 1,
    nonce: 0
  },
  body: {
    transactions: [/* completion transactions */],
    attestations: [/* 3+ attestation transactions */],
    quorumData: {
      requiredQuorum: 3,
      achievedQuorum: 3,
      convergenceScore: 100
    }
  },
  signature: 'block-signature',
  producerPubKey: 'user-public-key',
  blockId: 'unique-block-id'
}
```

## Next Steps

After successful testing:
1. Implement real P2P networking for QR code exchange
2. Add proper cryptographic signature verification
3. Implement chain synchronization between peers
4. Add persistent storage for the blockchain
5. Enhance UI with real-time updates and notifications

---

**Note**: This testing framework is designed for development and validation purposes. In production, the attestation flow would involve actual peer-to-peer communication and cryptographic verification. 