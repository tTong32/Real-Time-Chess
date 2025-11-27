import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface PendingRequest {
  id: string;
  sender: {
    id: string;
    elo: number;
    createdAt: string;
  };
  createdAt: string;
}

export const PendingFriendRequests: React.FC = () => {
  const { token } = useAuth();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadPendingRequests();
  }, [token]);

  const loadPendingRequests = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/friends/pending', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load pending requests');
      }

      const data = await response.json();
      setRequests(data.pendingRequests || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load pending requests';
      setError(errorMessage);
      console.error('Error loading pending requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (friendshipId: string) => {
    if (!token) return;

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friendshipId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to accept friend request');
      }

      setSuccess('Friend request accepted!');
      // Reload pending requests
      await loadPendingRequests();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept friend request';
      setError(errorMessage);
      console.error('Error accepting friend request:', err);
    }
  };

  const handleReject = async (friendshipId: string) => {
    if (!token) return;

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/friends/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friendshipId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject friend request');
      }

      setSuccess('Friend request rejected');
      // Reload pending requests
      await loadPendingRequests();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject friend request';
      setError(errorMessage);
      console.error('Error rejecting friend request:', err);
    }
  };

  if (loading) {
    return (
      <div className="pending-requests" data-testid="pending-requests">
        <h2 className="text-2xl font-bold mb-4">Pending Friend Requests</h2>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error && !requests.length) {
    return (
      <div className="pending-requests" data-testid="pending-requests">
        <h2 className="text-2xl font-bold mb-4">Pending Friend Requests</h2>
        <div className="text-red-600" role="alert">
          Error: {error}
        </div>
        <button
          onClick={loadPendingRequests}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="pending-requests" data-testid="pending-requests">
      <h2 className="text-2xl font-bold mb-4">Pending Friend Requests</h2>

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

      {requests.length === 0 ? (
        <div className="text-gray-600">
          <p>No pending friend requests.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
            >
              <div>
                <div className="font-semibold">
                  User ID: {request.sender.id.substring(0, 8)}...
                </div>
                <div className="text-sm text-gray-600">ELO: {request.sender.elo}</div>
                <div className="text-xs text-gray-500">
                  Requested: {new Date(request.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(request.id)}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  aria-label={`Accept friend request from ${request.sender.id}`}
                >
                  Accept
                </button>
                <button
                  onClick={() => handleReject(request.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  aria-label={`Reject friend request from ${request.sender.id}`}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

