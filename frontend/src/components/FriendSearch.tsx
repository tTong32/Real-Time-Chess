import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface SearchResultUser {
  id: string;
  elo: number;
  createdAt: string;
}

export const FriendSearch: React.FC = () => {
  const { token } = useAuth();
  const [searchEmail, setSearchEmail] = useState('');
  const [users, setUsers] = useState<SearchResultUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchEmail.trim() || !token) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setUsers([]);

    try {
      const response = await fetch(`/api/friends/search?email=${encodeURIComponent(searchEmail)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to search users');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search users';
      setError(errorMessage);
      console.error('Error searching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    if (!token) return;

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/friends/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send friend request');
      }

      setSuccess('Friend request sent!');
      // Remove the user from search results
      setUsers(users.filter((u) => u.id !== userId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send friend request';
      setError(errorMessage);
      console.error('Error sending friend request:', err);
    }
  };

  return (
    <div className="friend-search" data-testid="friend-search">
      <h2 className="text-2xl font-bold mb-4">Search for Friends</h2>
      
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search by email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading || !token}
          />
          <button
            type="submit"
            disabled={loading || !token || !searchEmail.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded" role="alert">
          {success}
        </div>
      )}

      {users.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Search Results</h3>
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
            >
              <div>
                <div className="font-semibold">User ID: {user.id.substring(0, 8)}...</div>
                <div className="text-sm text-gray-600">ELO: {user.elo}</div>
              </div>
              <button
                onClick={() => handleSendFriendRequest(user.id)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                aria-label={`Add friend ${user.id}`}
              >
                Add Friend
              </button>
            </div>
          ))}
        </div>
      )}

      {users.length === 0 && !loading && searchEmail && !error && (
        <div className="text-gray-600">
          <p>No users found. Try a different email address.</p>
        </div>
      )}
    </div>
  );
};

