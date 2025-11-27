import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  elo: number;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GameStats {
  elo: number;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  ratedGames: number;
  ratedWins: number;
  totalMoves: number;
  recentGames: RecentGame[];
}

interface RecentGame {
  id: string;
  status: string;
  winnerId: string | null;
  whiteId: string;
  blackId: string;
  isRated: boolean;
  createdAt: string;
  endedAt: string | null;
}

export const UserProfile: React.FC = () => {
  const { token, user: authUser } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    loadProfile();
  }, [token, navigate]);

  const loadProfile = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch user profile
      const userResponse = await fetch('/api/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to load user profile');
      }

      const userData = await userResponse.json();
      setUser(userData);

      // Fetch user statistics
      const statsResponse = await fetch('/api/users/me/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!statsResponse.ok) {
        throw new Error('Failed to load user statistics');
      }

      const statsData = await statsResponse.json();
      setStats(statsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profile';
      setError(errorMessage);
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const getGameResult = (game: RecentGame): string => {
    if (game.status !== 'FINISHED') {
      return game.status;
    }

    if (!game.winnerId) {
      return 'Draw';
    }

    if (game.winnerId === authUser?.id) {
      return 'Win';
    }

    return 'Loss';
  };

  const getGameResultColor = (game: RecentGame): string => {
    if (game.status !== 'FINISHED') {
      return 'text-gray-600';
    }

    if (!game.winnerId) {
      return 'text-yellow-600';
    }

    if (game.winnerId === authUser?.id) {
      return 'text-green-600';
    }

    return 'text-red-600';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-red-600 mb-4" role="alert">
              Error: {error || 'Failed to load profile'}
            </div>
            <button
              onClick={loadProfile}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8" data-testid="user-profile">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">User Profile</h1>

        {/* User Info Section */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-2xl font-semibold mb-4">Profile Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-lg text-gray-900">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ELO Rating</label>
              <p className="mt-1 text-lg font-semibold text-gray-900">{stats.elo}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Account Status</label>
              <p className="mt-1 text-lg text-gray-900">
                {user.emailVerified ? (
                  <span className="text-green-600">Verified</span>
                ) : (
                  <span className="text-red-600">Not Verified</span>
                )}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Member Since</label>
              <p className="mt-1 text-lg text-gray-900">{formatDate(user.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Game Statistics Section */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-2xl font-semibold mb-4">Game Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-3xl font-bold text-gray-900">{stats.totalGames}</div>
              <div className="text-sm text-gray-600 mt-1">Total Games</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded">
              <div className="text-3xl font-bold text-green-600">{stats.wins}</div>
              <div className="text-sm text-gray-600 mt-1">Wins</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded">
              <div className="text-3xl font-bold text-red-600">{stats.losses}</div>
              <div className="text-sm text-gray-600 mt-1">Losses</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded">
              <div className="text-3xl font-bold text-blue-600">{stats.winRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600 mt-1">Win Rate</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-xl font-semibold text-gray-900">{stats.ratedGames}</div>
              <div className="text-sm text-gray-600 mt-1">Rated Games</div>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-xl font-semibold text-gray-900">{stats.ratedWins}</div>
              <div className="text-sm text-gray-600 mt-1">Rated Wins</div>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-xl font-semibold text-gray-900">{stats.totalMoves}</div>
              <div className="text-sm text-gray-600 mt-1">Total Moves</div>
            </div>
          </div>
        </div>

        {/* Match History Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Match History</h2>
          {stats.recentGames.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p>No games played yet. Start playing to see your match history!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Game ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Result
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.recentGames.map((game) => (
                    <tr key={game.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {game.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-semibold ${getGameResultColor(game)}`}>
                          {getGameResult(game)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {game.isRated ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            Rated
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                            Unrated
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {game.endedAt ? formatDate(game.endedAt) : formatDate(game.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

