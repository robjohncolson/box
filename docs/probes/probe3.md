# File structure and responsibilities overview
_Exported on 7/2/2025 at 12:02:13 EDT from Cursor (1.1.7)_

---

**User**

"Focus on the packages/data directory. What is the purpose of the allUnitsData.js file? Describe the data structure it exports."
"Now, focus on packages/core. For each file listed below, provide a bulleted list of its exported classes and functions, and a one-sentence summary of the file's primary responsibility:
src/index.ts
src/gateway.ts
src/blockchain/Wallet.ts
src/blockchain/Blockchain.ts (and Block.ts)
src/blockchain/BlockchainService.ts
src/p2p/P2PNode.ts"

---

**Cursor**

I'll help you analyze the packages/data directory and the packages/core files. Let me start by examining the allUnitsData.js file and then look at the core package files.

Based on my analysis of the codebase, here's what I found:

## packages/data Directory

### Purpose of `allUnitsData.js`

The `allUnitsData.js` file serves as the **comprehensive curriculum data structure** for the AP Statistics course. It contains the complete learning framework that drives the application's educational content.

### Data Structure

The file exports an `ALL_UNITS_DATA` array containing **9 curriculum units** for AP Statistics. Each unit object has the following structure:

```javascript
{
  unitId: 'unit1',
  displayName: "Unit 1: Exploring One-Variable Data",
  examWeight: "15-23%",
  topics: [
    {
      id: "1-1",
      name: "Topic 1.1", 
      description: "Topic description",
      videos: [{ url, altUrl, completed, completionDate }],
      blooket: { url, completed, completionDate },
      origami: { name, description, videoUrl, reflection },
      quizzes: [{ questionPdf, answersPdf, quizId, completed, completionDate }],
      current: boolean
    }
    // ... more topics
  ]
}
```

The file also includes a helper function `getTotalItemCounts()` that calculates the total number of videos and quizzes across all units, which is used for progress tracking and quota calculations.

## packages/core Analysis

### `src/index.ts`
**Exports:**
• Re-exports from all core modules (crypto, chain, block, transaction, attestation, types)
• `Wallet` class from crypto module
• `gateway` module as namespace

**Primary Responsibility:** Serves as the main entry point and public API for the @apstat-chain/core package.

### `src/gateway.ts`
**Exports:**
• `initializeGateway(service)` - Initializes gateway with BlockchainService instance
• `getCurriculumData()` - Fetches curriculum structure
• `saveCompletion()` - Creates blockchain transactions for completions
• `getCompletionTimestamps()`, `getAllUsers()`, `getPeerQuotaCounts()` - Mock data functions
• `getOnChainCompletions()` - Retrieves completed activities from blockchain
• `getGrokPrompt()` - Returns AI tutor prompt for guided learning

**Primary Responsibility:** Acts as an API gateway that bridges the UI layer with curriculum data and blockchain functionality, avoiding circular dependencies.

### `src/crypto/Wallet.ts` *(Note: Located in crypto/, not blockchain/)*
**Exports:**
• `Wallet` class with methods:
  - `static generateMnemonic()` - Generates 12-word mnemonic
  - `getKeyPair()`, `getMnemonic()`, `getPublicKeyHex()`, `getPrivateKeyHex()` - Accessor methods

**Primary Responsibility:** Manages cryptographic keys and mnemonic phrases for wallet functionality.

### `src/chain/index.ts` *(This contains the Blockchain class, not a separate Blockchain.ts)*
**Exports:**
• `Blockchain` class with methods:
  - `getLatestBlock()`, `getChain()`, `addBlock()` - Chain management
  - `replaceChain()` - Chain synchronization
  - `static isValidChain()` - Chain validation

**Primary Responsibility:** Manages an ordered chain of blocks with validation and synchronization capabilities.

### `src/block/index.ts` *(This contains Block functionality, not a separate Block.ts)*
**Exports:**
• `createBlock()` - Creates and signs new blocks
• `verifyBlock()` - Verifies block signatures and integrity
• `Block` type (re-exported)

**Primary Responsibility:** Handles block creation, signing, and verification with support for candidate blocks and social consensus features.

### `apps/ui/src/services/BlockchainService.ts` *(Note: Located in apps/ui/, not packages/core)*
**Exports:**
• `BlockchainService` class (singleton) with methods:
  - Wallet management: `generateNewWallet()`, `restoreWallet()`
  - Transaction handling: `createTransaction()`, `verifyTransaction()`
  - P2P networking: `initializeP2P()`, `connectToPeer()`, `discoverPeers()`
  - Mining & consensus: `proposeBlock()`, `submitAttestation()`, `isEligibleToMine()`
  - State management: `getState()`, `subscribe()`, progress tracking methods

**Primary Responsibility:** Provides the high-level blockchain service that orchestrates all blockchain operations, P2P networking, and state management for the UI layer.

### `packages/p2p/src/p2p-node.ts` *(Note: Located in packages/p2p/, not packages/core)*
**Exports:**
• `P2PNode` class extending EventEmitter with methods:
  - Connection management: `connectToPeer()`, `disconnectFromPeer()`, `getConnectedPeers()`
  - Broadcasting: `broadcastTransaction()`, `broadcastBlock()`, `broadcastCandidateBlock()`, `broadcastAttestation()`
  - Chain synchronization: `requestChain()`, `sendChain()`
  - Message handling for transactions, blocks, peer discovery, and mempool synchronization

**Primary Responsibility:** Handles peer-to-peer networking communications including transaction broadcasting, block propagation, chain synchronization, and mempool sharing between network nodes.

```javascript
{
  unitId: 'unit1',
  displayName: "Unit 1: Exploring One-Variable Data",
  examWeight: "15-23%",
  topics: [
    {
      id: "1-1",
      name: "Topic 1.1", 
      description: "Topic description",
      videos: [{ url, altUrl, completed, completionDate }],
      blooket: { url, completed, completionDate },
      origami: { name, description, videoUrl, reflection },
      quizzes: [{ questionPdf, answersPdf, quizId, completed, completionDate }],
      current: boolean
    }
    // ... more topics
  ]
}
```

