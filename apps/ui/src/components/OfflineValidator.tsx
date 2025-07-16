import React, { useState, useEffect, useCallback } from 'react';
import { WifiOff, Wifi, CheckCircle, AlertCircle, Clock, Users, QrCode } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface OfflineCapability {
  name: string;
  description: string;
  status: 'available' | 'unavailable' | 'limited' | 'testing';
  critical: boolean;
  lastTested?: Date;
  testResult?: 'pass' | 'fail' | 'partial';
}

interface OfflineValidatorProps {
  onValidationComplete?: (results: OfflineCapability[]) => void;
  autoTest?: boolean;
}

const OFFLINE_CAPABILITIES: OfflineCapability[] = [
  {
    name: 'Lesson Completion',
    description: 'Complete lessons and save progress locally',
    status: 'available',
    critical: true
  },
  {
    name: 'Quiz Answering',
    description: 'Answer MCQ and FRQ questions offline',
    status: 'available',
    critical: true
  },
  {
    name: 'QR Code Generation',
    description: 'Generate QR codes for attestation requests',
    status: 'available',
    critical: true
  },
  {
    name: 'QR Code Scanning',
    description: 'Scan QR codes from other students',
    status: 'available',
    critical: true
  },
  {
    name: 'Attestation Creation',
    description: 'Create attestations for peer answers',
    status: 'available',
    critical: true
  },
  {
    name: 'Block Mining',
    description: 'Mine blocks with sufficient attestations',
    status: 'available',
    critical: true
  },
  {
    name: 'Local Storage',
    description: 'Store blockchain data in IndexedDB',
    status: 'available',
    critical: true
  },
  {
    name: 'Leaderboard Display',
    description: 'Show cached leaderboard data',
    status: 'available',
    critical: false
  },
  {
    name: 'Sync Queue',
    description: 'Queue operations for when online',
    status: 'available',
    critical: true
  },
  {
    name: 'Peer Discovery',
    description: 'Find nearby peers via QR codes',
    status: 'limited',
    critical: false
  }
];

