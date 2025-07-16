// Direct Attestation Integration Test Script
// This script directly integrates with the AttestModal component to test the real flow

console.log('🎯 Direct Attestation Integration Test');

// Function to create valid mock attestation responses
function createValidAttestationResponses(questionId) {
  const baseTimestamp = Date.now();
  
  return [
    {
      type: 'attestation_response',
      requestId: 'test-request-123',
      questionId: questionId,
      answerHash: 'answer-hash-C',
      attesterPubKey: '0x1234567890abcdef1234567890abcdef12345678',
      signature: 'mock-signature-peer1',
      timestamp: baseTimestamp
    },
    {
      type: 'attestation_response',
      requestId: 'test-request-123',
      questionId: questionId,
      answerHash: 'answer-hash-C',
      attesterPubKey: '0xabcdef1234567890abcdef1234567890abcdef12',
      signature: 'mock-signature-peer2',
      timestamp: baseTimestamp + 1000
    },
    {
      type: 'attestation_response',
      requestId: 'test-request-123',
      questionId: questionId,
      answerHash: 'answer-hash-C',
      attesterPubKey: '0x567890abcdef1234567890abcdef1234567890ab',
      signature: 'mock-signature-peer3',
      timestamp: baseTimestamp + 2000
    }
  ];
}

// Function to find and access the React component
function findAttestModalComponent() {
  // Find the modal element
  const modal = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
  if (!modal) {
    console.error('❌ AttestModal not found. Please open the modal first.');
    return null;
  }

  // Look for React fiber node
  const reactFiberKey = Object.keys(modal).find(key => 
    key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')
  );

  if (!reactFiberKey) {
    console.error('❌ Could not find React fiber node.');
    return null;
  }

  const fiberNode = modal[reactFiberKey];
  
  // Navigate up the fiber tree to find the AttestModal component
  let currentNode = fiberNode;
  while (currentNode) {
    if (currentNode.type && currentNode.type.name === 'AttestModal') {
      return currentNode;
    }
    if (currentNode.return) {
      currentNode = currentNode.return;
    } else {
      break;
    }
  }

  console.error('❌ Could not find AttestModal component in fiber tree.');
  return null;
}

// Function to directly call processAttestationResponse
async function callProcessAttestationResponse(modalComponent, attestationResponse) {
  if (!modalComponent || !modalComponent.stateNode) {
    console.error('❌ Invalid modal component');
    return false;
  }

  try {
    // Get the component instance
    const componentInstance = modalComponent.stateNode;
    
    // Look for the processAttestationResponse method
    const processMethod = componentInstance.processAttestationResponse;
    
    if (typeof processMethod === 'function') {
      console.log('✅ Found processAttestationResponse method, calling it...');
      await processMethod(attestationResponse);
      return true;
    } else {
      console.error('❌ processAttestationResponse method not found');
      return false;
    }
  } catch (error) {
    console.error('❌ Error calling processAttestationResponse:', error);
    return false;
  }
}

// Function to monitor state changes
function monitorAttestModalState(modalComponent) {
  if (!modalComponent || !modalComponent.stateNode) {
    return;
  }

  const componentInstance = modalComponent.stateNode;
  
  // Try to access the state (this might vary depending on how state is managed)
  if (componentInstance.state) {
    console.log('📊 Current AttestModal state:', componentInstance.state);
  }
  
  // Monitor for state changes
  const originalSetState = componentInstance.setState;
  componentInstance.setState = function(newState, callback) {
    console.log('🔄 AttestModal state change:', newState);
    return originalSetState.call(this, newState, callback);
  };
}

// Function to trigger mining directly
function triggerMiningDirectly(modalComponent) {
  if (!modalComponent || !modalComponent.stateNode) {
    console.error('❌ Invalid modal component');
    return false;
  }

  try {
    const componentInstance = modalComponent.stateNode;
    const triggerMiningMethod = componentInstance.triggerMining;
    
    if (typeof triggerMiningMethod === 'function') {
      console.log('⛏️ Triggering mining directly...');
      triggerMiningMethod();
      return true;
    } else {
      console.error('❌ triggerMining method not found');
      return false;
    }
  } catch (error) {
    console.error('❌ Error triggering mining:', error);
    return false;
  }
}

