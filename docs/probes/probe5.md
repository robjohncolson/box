# Trace data flow for transactions and state
_Exported on 7/2/2025 at 12:13:04 EDT from Cursor (1.1.7)_

---

**User**

"Trace the 'Create Transaction' Data Flow: Describe, step-by-step, what happens when a user clicks a checkbox in the TopicCard component. List each major function call across the different files, starting from the onCheckedChange event handler and ending with the BlockchainService adding a transaction to the mempool."
"Trace the 'State Rehydration' Data Flow: Describe, step-by-step, what happens when the application starts up for a returning user (with a mnemonic in localStorage). List each major function call that results in the UI displaying pre-checked boxes, starting from App.tsx's useEffect hook."

---

**Cursor**

I'll help you trace these two critical data flows in your application. Let me start by examining the key components and their interactions.

Based on my analysis of the codebase, I'll trace both data flows step-by-step, showing the major function calls and file interactions.

## **"Create Transaction" Data Flow**

When a user clicks a checkbox in the TopicCard component, here's the complete step-by-step flow:

### 1. **TopicCard Component** (`apps/ui/src/components/TopicCard.tsx`)
```typescript
// User clicks checkbox → onCheckedChange event triggered
<Checkbox
  onCheckedChange={(checked: boolean) => handleItemCompletion('video', videoId, !!checked)}
/>
```

### 2. **handleItemCompletion Function** (`TopicCard.tsx:15-25`)
```typescript
const handleItemCompletion = async (itemType: 'video' | 'quiz', itemId: string, completed: boolean) => {
  // Step 2a: Optimistic local state update
  const activity = itemType === 'video' 
    ? topic.videos.find((v: VideoActivity) => v.url === itemId || v.altUrl === itemId)
    : topic.quizzes.find((q: QuizActivity) => q.quizId === itemId);

  if (activity) {
    activity.completed = completed;
    onUpdate(); // Tell parent to refresh UI immediately
  }
  
  // Step 2b: Call gateway to persist to blockchain
  await gateway.saveCompletion(unitId, itemId, itemType);
};
```

### 3. **Gateway saveCompletion** (`packages/core/src/gateway.ts:25-42`)
```typescript
export const saveCompletion = async (unitId: string, itemId: string, itemType: string) => {
  console.log(`GATEWAY: Received request to save ${itemType} ${itemId}. Forwarding to BlockchainService.`);
  
  // Step 3: Forward to BlockchainService with structured payload
  blockchainServiceInstance.createTransaction({
    type: 'ACTIVITY_COMPLETE',
    payload: {
      unitId: unitId,
      activityId: itemId,        // itemId mapped to activityId
      activityType: itemType,
    },
  });
};
```

### 4. **BlockchainService createTransaction** (`apps/ui/src/services/BlockchainService.ts:296-363`)
```typescript
public createTransaction(txData: { type: string; payload: any }): Transaction | null {
  // Step 4a: Validate user has keypair
  if (!this.state.currentKeyPair) {
    throw new Error('No wallet initialized...');
  }

  // Step 4b: Check for duplicate completion
  const activityId = txData.payload.activityId;
  if (this.hasUserCompleted(activityId)) {
    console.log(`User has already completed this activity (${activityId}). Transaction not created.`);
    return null;
  }

  // Step 4c: Handle priority transaction rewards
  let finalPayload = { ...txData.payload, type: txData.type };
  if (this.state.currentKeyPair.publicKey.hex === this.state.lastBlockMiner) {
    finalPayload = { ...finalPayload, isPriority: true };
  }

  // Step 4d: Create cryptographic transaction
  const transaction = createTransaction(this.state.currentKeyPair.privateKey, finalPayload);
  
  // Step 4e: Add to mempool
  this.updateState({
    pendingTransactions: [...this.state.pendingTransactions, transaction]
  });

  // Step 4f: Broadcast to P2P network
  if (this.state.p2pNode) {
    this.state.p2pNode.broadcastTransaction(transaction);
  }

  return transaction;
}
```

