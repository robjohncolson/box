import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

// Types for leaderboard data
interface LeaderboardEntry {
  pubKey: string;
  totalPoints: number;
  reputationScore: number;
  convergenceRate: number;
  lastActivity: number;
  rank: number;
}

interface LeaderboardProps {
  // Chain instance will be passed as prop
  chain?: any;
  // Allow for mock data during development
  mockData?: LeaderboardEntry[];
}

// Helper function to format timestamp
const formatLastActivity = (timestamp: number): string => {
  if (timestamp === 0) return 'Never';
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

// Helper function to format public key for display
const formatPubKey = (pubKey: string): string => {
  if (pubKey.length <= 12) return pubKey;
  return `${pubKey.slice(0, 6)}...${pubKey.slice(-6)}`;
};

// Helper function to get reputation badge color
const getReputationColor = (score: number): string => {
  if (score >= 90) return 'bg-green-100 text-green-800';
  if (score >= 70) return 'bg-blue-100 text-blue-800';
  if (score >= 50) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

// Helper function to get rank badge color
const getRankColor = (rank: number): string => {
  if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  if (rank === 2) return 'bg-gray-100 text-gray-800 border-gray-300';
  if (rank === 3) return 'bg-orange-100 text-orange-800 border-orange-300';
  return 'bg-blue-100 text-blue-800 border-blue-300';
};

const Leaderboard: React.FC<LeaderboardProps> = ({ chain, mockData }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);

  // Load leaderboard data
  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);

        if (mockData) {
          // Use mock data for development
          setLeaderboard(mockData);
          setLastUpdated(Date.now());
        } else if (chain) {
          // Load from actual chain
          const data = await chain.getLeaderboard();
          setLeaderboard(data);
          setLastUpdated(Date.now());
        } else {
          setError('No data source available');
        }
      } catch (err) {
        console.error('Error loading leaderboard:', err);
        setError('Failed to load leaderboard data');
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [chain, mockData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (chain && !loading) {
        try {
          const data = await chain.getLeaderboard();
          setLeaderboard(data);
          setLastUpdated(Date.now());
        } catch (err) {
          console.error('Error refreshing leaderboard:', err);
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [chain, loading]);

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading leaderboard...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>No students have completed any lessons yet.</p>
            <p className="text-sm mt-2">Complete your first lesson to appear on the leaderboard!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Leaderboard</span>
          <span className="text-sm font-normal text-gray-500">
            {lastUpdated > 0 && `Updated ${formatLastActivity(lastUpdated)}`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Rank</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Student</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Points</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Reputation</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Convergence</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <tr 
                  key={entry.pubKey} 
                  className={`border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRankColor(entry.rank)}`}>
                      #{entry.rank}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                        {formatPubKey(entry.pubKey).charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {formatPubKey(entry.pubKey)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-lg font-semibold text-blue-600">
                      {entry.totalPoints.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getReputationColor(entry.reputationScore)}`}>
                      {entry.reputationScore}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${entry.convergenceRate * 100}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-sm text-gray-600">
                        {Math.round(entry.convergenceRate * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center text-sm text-gray-500">
                    {formatLastActivity(entry.lastActivity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Summary stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {leaderboard.length}
            </div>
            <div className="text-sm text-gray-500">Active Students</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {leaderboard.reduce((sum, entry) => sum + entry.totalPoints, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Total Points</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(leaderboard.reduce((sum, entry) => sum + entry.reputationScore, 0) / leaderboard.length)}%
            </div>
            <div className="text-sm text-gray-500">Avg Reputation</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Leaderboard; 