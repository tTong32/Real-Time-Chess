import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

interface ActiveGame {
  id: string;
  whiteId: string;
  blackId: string;
  status: string;
  startedAt: string;
  white: { elo: number };
  black: { elo: number };
}

export const SpectateGameList: React.FC = () => {
  const socket = useSocket();
  const [games, setGames] = useState<ActiveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/games/active');
      if (!response.ok) {
        throw new Error('Failed to fetch games');
      }
      const data = await response.json();
      setGames(data.games || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleSpectate = (gameId: string) => {
    if (!socket.connected) {
      setError('Not connected to server');
      return;
    }
    socket.spectateGame(gameId);
    // Note: Navigation to spectate page would be handled by parent component
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just started';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  };

  return (
    <div className="spectate-game-list" data-testid="spectate-game-list">
      <div className="spectate-header">
        <h3>Spectate Games</h3>
        <button
          className="spectate-refresh"
          onClick={fetchGames}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loading && <div className="spectate-loading">Loading games...</div>}

      {error && (
        <div className="spectate-error" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && games.length === 0 && (
        <div className="spectate-empty">No active games to spectate</div>
      )}

      {!loading && !error && games.length > 0 && (
        <div className="spectate-games">
          {games.map((game) => (
            <div key={game.id} className="spectate-game-item">
              <div className="spectate-game-info">
                <div className="spectate-game-id">Game {game.id.slice(0, 8)}</div>
                <div className="spectate-game-players">
                  <span>White: {game.white.elo} ELO</span>
                  <span>vs</span>
                  <span>Black: {game.black.elo} ELO</span>
                </div>
                <div className="spectate-game-time">
                  Started {formatTime(game.startedAt)}
                </div>
              </div>
              <button
                className="spectate-button"
                onClick={() => handleSpectate(game.id)}
                disabled={!socket.connected}
              >
                Spectate
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

