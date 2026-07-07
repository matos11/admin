import React, { useState, useEffect } from 'react';

const FIREBASE_USERS_URL = 'https://ydm-bingo-realtime-default-rtdb.firebaseio.com/users.json';

export default function PlayerDirectory() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch(FIREBASE_USERS_URL);
        const data = await response.json();
        
        if (data) {
          // Firebase RTDB returns an object or array. Normalize it into an array.
          const normalizedPlayers = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          }));
          setPlayers(normalizedPlayers);
        }
      } catch (error) {
        console.error("Error fetching players:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  const filteredPlayers = players.filter(player => 
    (player.username || player.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (player.phone || '').includes(searchTerm)
  );

  return (
    <div className="view-pane">
      <div className="view-header">
        <h3>👥 Player Directory</h3>
        <input 
          type="text" 
          placeholder="Search by name or phone..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {loading ? (
        <div className="loader">Loading players...</div>
      ) : (
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th>Player ID</th>
                <th>Username / Name</th>
                <th>Phone Number</th>
                <th>Current Balance</th>
                <th>Joined Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.length > 0 ? (
                filteredPlayers.map((player) => (
                  <tr key={player.id}>
                    <td className="mono">{player.id.substring(0, 8)}...</td>
                    <td className="bold">{player.username || player.name || 'N/A'}</td>
                    <td>{player.phone || 'N/A'}</td>
                    <td className="accent-text">ETB {parseFloat(player.balance || 0).toFixed(2)}</td>
                    <td className="dim-text">{player.createdAt ? new Date(player.createdAt).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="center-text">No players found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}