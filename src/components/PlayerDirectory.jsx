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
    <div className="directory-container">
      <style>{`
        .directory-container { color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        
        /* Modern Header Layout */
        .directory-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
        .header-title h3 { font-size: 20px; font-weight: 600; margin: 0; color: #ffffff; letter-spacing: -0.02em; }
        .header-title p { color: #a1a1aa; font-size: 14px; margin: 6px 0 0 0; }
        
        /* Glassmorphic Search Bar */
        .search-wrapper { position: relative; }
        .search-input { background: #18181b; border: 1px solid #27272a; padding: 10px 16px; padding-left: 36px; border-radius: 10px; color: #fff; font-size: 14px; width: 280px; transition: all 0.2s ease; }
        .search-input:focus { outline: none; border-color: #ffbc00; background: #202024; box-shadow: 0 0 0 3px rgba(255, 188, 0, 0.15); }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #71717a; font-size: 14px; pointer-events: none; }
        
        /* Table Layout Modernization */
        .modern-table-card { background: #111115; border: 1px solid #222226; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2); }
        .modern-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
        .modern-table th { background: #141419; padding: 14px 20px; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; color: #71717a; border-bottom: 1px solid #222226; }
        .modern-table td { padding: 16px 20px; border-bottom: 1px solid #1c1c21; color: #e4e4e7; vertical-align: middle; }
        
        .row-interactive { cursor: pointer; transition: background 0.2s ease; }
        .row-interactive:hover { background: #16161c; }
        .row-active { background: #16161c; }
        
        /* Modern Badges & Micro-Typography */
        .player-id-pill { background: #1c1c21; color: #a1a1aa; padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 12px; border: 1px solid #27272a; }
        .player-name-bold { font-weight: 600; color: #ffffff; font-size: 14px; }
        .balance-accent { color: #ffbc00; font-weight: 700; font-size: 15px; }
        .status-pill { display: inline-flex; align-items: center; gap: 6px; background: rgba(74, 222, 128, 0.1); color: #4ade80; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
        
        /* Dynamic Accordion Dropdown Content */
        .drawer-td { padding: 0 !important; background: #0e0e12; }
        .drawer-inner-box { padding: 24px; display: flex; gap: 32px; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; border-bottom: 1px solid #222226; }
        
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; flex-grow: 1; }
        .info-meta-node { display: flex; flex-direction: column; gap: 4px; }
        .info-meta-node label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; color: #71717a; font-weight: 600; }
        .info-meta-node p { margin: 0; font-size: 14px; color: #e4e4e7; word-break: break-all; }
        
        /* Control Terminal Box */
        .console-card { background: #141419; border: 1px solid #222226; border-radius: 10px; padding: 18px; width: 320px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .console-card h5 { margin: 0; font-size: 12px; text-transform: uppercase; color: #a1a1aa; letter-spacing: 0.02em; }
        
        .input-group-action { display: flex; gap: 8px; position: relative; }
        .console-input { background: #09090b; border: 1px solid #27272a; border-radius: 8px; padding: 10px 12px; color: #fff; font-size: 14px; width: 100%; box-sizing: border-box; transition: border 0.2s; }
        .console-input:focus { outline: none; border-color: #ffbc00; }
        
        /* Action Buttons styling */
        .btn-action-primary { background: #ffbc00; color: #000; border: none; font-weight: 600; padding: 0 16px; border-radius: 8px; cursor: pointer; font-size: 13px; transition: opacity 0.2s; }
        .btn-action-primary:hover { opacity: 0.9; }
        
        .btn-action-danger { background: transparent; color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.3); font-weight: 500; padding: 10px; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .btn-action-danger:hover { background: #f43f5e; color: #fff; border-color: #f43f5e; }
        
        .btn-action-primary:disabled, .btn-action-danger:disabled { opacity: 0.3; cursor: not-allowed; }
        .table-loader { padding: 48px; text-align: center; color: #a1a1aa; font-size: 14px; }
      `}</style>

      {/* Header Segment */}
      <div className="directory-header">
        <div className="header-title">
          <h3>Player Directory</h3>
          <p>Manage real-time player ledgers, review handshake identifiers, and adjust balance nodes.</p>
        </div>
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Search by name, handle or phone..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Table Module Wrapper */}
      {loading ? (
        <div className="modern-table-card table-loader">
          Loading synchronized database records...
        </div>
      ) : (
        <div className="modern-table-card">
          <table className="modern-table">
            <thead>
              <tr>
                <th>ID Handle</th>
                <th>Username / Name</th>
                <th>Phone Number</th>
                <th>Current Ledger</th>
                <th>Registration Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.length > 0 ? (
                filteredPlayers.map((player) => {
                  const isExpanded = expandedPlayerId === player.id;
                  return (
                    <React.Fragment key={player.id}>
                      {/* Main Entry Row */}
                      <tr 
                        className={`row-interactive ${isExpanded ? 'row-active' : ''}`}
                        onClick={() => toggleExpandPlayer(player)}
                      >
                        <td><span className="player-id-pill">{player.id.substring(0, 8)}</span></td>
                        <td><span className="player-name-bold">{player.username || player.name || 'N/A'}</span></td>
                        <td>{player.phone || '—'}</td>
                        <td><span className="balance-accent">ETB {parseFloat(player.balance || 0).toFixed(2)}</span></td>
                        <td style={{ color: '#71717a' }}>
                          {player.createdAt ? new Date(player.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                        </td>
                      </tr>

                      {/* Dropdown Administration Drawer Panel */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="5" className="drawer-td">
                            <div className="drawer-inner-box">
                              
                              {/* Metadata Presentation */}
                              <div className="info-grid">
                                <div className="info-meta-node">
                                  <label>Full Firebase Reference Node String</label>
                                  <p style={{ fontFamily: 'monospace', fontSize: '13px', color: '#a1a1aa' }}>{player.id}</p>
                                </div>
                                <div className="info-meta-node">
                                  <label>Network Lifecycle Status</label>
                                  <div>
                                    <span className="status-pill"><span style={{ fontSize: '8px' }}>●</span> Active Context Connected</span>
                                  </div>
                                </div>
                                <div className="info-meta-node">
                                  <label>Telegram Handshake Session ID</label>
                                  <p style={{ fontFamily: 'monospace' }}>{player.telegramId || 'No Session Bound'}</p>
                                </div>
                                <div className="info-meta-node">
                                  <label>Creation Epoch Timestamp</label>
                                  <p style={{ fontFamily: 'monospace', color: '#71717a' }}>{player.createdAt || '—'}</p>
                                </div>
                              </div>

                              {/* Terminal Control Console panel */}
                              <div className="console-card">
                                <h5>Ledger Balance Modification</h5>
                                <div className="input-group-action">
                                  <input 
                                    type="number" 
                                    className="console-input"
                                    step="0.01"
                                    value={editingBalance}
                                    onChange={(e) => setEditingBalance(e.target.value)}
                                    onClick={(e) => e.stopPropagation()} 
                                    disabled={isMutating}
                                  />
                                  <button 
                                    className="btn-action-primary"
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
                                  className="btn-action-danger"
                                  disabled={isMutating}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePlayer(player.id, player.username || player.name);
                                  }}
                                >
                                  🗑️ Evict Account Record Completely
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
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>
                    No player accounts match your filtering targets.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}