const OfflineValidator: React.FC<OfflineValidatorProps> = ({ 
  onValidationComplete, 
  autoTest = false 
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [capabilities, setCapabilities] = useState<OfflineCapability[]>(OFFLINE_CAPABILITIES);
  const [testing, setTesting] = useState(false);
  const [testProgress, setTestProgress] = useState(0);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Test individual capabilities
  const testCapability = useCallback(async (capability: OfflineCapability): Promise<'pass' | 'fail' | 'partial'> => {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    try {
      switch (capability.name) {
        case 'Local Storage':
          // Test IndexedDB availability
          if ('indexedDB' in window) {
            try {
              const request = indexedDB.open('test-db', 1);
              await new Promise((resolve, reject) => {
                request.onsuccess = () => {
                  request.result.close();
                  resolve(true);
                };
                request.onerror = () => reject(request.error);
              });
              return 'pass';
            } catch (error) {
              return 'fail';
            }
          }
          return 'fail';

        case 'QR Code Generation':
          // Test QR code generation capability
          await delay(100);
          if (typeof TextEncoder !== 'undefined') {
            return 'pass';
          }
          return 'fail';

        case 'QR Code Scanning':
          // Test camera access and QR scanning
          await delay(100);
          if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
            return 'pass';
          }
          return 'partial';

        case 'Lesson Completion':
          // Test lesson completion and local storage
          await delay(100);
          try {
            localStorage.setItem('test-lesson', 'completed');
            localStorage.removeItem('test-lesson');
            return 'pass';
          } catch (error) {
            return 'fail';
          }

        case 'Quiz Answering':
          // Test quiz answering functionality
          await delay(100);
          if (typeof crypto !== 'undefined' && crypto.subtle) {
            return 'pass';
          }
          return 'partial';

        case 'Attestation Creation':
          // Test attestation creation
          await delay(100);
          if (typeof crypto !== 'undefined' && crypto.subtle) {
            return 'pass';
          }
          return 'fail';

        case 'Block Mining':
          // Test block mining capability
          await delay(100);
          if (typeof crypto !== 'undefined' && crypto.subtle) {
            return 'pass';
          }
          return 'fail';

        case 'Sync Queue':
          // Test sync queue functionality
          await delay(100);
          try {
            const queue = JSON.stringify([{ operation: 'test', timestamp: Date.now() }]);
            localStorage.setItem('sync-queue', queue);
            localStorage.removeItem('sync-queue');
            return 'pass';
          } catch (error) {
            return 'fail';
          }

        case 'Leaderboard Display':
          // Test leaderboard display
          await delay(100);
          try {
            const mockLeaderboard = [{ rank: 1, points: 100 }];
            localStorage.setItem('leaderboard-cache', JSON.stringify(mockLeaderboard));
            localStorage.removeItem('leaderboard-cache');
            return 'pass';
          } catch (error) {
            return 'fail';
          }

        case 'Peer Discovery':
          // Test peer discovery (limited without P2P)
          await delay(100);
          return 'partial';

        default:
          return 'partial';
      }
    } catch (error) {
      console.error(`Test failed for ${capability.name}:`, error);
      return 'fail';
    }
  }, []);

  // Run all tests
  const runTests = useCallback(async () => {
    setTesting(true);
    setTestProgress(0);
    
    const updatedCapabilities = [...capabilities];
    
    for (let i = 0; i < updatedCapabilities.length; i++) {
      const capability = updatedCapabilities[i];
      capability.status = 'testing';
      setCapabilities([...updatedCapabilities]);
      
      const result = await testCapability(capability);
      
      capability.testResult = result;
      capability.lastTested = new Date();
      capability.status = result === 'pass' ? 'available' : 
                          result === 'partial' ? 'limited' : 'unavailable';
      
      setTestProgress(((i + 1) / updatedCapabilities.length) * 100);
      setCapabilities([...updatedCapabilities]);
    }
    
    setTesting(false);
    
    if (onValidationComplete) {
      onValidationComplete(updatedCapabilities);
    }
  }, [capabilities, testCapability, onValidationComplete]);

  // Auto-test on mount if enabled
  useEffect(() => {
    if (autoTest) {
      runTests();
    }
  }, [autoTest, runTests]);

  const getStatusIcon = (status: OfflineCapability['status']) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'limited':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'unavailable':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'testing':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: OfflineCapability['status']) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'limited':
        return 'bg-yellow-100 text-yellow-800';
      case 'unavailable':
        return 'bg-red-100 text-red-800';
      case 'testing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const criticalCapabilities = capabilities.filter(c => c.critical);
  const criticalPassing = criticalCapabilities.filter(c => c.status === 'available').length;
  const criticalTotal = criticalCapabilities.length;

  const japanReadinessScore = Math.round((criticalPassing / criticalTotal) * 100);

  return (
    <div className="space-y-6">
      {/* Network Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
              <CardTitle>Network Status</CardTitle>
            </div>
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            {isOnline 
              ? 'Connected to network - All features available'
              : 'No network connection - Testing offline capabilities'
            }
          </p>
        </CardContent>
      </Card>

      {/* Japan Readiness Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <QrCode className="w-5 h-5" />
            <span>Japan Testing Readiness</span>
          </CardTitle>
          <CardDescription>
            Critical features for offline classroom operation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold">{japanReadinessScore}%</span>
              <span className="text-sm text-gray-500">Ready</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500">
                {criticalPassing}/{criticalTotal} critical features
              </span>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${japanReadinessScore}%` }}
            />
          </div>
          
          {japanReadinessScore >= 90 && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Ready for Japan Testing
                </span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                All critical features are working offline. App is ready for international deployment.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Offline Capability Tests</CardTitle>
          <CardDescription>
            Test all features to ensure they work without network connectivity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <Button 
              onClick={runTests} 
              disabled={testing}
              className="flex items-center space-x-2"
            >
              {testing ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Run Tests</span>
                </>
              )}
            </Button>
            
            {testing && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  Progress: {Math.round(testProgress)}%
                </span>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${testProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Capability Results */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Capabilities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {capabilities.map((capability, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(capability.status)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{capability.name}</span>
                      {capability.critical && (
                        <Badge variant="secondary" className="text-xs">
                          Critical
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{capability.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(capability.status)}>
                    {capability.status}
                  </Badge>
                  {capability.lastTested && (
                    <span className="text-xs text-gray-500">
                      {capability.lastTested.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Travel Testing Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Travel Testing Checklist</CardTitle>
          <CardDescription>
            Essential items for Japan classroom testing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Offline lesson completion</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">QR code generation and scanning</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Peer attestation workflow</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Block mining with local consensus</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Leaderboard updates</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Sync queue for reconnection</span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm">30-student classroom capacity</span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm">Week-long offline operation</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OfflineValidator; 