### 5. **updateState with Mempool Persistence** (`BlockchainService.ts:145-189`)
```typescript
private updateState(updates: Partial<BlockchainState>): void {
  this.state = { ...this.state, ...updates };
  
  // Step 5: Save mempool to localStorage when pendingTransactions change
  if (updates.pendingTransactions) {
    try {
      localStorage.setItem(
        BlockchainService.MEMPOOL_STORAGE_KEY,
        JSON.stringify(this.state.pendingTransactions)
      );
    } catch (error) {
      console.warn('Failed to save mempool to localStorage:', error);
    }
  }
  
  this.notify(); // Notify UI subscribers
}
```

---

## **"State Rehydration" Data Flow**

When the application starts up for a returning user with a mnemonic in localStorage:

### 1. **App.tsx useEffect Hook** (`apps/ui/src/App.tsx:137-144`)
```typescript
useEffect(() => {
  // Step 1: Check for saved mnemonic on startup
  const savedMnemonic = localStorage.getItem('apstat-mnemonic');
  if (savedMnemonic) {
    // If we find a mnemonic, initialize the app with it
    handleWalletInitialized(savedMnemonic);
  } else {
    // Otherwise, show the onboarding screen
    setAppState('onboarding');
  }
}, []);
```

### 2. **handleWalletInitialized Function** (`App.tsx:62-132`)
```typescript
const handleWalletInitialized = async (mnemonic: string) => {
  console.log('APP_CONTROLLER: Wallet phrase received. Initializing backend services...');
  
  // Step 2a: Get BlockchainService instance
  const service = BlockchainService.getInstance();
  blockchainService.current = service;
  
  // Step 2b: Restore wallet from mnemonic
  try {
    await service.restoreWallet(mnemonic);
  } catch (error) {
    await service.generateNewWallet();
  }

  // Step 2c: Load chain from localStorage
  // @ts-ignore - Accessing private method for initialization
  service.loadChainFromStorage();

  // Step 2d: Initialize P2P network
  service.initializeP2P();

  // Step 2e: Initialize Gateway with service
  gateway.initializeGateway(service);
```

### 3. **loadChainFromStorage** (`BlockchainService.ts:62-81`)
```typescript
private loadChainFromStorage() {
  if (this.state.currentKeyPair) {
    const publicKey = this.state.currentKeyPair.publicKey.hex;
    const chainData = localStorage.getItem(`apstat-chain-${publicKey}`);
    if (chainData) {
      try {
        // Step 3: Restore blockchain state from localStorage
        const blocks = JSON.parse(chainData);
        this.state.blockchain.replaceChain(blocks);
        console.log('BLOCKCHAIN_SERVICE: Chain state loaded from local storage.');
        
        // Clear mempool after loading chain
        this.updateState({ pendingTransactions: [] });
      } catch (error) {
        console.warn('Failed to parse chain data from localStorage:', error);
      }
    }
  }
}
```

### 4. **State Rehydration Logic** (`App.tsx:92-131`)
```typescript
// Step 4a: Get curriculum template
const curriculumTemplate = await gateway.getCurriculumData();

// Step 4b: Get on-chain completions
const completedIds = await gateway.getOnChainCompletions();

// Step 4c: Create deep copy of template
const rehydratedUnits = JSON.parse(JSON.stringify(curriculumTemplate));

// Step 4d: Update completion status based on blockchain data
rehydratedUnits.forEach((unit: CurriculumUnit) => {
  unit.topics.forEach(topic => {
    topic.videos.forEach(video => {
      const videoId = video.url || video.altUrl;
      if (videoId && completedIds.has(videoId)) {
        video.completed = true;  // ✅ Checkbox will be pre-checked
      }
    });
    topic.quizzes.forEach(quiz => {
      if (completedIds.has(quiz.quizId)) {
        quiz.completed = true;   // ✅ Checkbox will be pre-checked
      }
    });
  });
});

// Step 4e: Set rehydrated state and render dashboard
setUnits(rehydratedUnits);
setAppState('dashboard');
```

### 5. **getOnChainCompletions via Gateway** (`gateway.ts:103-117`)
```typescript
export const getOnChainCompletions = async (): Promise<Set<string>> => {
  // Step 5: Delegate to BlockchainService to get completion state
  return blockchainServiceInstance.getCompletionState();
};
```

