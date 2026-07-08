import React, { useState, useEffect } from 'react';

const FIREBASE_BASE = 'https://ydm-bingo-realtime-default-rtdb.firebaseio.com/';

export default function PlayerDirectory() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Interaction management states
  const [expandedPlayerId, setExpandedPlayerId] = useState(null);
  const [editingBalance, setEditingBalance] = useState('');
  const [isMutating, setIsMutating] = useState(false);

  const fetchPlayers = async () => {
    try {
      const response = await fetch(`${FIREBASE_BASE}users.json`);
      const data = await response.json();
      
      if (data) {
        const normalizedPlayers = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setPlayers(normalizedPlayers);
      } else {
        setPlayers([]);
      }
    } catch (error) {
      console.error("Error fetching players:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  // Update a player's balance directly in the RTDB node
  const handleUpdateBalance = async (playerId) => {
    const parsedAmt = parseFloat(editingBalance);
    if (isNaN(parsedAmt) || parsedAmt < 0) {
      alert("Please enter a valid balance amount (0 or greater).");
      return;
    }

    setIsMutating(true);
    try {
      await fetch(`${FIREBASE_BASE}users/${playerId}/balance.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedAmt)
      });
      
      alert('Player ledger balance synchronized.');
      setEditingBalance('');
      await fetchPlayers();
    } catch (err) {
      console.error("Balance synchronization fault:", err);
    } finally {
      setIsMutating(false);
    }
  };

  // Completely drop a player entity record from the node queue
  const handleDeletePlayer = async (playerId, name) => {
    if (!window.confirm(`Are you absolutely sure you want to completely remove "${name || 'this player'}" from the database? This action cannot be undone.`)) {
      return;
    }

    setIsMutating(true);
    try {
      await fetch(`${FIREBASE_BASE}users/${playerId}.json`, {
        method: 'DELETE'
      });
      
      alert('Player entity evicted successfully.');
      if (expandedPlayerId === playerId) setExpandedPlayerId(null);
      await fetchPlayers();
    } catch (err) {
      console.error("Dehabitation process halted:", err);
    } finally {
      setIsMutating(false);
    }
  };

  const toggleExpandPlayer = (player) => {
    if (expandedPlayerId === player.id) {
      setExpandedPlayerId(null);
      setEditingBalance('');
    } else {
      setExpandedPlayerId(player.id);
      setEditingBalance(parseFloat(player.balance || 0).toString());
    }
  };

  const filteredPlayers = players.filter(player => 
    (player.username || player.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (player.phone || '').includes(searchTerm)
  );

  return (
    <div className="view-pane">
      <style>{`
        .search-input { background: #070709; border: 1px solid rgba(255,255,255,0.05); padding: 8px 14px; border-radius: 6px; color: #fff; font-size: 13px; width: 240px; }
        .search-input:focus { outline: 1px solid #ffbc00; }
        .management-table tr.clickable-row { cursor: pointer; transition: background 0.15s; }
        .management-table tr.clickable-row:hover { background: rgba(255,255,255,0.02); }
        .management-table tr.expanded-row { background: #13131a; }
        .detail-panel-box { padding: 16px 20px; border-left: 3px solid #ffbc00; background: rgba(255, 188, 0, 0.01); display: flex; justify-content: space-between; align-items: flex-start; gap: 40px; }
        .detail-group { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px 28px; flex-grow: 1; }
        .detail-field span { display: block; font-size: 11px; color: #8a8a93; text-transform: uppercase; margin-bottom: 2px; }
        .detail-field p { margin: 0; font-size: 13px; color: #fff; font-weight: 500; word-break: break-all; }
        .interaction-panel-card { background: #070709; border: 1px solid rgba(255,255,255,0.05); border-radius: 6px; padding: 14px; width: 300px; display: flex; flex-direction: column; gap: 12px; }
        .interaction-panel-card h5 { margin: 0; font-size: 12px; color: #8a8a93; text-transform: uppercase; }
        .balance-input-row { display: flex; gap: 8px; }
        .inline-input { background: #111115; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 6px 10px; color: #fff; font-size: 13px; width: 100%; }
        .inline-input:focus { outline: 1px solid #ffbc00; }
        .save-btn { background: #ffbc00; color: #000; border: none; font-weight: 600; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 12px; }
        .delete-btn { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); font-weight: 600; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s; text-align: center; }
        .delete-btn:hover { background: #ef4444; color: #fff; }
        .save-btn:disabled, .delete-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .mono { font-family: monospace; }
        .bold { font-weight: 600; color: #fff; }
        .accent-text { color: #ffbc00; font-weight: 600; }
        .dim-text { color: #8a8a93; font-size: 13px; }
      `}</style>

      <div className="view-header">
        <div>
          <h3>👥 Player Directory</h3>
          <p style={{ color: '#8a8a93', fontSize: '13px', margin: '4px 0 0 0' }}>Click any row entry to manage ledger parameters or evict individual registration contexts.</p>
        </div>
        <input 
          type="text" 
          placeholder="Search by name or phone..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {loading ? (
        <div style={{ padding: '32px', color: '#8a8a93', textAlign: 'center' }}>Loading synchronized database records...</div>
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
                filteredPlayers.map((player) => {
                  const isExpanded = expandedPlayerId === player.id;
                  return (
                    <React.Fragment key={player.id}>
                      {/* MAIN CLICKABLE RECORD ROW */}
                      <tr 
                        className={`clickable-row ${isExpanded ? 'expanded-row' : ''}`}
                        onClick={() => toggleExpandPlayer(player)}
                      >
                        <td className="mono">{player.id.substring(0, 8)}...</td>
                        <td className="bold">{player.username || player.name || 'N/A'}</td>
                        <td>{player.phone || 'N/A'}</td>
                        <td className="accent-text">ETB {parseFloat(player.balance || 0).toFixed(2)}</td>
                        <td className="dim-text">{player.createdAt ? new Date(player.createdAt).toLocaleDateString() : 'N/A'}</td>
                      </tr>

                      {/* CONDITIONAL SUB-PANEL DRAWER FOR METRIC MUTATIONS */}
                      {isExpanded && (
                        <tr className="expanded-row">
                          <td colSpan="5" style={{ padding: '0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <div className="detail-panel-box">
                              
                              {/* Metadata Grid Fields */}
                              <div className="detail-group">
                                <div className="detail-field">
                                  <span>Full Database Key</span>
                                  <p className="mono" style={{ fontSize: '12px', color: '#8a8a93' }}>{player.id}</p>
                                </div>
                                <div className="detail-field">
                                  <span>Account Lifecycle State</span>
                                  <p style={{ color: '#4ade80' }}>● Active Connected Client</p>
                                </div>
                                <div className="detail-field">
                                  <span>Telegram Handshake ID</span>
                                  <p className="mono">{player.telegramId || 'No Bound Telegram Session'}</p>
                                </div>
                                <div className="detail-field">
                                  <span>Timestamp Epoch</span>
                                  <p className="mono">{player.createdAt || 'N/A'}</p>
                                </div>
                              </div>

                              {/* Balance & Ledger Management Console block */}
                              <div className="interaction-panel-card">
                                <h5>Ledger Balance Correction</h5>
                                <div className="balance-input-row">
                                  <input 
                                    type="number" 
                                    className="inline-input"
                                    step="0.01"
                                    value={editingBalance}
                                    onChange={(e) => setEditingBalance(e.target.value)}
                                    onClick={(e) => e.stopPropagation()} // Stop accordion from collapsing when typing
                                    disabled={isMutating}
                                  />
                                  <button 
                                    className="save-btn"
                                    disabled={isMutating}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateBalance(player.id);
                                    }}
                                  >
                                    Apply
                                  </button>
                                </div>

                                <button 
                                  className="delete-btn"
                                  disabled={isMutating}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePlayer(player.id, player.username || player.name);
                                  }}
                                >
                                  🗑️ Delete Profile Permanently
                                </button>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#8a8a93' }}>No players match current filter targets.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}