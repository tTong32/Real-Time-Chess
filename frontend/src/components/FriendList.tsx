import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Friend {
  id: string;
  elo: number;
  createdAt: string;
  friendshipId: string;
  friendshipCreatedAt: string;
}

export const FriendList: React.FC = () => {
  const { token } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFriends();
  }, [token]);

  const loadFriends = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/friends', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load friends');
      }

      const data = await response.json();
      setFriends(data.friends || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load friends';
      setError(errorMessage);
      console.error('Error loading friends:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!token) return;

    if (!confirm('Are you sure you want to remove this friend?')) {
      return;
    }

    try {
      const response = await fetch('/api/friends/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: friendId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove friend');
      }

      // Reload friends list
      await loadFriends();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove friend';
      alert(errorMessage);
      console.error('Error removing friend:', err);
    }
  };

  if (loading) {
    return (
      <div className="friend-list" data-testid="friend-list">
        <h2 className="text-2xl font-bold mb-4">Friends</h2>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="friend-list" data-testid="friend-list">
        <h2 className="text-2xl font-bold mb-4">Friends</h2>
        <div className="text-red-600" role="alert">
          Error: {error}
        </div>
        <button
          onClick={loadFriends}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="friend-list" data-testid="friend-list">
      <h2 className="text-2xl font-bold mb-4">Friends</h2>
      
      {friends.length === 0 ? (
        <div className="text-gray-600">
          <p>No friends yet. Use the search to find and add friends!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {friends.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
            >
              <div>
                <div className="font-semibold">User ID: {friend.id.substring(0, 8)}...</div>
                <div className="text-sm text-gray-600">ELO: {friend.elo}</div>
                <div className="text-xs text-gray-500">
                  Friends since: {new Date(friend.friendshipCreatedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => handleRemoveFriend(friend.id)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                aria-label={`Remove friend ${friend.id}`}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

