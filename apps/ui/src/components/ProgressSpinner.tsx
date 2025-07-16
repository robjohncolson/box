import React from 'react';
import { Loader2, QrCode, Users, Pickaxe, Trophy, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent } from './ui/card';

export interface LoadingState {
  isLoading: boolean;
  progress?: number;
  stage: 'idle' | 'generating' | 'displaying' | 'scanning' | 'processing' | 'mining' | 'syncing' | 'updating' | 'complete';
  message: string;
  estimatedTimeRemaining?: number;
  substage?: string;
}

interface ProgressSpinnerProps {
  state: LoadingState;
  variant?: 'default' | 'compact' | 'inline';
  showProgress?: boolean;
  showEstimate?: boolean;
  className?: string;
}

const stageConfig = {
  idle: {
    icon: null,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    description: 'Ready'
  },
  generating: {
    icon: QrCode,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
    description: 'Generating QR codes'
  },
  displaying: {
    icon: QrCode,
    color: 'text-green-500',
    bgColor: 'bg-green-100',
    description: 'Displaying QR codes'
  },
  scanning: {
    icon: QrCode,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100',
    description: 'Scanning QR codes'
  },
  processing: {
    icon: Users,
    color: 'text-purple-500',
    bgColor: 'bg-purple-100',
    description: 'Processing attestations'
  },
  mining: {
    icon: Pickaxe,
    color: 'text-orange-500',
    bgColor: 'bg-orange-100',
    description: 'Mining block'
  },
  syncing: {
    icon: Wifi,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-100',
    description: 'Syncing with peers'
  },
  updating: {
    icon: Trophy,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: 'Updating leaderboard'
  },
  complete: {
    icon: Trophy,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: 'Complete'
  }
};

const ProgressRing: React.FC<{ progress: number; size?: number; strokeWidth?: number }> = ({ 
  progress, 
  size = 40, 
  strokeWidth = 4 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="transparent"
        className="text-gray-200"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-blue-500 transition-all duration-500 ease-out"
        strokeLinecap="round"
      />
    </svg>
  );
};

const LoadingSpinner: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <Loader2 className={`animate-spin ${className}`} />
);

const StageIcon: React.FC<{ stage: LoadingState['stage']; className?: string }> = ({ 
  stage, 
  className = "w-5 h-5" 
}) => {
  const config = stageConfig[stage];
  const IconComponent = config.icon;
  
  if (!IconComponent) {
    return <LoadingSpinner className={className} />;
  }
  
  return <IconComponent className={`${className} ${config.color}`} />;
};