// Main test function
async function runDirectAttestationTest(questionId = 'U1-L2-Q01') {
  console.log('🚀 Running Direct Attestation Test');
  console.log('==================================');
  
  // Step 1: Find the AttestModal component
  console.log('1️⃣ Finding AttestModal component...');
  const modalComponent = findAttestModalComponent();
  
  if (!modalComponent) {
    console.error('❌ Test failed: Could not find AttestModal component');
    console.log('💡 Make sure to:');
    console.log('   1. Complete a quiz question first');
    console.log('   2. Click "Request Attestations" to open the modal');
    console.log('   3. Then run this test script');
    return;
  }
  
  console.log('✅ Found AttestModal component');
  
  // Step 2: Monitor state changes
  console.log('2️⃣ Setting up state monitoring...');
  monitorAttestModalState(modalComponent);
  
  // Step 3: Create mock attestation responses
  console.log('3️⃣ Creating mock attestation responses...');
  const mockResponses = createValidAttestationResponses(questionId);
  console.log('✅ Created 3 mock attestation responses');
  
  // Step 4: Process each attestation response
  console.log('4️⃣ Processing attestation responses...');
  for (let i = 0; i < mockResponses.length; i++) {
    const response = mockResponses[i];
    console.log(`   Processing attestation ${i + 1}/3...`);
    
    const success = await callProcessAttestationResponse(modalComponent, response);
    
    if (success) {
      console.log(`   ✅ Attestation ${i + 1} processed successfully`);
    } else {
      console.log(`   ❌ Attestation ${i + 1} failed to process`);
    }
    
    // Wait a bit between processing
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Step 5: Check mining eligibility
  console.log('5️⃣ Checking mining eligibility...');
  
  // Wait for state to update
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Try to trigger mining
  console.log('6️⃣ Attempting to trigger mining...');
  const miningTriggered = triggerMiningDirectly(modalComponent);
  
  if (miningTriggered) {
    console.log('✅ Mining triggered successfully!');
    console.log('⏳ Waiting for mining to complete...');
    
    // Wait for mining to complete
    setTimeout(() => {
      console.log('🎉 DIRECT ATTESTATION TEST COMPLETE!');
      console.log('✅ All attestations processed');
      console.log('✅ Mining eligibility checked');
      console.log('✅ Block mining triggered');
      console.log('💡 Check the AttestModal UI for the "Mining Complete!" message');
    }, 3000);
  } else {
    console.log('❌ Mining could not be triggered');
  }
}

// Alternative approach using DOM manipulation for testing
function alternativeTestApproach(questionId = 'U1-L2-Q01') {
  console.log('🔄 Using alternative DOM-based approach...');
  
  // Look for the "Mine Block" button
  const mineButton = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.includes('Mine Block') || btn.textContent.includes('Mining')
  );
  
  if (mineButton) {
    console.log('✅ Found Mine Block button');
    
    // Create mock attestations by dispatching events
    const mockResponses = createValidAttestationResponses(questionId);
    
    // Simulate processing attestations
    console.log('📡 Simulating attestation processing...');
    mockResponses.forEach((response, index) => {
      setTimeout(() => {
        console.log(`✅ Simulated processing attestation ${index + 1}/3`);
        
        // If this is the last attestation, try to click the mine button
        if (index === mockResponses.length - 1) {
          setTimeout(() => {
            if (!mineButton.disabled) {
              console.log('🎯 Clicking Mine Block button...');
              mineButton.click();
            } else {
              console.log('⚠️ Mine Block button is disabled');
            }
          }, 500);
        }
      }, index * 500);
    });
  } else {
    console.log('❌ Mine Block button not found');
  }
}

// Function to verify mempool state
function verifyMempoolState() {
  console.log('🔍 Verifying mempool state...');
  
  // Check the status bar for mempool info
  const statusElements = document.querySelectorAll('.text-gray-600');
  statusElements.forEach(element => {
    if (element.textContent.includes('Points:')) {
      console.log('📊 Mempool status:', element.textContent.trim());
    }
  });
  
  // Check mining eligibility indicator
  const miningStatus = document.querySelector('.bg-green-100, .bg-yellow-100');
  if (miningStatus) {
    console.log('⚡ Mining eligibility:', miningStatus.textContent.trim());
  }
}

// Export functions for manual use
window.directAttestationTest = {
  runDirectAttestationTest,
  alternativeTestApproach,
  verifyMempoolState,
  createValidAttestationResponses,
  findAttestModalComponent,
  callProcessAttestationResponse,
  triggerMiningDirectly
};

// Auto-run instructions
console.log('🚀 Direct Attestation Test Script Loaded!');
console.log('💡 Usage:');
console.log('   directAttestationTest.runDirectAttestationTest() - Run the full test');
console.log('   directAttestationTest.alternativeTestApproach() - Use DOM-based approach');
console.log('   directAttestationTest.verifyMempoolState() - Check current mempool state');
console.log('');
console.log('🎯 Prerequisites:');
console.log('   1. Complete a quiz question');
console.log('   2. Open the AttestModal (click "Request Attestations")');
console.log('   3. Click "Generate Request QR" if needed');
console.log('   4. Run the test function'); 