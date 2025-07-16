/**
 * IndexedDB Storage Inspector
 * Copy and paste this script into the browser console to inspect your blockchain storage
 */

async function inspectAPStatsChain() {
  const dbName = 'APStatsChain';
  const dbVersion = 1;
  
  try {
    // Open the database
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    console.log('🔍 APStats Chain Database Inspection');
    console.log('=====================================');
    
    // Get all blocks
    const blocks = await new Promise((resolve, reject) => {
      const transaction = db.transaction(['blocks'], 'readonly');
      const store = transaction.objectStore('blocks');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    console.log(`📦 BLOCKS (${blocks.length} found):`);
    blocks.forEach((block, index) => {
      console.log(`  Block ${index + 1}:`);
      console.log(`    ID: ${block.blockId}`);
      console.log(`    Height: ${block.header.blockHeight}`);
      console.log(`    Timestamp: ${new Date(block.header.timestamp).toLocaleString()}`);
      console.log(`    Producer: ${block.producerPubKey.substring(0, 16)}...`);
      console.log(`    Transactions: ${block.body.transactions.length}`);
      console.log(`    Attestations: ${block.body.attestations.length}`);
      console.log(`    Convergence Score: ${block.body.quorumData.convergenceScore}`);
      console.log('');
    });
    
    // Get leaderboard
    const leaderboard = await new Promise((resolve, reject) => {
      const transaction = db.transaction(['leaderboard'], 'readonly');
      const store = transaction.objectStore('leaderboard');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    console.log(`🏆 LEADERBOARD (${leaderboard.length} entries):`);
    leaderboard.sort((a, b) => a.rank - b.rank);
    leaderboard.forEach((entry) => {
      console.log(`  Rank ${entry.rank}: ${entry.pubKey.substring(0, 16)}...`);
      console.log(`    Points: ${entry.totalPoints}`);
      console.log(`    Reputation: ${entry.reputationScore}%`);
      console.log(`    Convergence Rate: ${(entry.convergenceRate * 100).toFixed(1)}%`);
      console.log(`    Last Active: ${new Date(entry.lastActivity).toLocaleString()}`);
      console.log('');
    });
    
    // Get metadata
    const metadata = await new Promise((resolve, reject) => {
      const transaction = db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get('chain');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    console.log('📊 CHAIN METADATA:');
    if (metadata) {
      console.log(`  Chain Height: ${metadata.value.chainHeight}`);
      console.log(`  Total Transactions: ${metadata.value.totalTransactions}`);
      console.log(`  Last Update: ${new Date(metadata.value.lastUpdate).toLocaleString()}`);
    } else {
      console.log('  No metadata found');
    }
    
    db.close();
    
    // Return data for further inspection
    return {
      blocks,
      leaderboard,
      metadata: metadata?.value
    };
    
  } catch (error) {
    console.error('❌ Error inspecting database:', error);
    throw error;
  }
}

// Additional utility functions
function clearAPStatsChain() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('APStatsChain');
    request.onsuccess = () => {
      console.log('🗑️ APStats Chain database cleared');
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

async function exportChainData() {
  try {
    const data = await inspectAPStatsChain();
    const exportData = {
      timestamp: new Date().toISOString(),
      chainHeight: data.metadata?.chainHeight || 0,
      blocks: data.blocks,
      leaderboard: data.leaderboard,
      metadata: data.metadata
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apstats-chain-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('📁 Chain data exported to file');
    return exportData;
  } catch (error) {
    console.error('❌ Error exporting chain data:', error);
    throw error;
  }
}

// Make functions available globally
window.inspectAPStatsChain = inspectAPStatsChain;
window.clearAPStatsChain = clearAPStatsChain;
window.exportChainData = exportChainData;

console.log('🔧 APStats Chain Inspector loaded!');
console.log('Available functions:');
console.log('  - inspectAPStatsChain() - Inspect all storage');
console.log('  - clearAPStatsChain() - Clear all data');
console.log('  - exportChainData() - Export data to file'); 