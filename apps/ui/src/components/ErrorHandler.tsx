import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, WifiOff, QrCode, RefreshCw, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export interface ErrorState {
  type: 'network' | 'qr_invalid' | 'attestation_failed' | 'mining_timeout' | 'storage_error' | 'camera_access' | 'sync_failed';
  message: string;
  details?: string;
  recoverable: boolean;
  retryAction?: () => Promise<void>;
  timestamp: number;
  severity: 'low' | 'medium' | 'high';
}

interface ErrorHandlerProps {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: ErrorState) => void;
  showHistory?: boolean;
}

export class ErrorManager {
  private static instance: ErrorManager;
  private errorHistory: ErrorState[] = [];
  private maxRetries: number;
  private retryDelay: number;
  private listeners: ((error: ErrorState) => void)[] = [];

  private constructor(maxRetries = 3, retryDelay = 1000) {
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  static getInstance(maxRetries = 3, retryDelay = 1000): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager(maxRetries, retryDelay);
    }
    return ErrorManager.instance;
  }

  addListener(listener: (error: ErrorState) => void): void {
    this.listeners.push(listener);
  }

  removeListener(listener: (error: ErrorState) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  async handleError(error: ErrorState): Promise<void> {
    // Log error with context
    console.error('Error occurred:', error);
    this.errorHistory.push(error);
    
    // Keep only last 50 errors
    if (this.errorHistory.length > 50) {
      this.errorHistory = this.errorHistory.slice(-50);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(error));

    // Attempt automatic recovery for recoverable errors
    if (error.recoverable && error.retryAction) {
      try {
        await this.retryWithExponentialBackoff(error.retryAction);
      } catch (retryError) {
        // If retry fails, create a new error
        const retryFailedError: ErrorState = {
          type: error.type,
          message: `Retry failed: ${error.message}`,
          details: `Original error: ${error.message}. Retry error: ${retryError}`,
          recoverable: false,
          timestamp: Date.now(),
          severity: 'high'
        };
        this.errorHistory.push(retryFailedError);
        this.listeners.forEach(listener => listener(retryFailedError));
      }
    }
  }

  private async retryWithExponentialBackoff(action: () => Promise<void>): Promise<void> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        await action();
        return;
      } catch (error) {
        if (attempt === this.maxRetries - 1) {
          throw error;
        }
        await this.delay(this.retryDelay * Math.pow(2, attempt));
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getErrorHistory(): ErrorState[] {
    return [...this.errorHistory];
  }

  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  // QR Code specific error handling
  static createQRError(details: string, recoverable = true, retryAction?: () => Promise<void>): ErrorState {
    return {
      type: 'qr_invalid',
      message: 'QR Code Error',
      details,
      recoverable,
      retryAction,
      timestamp: Date.now(),
      severity: 'medium'
    };
  }

  // Network specific error handling
  static createNetworkError(details: string, recoverable = true, retryAction?: () => Promise<void>): ErrorState {
    return {
      type: 'network',
      message: 'Network Error',
      details,
      recoverable,
      retryAction,
      timestamp: Date.now(),
      severity: 'medium'
    };
  }

  // Storage specific error handling
  static createStorageError(details: string, recoverable = false): ErrorState {
    return {
      type: 'storage_error',
      message: 'Storage Error',
      details,
      recoverable,
      timestamp: Date.now(),
      severity: 'high'
    };
  }
}