const formatTime = (milliseconds: number): string => {
  const seconds = Math.ceil(milliseconds / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

export const ProgressSpinner: React.FC<ProgressSpinnerProps> = ({
  state,
  variant = 'default',
  showProgress = true,
  showEstimate = true,
  className = ''
}) => {
  const config = stageConfig[state.stage];
  
  if (!state.isLoading && state.stage === 'idle') {
    return null;
  }

  const renderInlineVariant = () => (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="relative">
        {state.isLoading ? (
          <LoadingSpinner className="w-4 h-4 text-blue-500" />
        ) : (
          <StageIcon stage={state.stage} className="w-4 h-4" />
        )}
      </div>
      <span className="text-sm text-gray-600">{state.message}</span>
      {showProgress && state.progress !== undefined && (
        <span className="text-xs text-gray-500 font-medium">
          {Math.round(state.progress)}%
        </span>
      )}
    </div>
  );

  const renderCompactVariant = () => (
    <div className={`flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="relative">
        {state.isLoading && showProgress && state.progress !== undefined ? (
          <div className="relative">
            <ProgressRing progress={state.progress} size={32} strokeWidth={3} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600">
                {Math.round(state.progress)}
              </span>
            </div>
          </div>
        ) : (
          <div className={`p-2 rounded-full ${config.bgColor}`}>
            <StageIcon stage={state.stage} className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{state.message}</p>
        {state.substage && (
          <p className="text-xs text-gray-500 truncate">{state.substage}</p>
        )}
      </div>
      {showEstimate && state.estimatedTimeRemaining && (
        <div className="text-xs text-gray-400">
          {formatTime(state.estimatedTimeRemaining)}
        </div>
      )}
    </div>
  );

  const renderDefaultVariant = () => (
    <Card className={`${className}`}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            {state.isLoading && showProgress && state.progress !== undefined ? (
              <div className="relative">
                <ProgressRing progress={state.progress} size={64} strokeWidth={6} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-700">
                      {Math.round(state.progress)}%
                    </div>
                    <StageIcon stage={state.stage} className="w-6 h-6 mx-auto mt-1" />
                  </div>
                </div>
              </div>
            ) : (
              <div className={`p-4 rounded-full ${config.bgColor}`}>
                <StageIcon stage={state.stage} className="w-8 h-8" />
              </div>
            )}
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-gray-900">{state.message}</p>
            {state.substage && (
              <p className="text-sm text-gray-500">{state.substage}</p>
            )}
            {showEstimate && state.estimatedTimeRemaining && (
              <p className="text-sm text-gray-400">
                Estimated time remaining: {formatTime(state.estimatedTimeRemaining)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  switch (variant) {
    case 'inline':
      return renderInlineVariant();
    case 'compact':
      return renderCompactVariant();
    default:
      return renderDefaultVariant();
  }
};

// Stage-specific loading states
export const LoadingStates = {
  generateQR: (progress = 0): LoadingState => ({
    isLoading: true,
    progress: Math.min(progress, 30),
    stage: 'generating',
    message: 'Generating attestation request...',
    substage: 'Creating QR codes for batch request',
    estimatedTimeRemaining: 3000
  }),

  displayQR: (progress = 30): LoadingState => ({
    isLoading: true,
    progress: Math.min(progress, 60),
    stage: 'displaying',
    message: 'Waiting for peers...',
    substage: 'Show QR code to nearby students',
    estimatedTimeRemaining: 30000
  }),

  scanQR: (progress = 60): LoadingState => ({
    isLoading: true,
    progress: Math.min(progress, 70),
    stage: 'scanning',
    message: 'Scanning attestation responses...',
    substage: 'Point camera at QR codes',
    estimatedTimeRemaining: 10000
  }),

  processAttestations: (progress = 70, attestationCount = 0, required = 3): LoadingState => ({
    isLoading: true,
    progress: Math.min(progress, 90),
    stage: 'processing',
    message: 'Processing attestations...',
    substage: `${attestationCount}/${required} attestations collected`,
    estimatedTimeRemaining: 5000
  }),

  mining: (progress = 90): LoadingState => ({
    isLoading: true,
    progress: Math.min(progress, 95),
    stage: 'mining',
    message: 'Mining block...',
    substage: 'Verifying quorum and convergence',
    estimatedTimeRemaining: 3000
  }),

  syncing: (progress = 95): LoadingState => ({
    isLoading: true,
    progress: Math.min(progress, 98),
    stage: 'syncing',
    message: 'Syncing with network...',
    substage: 'Broadcasting block to peers',
    estimatedTimeRemaining: 2000
  }),

  updatingLeaderboard: (progress = 98): LoadingState => ({
    isLoading: true,
    progress: Math.min(progress, 100),
    stage: 'updating',
    message: 'Updating leaderboard...',
    substage: 'Recalculating rankings',
    estimatedTimeRemaining: 1000
  }),

  complete: (): LoadingState => ({
    isLoading: false,
    progress: 100,
    stage: 'complete',
    message: 'Complete!',
    substage: 'Block mined successfully'
  }),

  offline: (): LoadingState => ({
    isLoading: true,
    stage: 'syncing',
    message: 'Working offline...',
    substage: 'Operations will sync when reconnected'
  }),

  error: (message: string): LoadingState => ({
    isLoading: false,
    stage: 'idle',
    message,
    substage: 'Please try again'
  })
};

// Hook for managing loading states
export const useLoadingState = () => {
  const [loadingState, setLoadingState] = React.useState<LoadingState>(LoadingStates.complete());

  const updateProgress = React.useCallback((progress: number) => {
    setLoadingState(prev => ({ ...prev, progress }));
  }, []);

  const setStage = React.useCallback((stage: LoadingState['stage'], message?: string, substage?: string) => {
    setLoadingState(prev => ({
      ...prev,
      stage,
      message: message || prev.message,
      substage: substage || prev.substage
    }));
  }, []);

  const reset = React.useCallback(() => {
    setLoadingState(LoadingStates.complete());
  }, []);

  return {
    loadingState,
    setLoadingState,
    updateProgress,
    setStage,
    reset
  };
};

// Multi-stage progress tracker
export const StageProgressTracker: React.FC<{
  stages: string[];
  currentStage: number;
  className?: string;
}> = ({ stages, currentStage, className = '' }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {stages.map((stage, index) => (
        <div key={stage} className="flex items-center">
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
            index < currentStage 
              ? 'bg-green-500 text-white' 
              : index === currentStage 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-500'
          }`}>
            {index + 1}
          </div>
          <span className={`ml-2 text-sm ${
            index <= currentStage ? 'text-gray-900' : 'text-gray-500'
          }`}>
            {stage}
          </span>
          {index < stages.length - 1 && (
            <div className={`w-8 h-0.5 ml-2 ${
              index < currentStage ? 'bg-green-500' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
};

export default ProgressSpinner; 