### 6. **getCompletionState** (`BlockchainService.ts:1156-1179`)
```typescript
public getCompletionState(): Set<string> {
  const completedIds = new Set<string>();
  const currentKeyPair = this.getCurrentKeyPair();
  if (!currentKeyPair) return completedIds;

  const authorPublicKey = currentKeyPair.publicKey.hex;

  // Step 6: Scan entire blockchain for user's completed activities
  this.state.blockchain.getChain().forEach(block => {
    block.transactions.forEach(tx => {
      if (tx.publicKey === authorPublicKey && tx.payload.activityId) {
        completedIds.add(tx.payload.activityId); // Collect activity IDs
      }
    });
  });
  
  return completedIds; // Returns Set of completed activity IDs
}
```

### 7. **UI Renders with Pre-checked Boxes**
The rehydrated curriculum data with `completed: true` flags causes the TopicCard components to render with checkboxes in the checked state, completing the state rehydration flow.

---

## **Key Architectural Patterns**

1. **Optimistic Updates**: UI updates immediately, blockchain follows asynchronously
2. **Gateway Pattern**: Core package provides clean interface between UI and blockchain
3. **State Persistence**: Both mempool (pending) and chain (confirmed) data persist to localStorage
4. **Graceful Degradation**: System works even if blockchain operations fail
5. **Event-Driven Updates**: UI subscribes to blockchain state changes for reactive updates

```typescript
// User clicks checkbox → onCheckedChange event triggered
<Checkbox
  onCheckedChange={(checked: boolean) => handleItemCompletion('video', videoId, !!checked)}
/>
```

```typescript
const handleItemCompletion = async (itemType: 'video' | 'quiz', itemId: string, completed: boolean) => {
  // Step 2a: Optimistic local state update
  const activity = itemType === 'video' 
    ? topic.videos.find((v: VideoActivity) => v.url === itemId || v.altUrl === itemId)
    : topic.quizzes.find((q: QuizActivity) => q.quizId === itemId);

  if (activity) {
    activity.completed = completed;
    onUpdate(); // Tell parent to refresh UI immediately
  }
  
  // Step 2b: Call gateway to persist to blockchain
  await gateway.saveCompletion(unitId, itemId, itemType);
};
```

```typescript
export const saveCompletion = async (unitId: string, itemId: string, itemType: string) => {
  console.log(`GATEWAY: Received request to save ${itemType} ${itemId}. Forwarding to BlockchainService.`);
  
  // Step 3: Forward to BlockchainService with structured payload
  blockchainServiceInstance.createTransaction({
    type: 'ACTIVITY_COMPLETE',
    payload: {
      unitId: unitId,
      activityId: itemId,        // itemId mapped to activityId
      activityType: itemType,
    },
  });
};
```

```typescript
public createTransaction(txData: { type: string; payload: any }): Transaction | null {
  // Step 4a: Validate user has keypair
  if (!this.state.currentKeyPair) {
    throw new Error('No wallet initialized...');
  }

  // Step 4b: Check for duplicate completion
  const activityId = txData.payload.activityId;
  if (this.hasUserCompleted(activityId)) {
    console.log(`User has already completed this activity (${activityId}). Transaction not created.`);
    return null;
  }

  // Step 4c: Handle priority transaction rewards
  let finalPayload = { ...txData.payload, type: txData.type };
  if (this.state.currentKeyPair.publicKey.hex === this.state.lastBlockMiner) {
    finalPayload = { ...finalPayload, isPriority: true };
  }

  // Step 4d: Create cryptographic transaction
  const transaction = createTransaction(this.state.currentKeyPair.privateKey, finalPayload);
  
  // Step 4e: Add to mempool
  this.updateState({
    pendingTransactions: [...this.state.pendingTransactions, transaction]
  });

  // Step 4f: Broadcast to P2P network
  if (this.state.p2pNode) {
    this.state.p2pNode.broadcastTransaction(transaction);
  }

  return transaction;
}
```