interface ErrorDisplayProps {
  error: ErrorState;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry, onDismiss }) => {
  const getErrorIcon = (type: ErrorState['type']) => {
    switch (type) {
      case 'network':
        return <WifiOff className="w-5 h-5 text-red-500" />;
      case 'qr_invalid':
        return <QrCode className="w-5 h-5 text-yellow-500" />;
      case 'camera_access':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getErrorColor = (severity: ErrorState['severity']) => {
    switch (severity) {
      case 'low':
        return 'border-yellow-200 bg-yellow-50';
      case 'medium':
        return 'border-orange-200 bg-orange-50';
      case 'high':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <Card className={`${getErrorColor(error.severity)} border-2 mb-4`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getErrorIcon(error.type)}
            <CardTitle className="text-lg">{error.message}</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">{formatTime(error.timestamp)}</span>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error.details && (
          <CardDescription className="mb-3">
            {error.details}
          </CardDescription>
        )}
        <div className="flex items-center space-x-2">
          {error.recoverable && onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </Button>
          )}
          <span className={`text-sm px-2 py-1 rounded ${
            error.recoverable 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {error.recoverable ? 'Recoverable' : 'Manual action required'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export const ErrorHandler: React.FC<ErrorHandlerProps> = ({
  maxRetries = 3,
  retryDelay = 1000,
  onError,
  showHistory = false
}) => {
  const [currentErrors, setCurrentErrors] = useState<ErrorState[]>([]);
  const [errorManager] = useState(() => ErrorManager.getInstance(maxRetries, retryDelay));

  const handleNewError = useCallback((error: ErrorState) => {
    setCurrentErrors(prev => [...prev, error]);
    if (onError) {
      onError(error);
    }
  }, [onError]);

  const handleRetry = useCallback(async (error: ErrorState) => {
    if (error.retryAction) {
      try {
        await error.retryAction();
        // Remove error from display if retry succeeds
        setCurrentErrors(prev => prev.filter(e => e.timestamp !== error.timestamp));
      } catch (retryError) {
        console.error('Retry failed:', retryError);
      }
    }
  }, []);

  const handleDismiss = useCallback((error: ErrorState) => {
    setCurrentErrors(prev => prev.filter(e => e.timestamp !== error.timestamp));
  }, []);

  const clearAllErrors = useCallback(() => {
    setCurrentErrors([]);
    errorManager.clearErrorHistory();
  }, [errorManager]);

  useEffect(() => {
    errorManager.addListener(handleNewError);
    return () => {
      errorManager.removeListener(handleNewError);
    };
  }, [errorManager, handleNewError]);

  if (currentErrors.length === 0 && !showHistory) {
    return null;
  }

  return (
    <div className="error-handler">
      {currentErrors.map((error) => (
        <ErrorDisplay
          key={error.timestamp}
          error={error}
          onRetry={() => handleRetry(error)}
          onDismiss={() => handleDismiss(error)}
        />
      ))}
      
      {showHistory && (
        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Error History</CardTitle>
              <Button
                onClick={clearAllErrors}
                variant="outline"
                size="sm"
              >
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              {errorManager.getErrorHistory().map((error) => (
                <ErrorDisplay
                  key={error.timestamp}
                  error={error}
                  onRetry={() => handleRetry(error)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Custom hook for using the error manager
export const useErrorHandler = () => {
  const errorManager = ErrorManager.getInstance();
  
  const handleError = useCallback((error: ErrorState) => {
    errorManager.handleError(error);
  }, [errorManager]);

  const createQRError = useCallback((details: string, recoverable = true, retryAction?: () => Promise<void>) => {
    return ErrorManager.createQRError(details, recoverable, retryAction);
  }, []);

  const createNetworkError = useCallback((details: string, recoverable = true, retryAction?: () => Promise<void>) => {
    return ErrorManager.createNetworkError(details, recoverable, retryAction);
  }, []);

  const createStorageError = useCallback((details: string, recoverable = false) => {
    return ErrorManager.createStorageError(details, recoverable);
  }, []);

  return {
    handleError,
    createQRError,
    createNetworkError,
    createStorageError,
    errorManager
  };
};

// QR Code specific error handling utilities
export const QRErrorHandler = {
  invalidFormat: (retryAction?: () => Promise<void>) => 
    ErrorManager.createQRError(
      'Invalid QR code format. Please ensure the QR code is from AP Stats Chain.',
      true,
      retryAction
    ),

  corruptedData: (retryAction?: () => Promise<void>) => 
    ErrorManager.createQRError(
      'QR code data appears corrupted. Try scanning again or ask the sender to regenerate.',
      true,
      retryAction
    ),

  checksumFailed: (retryAction?: () => Promise<void>) => 
    ErrorManager.createQRError(
      'QR code checksum verification failed. The data may be incomplete or corrupted.',
      true,
      retryAction
    ),

  cameraAccess: (retryAction?: () => Promise<void>) => ({
    type: 'camera_access' as const,
    message: 'Camera Access Required',
    details: 'Please allow camera access to scan QR codes. Check your browser settings.',
    recoverable: true,
    retryAction,
    timestamp: Date.now(),
    severity: 'medium' as const
  }),

  scanTimeout: (retryAction?: () => Promise<void>) => 
    ErrorManager.createQRError(
      'QR code scan timed out. Please try again with better lighting or camera positioning.',
      true,
      retryAction
    ),

  unsupportedChunk: () => 
    ErrorManager.createQRError(
      'QR code contains unsupported chunk format. Please update your app.',
      false
    )
};

// Network specific error handling utilities
export const NetworkErrorHandler = {
  connectionLost: (retryAction?: () => Promise<void>) => 
    ErrorManager.createNetworkError(
      'Connection lost. Operations will continue offline and sync when reconnected.',
      true,
      retryAction
    ),

  syncFailed: (retryAction?: () => Promise<void>) => 
    ErrorManager.createNetworkError(
      'Failed to sync with peers. Some data may be temporarily unavailable.',
      true,
      retryAction
    ),

  peerTimeout: (retryAction?: () => Promise<void>) => 
    ErrorManager.createNetworkError(
      'Peer connection timed out. Trying other peers...',
      true,
      retryAction
    )
};

export default ErrorHandler; 