```typescript
private updateState(updates: Partial<BlockchainState>): void {
  this.state = { ...this.state, ...updates };
  
  // Step 5: Save mempool to localStorage when pendingTransactions change
  if (updates.pendingTransactions) {
    try {
      localStorage.setItem(
        BlockchainService.MEMPOOL_STORAGE_KEY,
        JSON.stringify(this.state.pendingTransactions)
      );
    } catch (error) {
      console.warn('Failed to save mempool to localStorage:', error);
    }
  }
  
  this.notify(); // Notify UI subscribers
}
```

```typescript
useEffect(() => {
  // Step 1: Check for saved mnemonic on startup
  const savedMnemonic = localStorage.getItem('apstat-mnemonic');
  if (savedMnemonic) {
    // If we find a mnemonic, initialize the app with it
    handleWalletInitialized(savedMnemonic);
  } else {
    // Otherwise, show the onboarding screen
    setAppState('onboarding');
  }
}, []);
```

```typescript
const handleWalletInitialized = async (mnemonic: string) => {
  console.log('APP_CONTROLLER: Wallet phrase received. Initializing backend services...');
  
  // Step 2a: Get BlockchainService instance
  const service = BlockchainService.getInstance();
  blockchainService.current = service;
  
  // Step 2b: Restore wallet from mnemonic
  try {
    await service.restoreWallet(mnemonic);
  } catch (error) {
    await service.generateNewWallet();
  }

  // Step 2c: Load chain from localStorage
  // @ts-ignore - Accessing private method for initialization
  service.loadChainFromStorage();

  // Step 2d: Initialize P2P network
  service.initializeP2P();

  // Step 2e: Initialize Gateway with service
  gateway.initializeGateway(service);
```

```typescript
private loadChainFromStorage() {
  if (this.state.currentKeyPair) {
    const publicKey = this.state.currentKeyPair.publicKey.hex;
    const chainData = localStorage.getItem(`apstat-chain-${publicKey}`);
    if (chainData) {
      try {
        // Step 3: Restore blockchain state from localStorage
        const blocks = JSON.parse(chainData);
        this.state.blockchain.replaceChain(blocks);
        console.log('BLOCKCHAIN_SERVICE: Chain state loaded from local storage.');
        
        // Clear mempool after loading chain
        this.updateState({ pendingTransactions: [] });
      } catch (error) {
        console.warn('Failed to parse chain data from localStorage:', error);
      }
    }
  }
}
```

```typescript
// Step 4a: Get curriculum template
const curriculumTemplate = await gateway.getCurriculumData();

// Step 4b: Get on-chain completions
const completedIds = await gateway.getOnChainCompletions();

// Step 4c: Create deep copy of template
const rehydratedUnits = JSON.parse(JSON.stringify(curriculumTemplate));

// Step 4d: Update completion status based on blockchain data
rehydratedUnits.forEach((unit: CurriculumUnit) => {
  unit.topics.forEach(topic => {
    topic.videos.forEach(video => {
      const videoId = video.url || video.altUrl;
      if (videoId && completedIds.has(videoId)) {
        video.completed = true;  // ✅ Checkbox will be pre-checked
      }
    });
    topic.quizzes.forEach(quiz => {
      if (completedIds.has(quiz.quizId)) {
        quiz.completed = true;   // ✅ Checkbox will be pre-checked
      }
    });
  });
});

// Step 4e: Set rehydrated state and render dashboard
setUnits(rehydratedUnits);
setAppState('dashboard');
```

```typescript
export const getOnChainCompletions = async (): Promise<Set<string>> => {
  // Step 5: Delegate to BlockchainService to get completion state
  return blockchainServiceInstance.getCompletionState();
};
```

```typescript
public getCompletionState(): Set<string> {
  const completedIds = new Set<string>();
  const currentKeyPair = this.getCurrentKeyPair();
  if (!currentKeyPair) return completedIds;

  const authorPublicKey = currentKeyPair.publicKey.hex;

  // Step 6: Scan entire blockchain for user's completed activities
  this.state.blockchain.getChain().forEach(block => {
    block.transactions.forEach(tx => {
      if (tx.publicKey === authorPublicKey && tx.payload.activityId) {
        completedIds.add(tx.payload.activityId); // Collect activity IDs
      }
    });
  });
  
  return completedIds; // Returns Set of completed activity IDs
}
```

