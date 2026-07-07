import React, { useState, useEffect } from 'react';
import PlayerDirectory from './PlayerDirectory';
import WithdrawalVault from './WithdrawalVault';

const FIREBASE_BASE = 'https://ydm-bingo-realtime-default-rtdb.firebaseio.com/';

export default function Dashboard({ adminUser = 'Admin' }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState('broadcast'); // views: broadcast, players, deposits, withdrawals
  const [viewTitle, setViewTitle] = useState('Broadcast Engine');
  const [metrics, setMetrics] = useState({ total_users: 0, total_balance: 0, pending_withdrawals: 0 });

  // Component-specific functional state
  const [broadcastText, setBroadcastText] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [rawTransactions, setRawTransactions] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState([]);

  // Fetch standard operational metrics
  const fetchLiveMetrics = async () => {
    try {
      const [usersRes, withdrawalsRes] = await Promise.all([
        fetch(`${FIREBASE_BASE}users.json`),
        fetch(`${FIREBASE_BASE}withdrawals.json`)
      ]);
      
      const usersData = await usersRes.json() || {};
      const withdrawalsData = await withdrawalsRes.json() || {};

      const usersArray = Object.values(usersData);
      const withdrawalsArray = Object.values(withdrawalsData);

      const total_users = usersArray.length;
      const total_balance = usersArray.reduce((acc, curr) => acc + parseFloat(curr.balance || 0), 0);
      const pending_withdrawals = withdrawalsArray.filter(w => w.status === 'pending').length;

      setMetrics({ total_users, total_balance, pending_withdrawals });
    } catch (err) {
      console.log('Metrics polling issue:', err);
    }
  };

  // Fetch raw SMS transactions node for the Deposit System view
  const fetchRawTransactions = async () => {
    try {
      const res = await fetch(`${FIREBASE_BASE}transactions.json`);
      const data = await res.json();
      setRawTransactions(data || {});
    } catch (err) {
      console.log('Error fetching transaction pool:', err);
    }
  };

  useEffect(() => {
    fetchLiveMetrics();
    fetchRawTransactions();
    const interval = setInterval(() => {
      fetchLiveMetrics();
      if (currentView === 'deposits') fetchRawTransactions();
    }, 12000);
    return () => clearInterval(interval);
  }, [currentView]);

  const switchView = (viewKey, title) => {
    setCurrentView(viewKey);
    setViewTitle(title);
  };

  // Telegram Broadcast Engine Push Action
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;

    setIsBroadcasting(true);
    try {
      // Pushes an event to a dedicated queue that your Telegram bot script listens to
      const payload = {
        message: broadcastText.trim(),
        sender: adminUser,
        timestamp: Date.now(),
        status: 'pending'
      };

      await fetch(`${FIREBASE_BASE}telegram_broadcasts.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      alert('Broadcast signal successfully dispatched to Telegram bot queue.');
      setBroadcastText('');
    } catch (err) {
      console.error('Failed to send broadcast:', err);
      alert('Network failure syncing broadcast transmission.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Telebirr Native Regex Parser & Processing Queue Pipeline
  const runSmsSyncProcessor = async () => {
    if (Object.keys(rawTransactions).length === 0) {
      alert('The incoming transaction pool queue is currently empty.');
      return;
    }

    setIsSyncing(true);
    const logs = [];
    let processedCount = 0;

    try {
      for (const [firebasePushId, data] of Object.entries(rawTransactions)) {
        const messageText = data?.message || '';
        if (!messageText) continue;

        let txId = '';
        let amount = 0.00;
        let sender = 'Unknown Customer';

        // Extract 10-character mechanical Telebirr ID (e.g., DEJ85VI416)
        const idMatch = messageText.toUpperCase().match(/\b([A-Z0-9]{10})\b/);
        if (idMatch) txId = idMatch[1];

        // Extract native currency structures
        const amtMatchEng = messageText.match(/received\s+ETB\s*([\d,]+\.\d{2})/i);
        const amtMatchAmh = messageText.match(/([\d,]+\.\d{2})\s*ብር/u);

        if (amtMatchEng) {
          amount = parseFloat(amtMatchEng[1].replace(/,/g, ''));
        } else if (amtMatchAmh) {
          amount = parseFloat(amtMatchAmh[1].replace(/,/g, ''));
        }

        // Extract sender identities
        const senderMatchEng = messageText.match(/from\s+([A-Za-z0-9\s\+\.\(\)]+?)(?=\s+\d)/i);
        const senderMatchAmh = messageText.match(/ወደ\s+([A-Za-z0-9\s\+\.\(\)]+?)(?=\s+\d)/u);

        if (senderMatchEng) {
          sender = senderMatchEng[1].trim();
        } else if (senderMatchAmh) {
          sender = senderMatchAmh[1].trim();
        }

        if (!txId) {
          logs.push(`⚠️ Skipped node ${firebasePushId}: Unable to resolve clean Reference ID structural layout.`);
          continue;
        }

        const targetDepositUrl = `${FIREBASE_BASE}deposits/${txId}.json`;
        
        // Safety verification check to prevent accidental mutation of claimed nodes
        const checkRes = await fetch(targetDepositUrl);
        const exists = await checkRes.json();

        if (!exists) {
          const depositPayload = {
            tx_id: txId,
            amount: amount,
            sender: sender,
            raw_text: messageText,
            status: 'unclaimed',
            timestamp: data?.timestamp ? parseInt(data.timestamp, 10) : Date.now()
          };

          await fetch(targetDepositUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(depositPayload)
          });
        }

        // Drop from queue once verified
        await fetch(`${FIREBASE_BASE}transactions/${firebasePushId}.json`, { method: 'DELETE' });
        logs.push(`✅ Handled transaction: ${txId} | ETB ${amount.toFixed(2)} from ${sender}`);
        processedCount++;
      }

      setSyncLogs(logs);
      alert(`Synchronization run complete. Extracted and structured ${processedCount} records.`);
      await fetchRawTransactions();
    } catch (err) {
      console.error('Queue processing halted mid-execution:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="dashboard-root-wrapper">
      <style>{`
        :root { --accent: #ffbc00; --bg: #070709; --card-bg: #111115; --border: rgba(255,255,255,0.05); --text-dim: #8a8a93; }
        .dashboard-root-wrapper { font-family: sans-serif; background-color: var(--bg); color: #e1e1e6; display: flex; height: 100vh; width: 100vw; overflow: hidden; }
        .sidebar { width: 260px; background: var(--card-bg); border-right: 1px solid var(--border); display: flex; flex-direction: column; justify-content: space-between; transition: all 0.3s ease; }
        .sidebar.collapsed { width: 0px; transform: translateX(-260px); border-right: none; }
        .brand { padding: 24px; border-bottom: 1px solid var(--border); }
        .brand h1 { font-size: 18px; color: #fff; font-weight: 700; margin: 0; }
        .brand h1 span { color: var(--accent); }
        .nav-list { padding: 16px 12px; list-style: none; flex-grow: 1; margin: 0; }
        .nav-link { display: flex; width: 100%; align-items: center; padding: 12px 16px; color: var(--text-dim); border: none; background: transparent; font-size: 14px; text-align: left; cursor: pointer; border-radius: 8px; margin-bottom: 4px; }
        .nav-link:hover, .nav-link.active { color: #fff; background: rgba(255, 255, 255, 0.03); }
        .nav-link.active { background: rgba(255, 188, 0, 0.08) !important; color: var(--accent); font-weight: 600; box-shadow: inset 3px 0 0 var(--accent); }
        .user-profile { padding: 16px 20px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; font-size: 13px; }
        .main-content { flex-grow: 1; display: flex; flex-direction: column; background: #09090b; }
        .top-bar { padding: 12px 24px; background: var(--card-bg); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; min-height: 60px; }
        .top-bar-left { display: flex; align-items: center; gap: 16px; }
        .toggle-sidebar-btn { background: rgba(255,255,255,0.03); border: 1px solid var(--border); color: #fff; padding: 8px 12px; border-radius: 6px; cursor: pointer; }
        .compact-metrics { display: flex; align-items: center; gap: 24px; }
        .metric-inline { display: flex; align-items: center; gap: 8px; font-size: 13px; }
        .metric-inline .lbl { color: var(--text-dim); }
        .metric-inline .val { color: #fff; font-weight: 700; background: rgba(255,255,255,0.03); padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border); }
        .metric-inline .val span { color: var(--accent); font-size: 11px; margin-right: 2px; }
        .view-container { flex-grow: 1; padding: 20px; overflow-y: auto; box-sizing: border-box; }
        
        .view-pane { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); height: 100%; box-sizing: border-box; display: flex; flex-direction: column; }
        .view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        
        /* Form & Engine Additions styling */
        .broadcast-form { display: flex; flex-direction: column; gap: 16px; max-width: 600px; }
        .textarea-input { background: #070709; border: 1px solid var(--border); padding: 14px; border-radius: 8px; color: #fff; font-size: 14px; resize: vertical; min-height: 120px; }
        .action-btn { background: var(--accent); color: #000; padding: 10px 20px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; max-width: fit-content; }
        .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .management-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
        .management-table th { padding: 12px; border-bottom: 2px solid var(--border); color: var(--text-dim); font-weight: 600; }
        .management-table td { padding: 14px 12px; border-bottom: 1px solid var(--border); }
        .table-responsive { overflow-x: auto; flex-grow: 1; max-height: 350px; }
        
        .log-box { background: #070709; border: 1px solid var(--border); border-radius: 6px; padding: 12px; font-family: monospace; font-size: 12px; color: #4ade80; overflow-y: auto; height: 150px; margin-top: 16px; }
      `}</style>

      {/* Sidebar navigation wrapper */}
      <div className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div>
          <div className="brand"><h1>YDM <span>BINGO</span></h1></div>
          <ul className="nav-list">
            <li><button className={`nav-link ${currentView === 'broadcast' ? 'active' : ''}`} onClick={() => switchView('broadcast', 'Broadcast Engine')}>📢 Broadcast Engine</button></li>
            <li><button className={`nav-link ${currentView === 'players' ? 'active' : ''}`} onClick={() => switchView('players', 'Player Directory')}>👥 Player Directory</button></li>
            <li><button className={`nav-link ${currentView === 'deposits' ? 'active' : ''}`} onClick={() => switchView('deposits', 'Deposit System')}>📥 Deposit System</button></li>
            <li><button className={`nav-link ${currentView === 'withdrawals' ? 'active' : ''}`} onClick={() => switchView('withdrawals', 'Withdrawal Vault')}>📤 Withdrawal Vault</button></li>
          </ul>
        </div>
        <div className="user-profile">
          <span>👤 {adminUser}</span>
        </div>
      </div>

      {/* Main Workspace Frame panel area */}
      <div className="main-content">
        <div className="top-bar">
          <div className="top-bar-left">
            <button className="toggle-sidebar-btn" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
              {isSidebarCollapsed ? '▶' : '◀'} Panel
            </button>
            <h2>{viewTitle}</h2>
          </div>

          <div className="compact-metrics">
            <div className="metric-inline"><span className="lbl">Players</span><span className="val">{metrics.total_users}</span></div>
            <div className="metric-inline"><span className="lbl">Liability</span><span className="val"><span>ETB</span> {metrics.total_balance.toFixed(2)}</span></div>
            <div className="metric-inline">
              <span className="lbl">Pending Payouts</span>
              <span className="val" style={{ color: metrics.pending_withdrawals > 0 ? '#ffbc00' : '#fff' }}>{metrics.pending_withdrawals}</span>
            </div>
          </div>
        </div>

        <div className="view-container">
          {/* VIEW: Broadcast Engine */}
          {currentView === 'broadcast' && (
            <div className="view-pane">
              <div className="view-header">
                <div>
                  <h3>Global Bot Notification Dispatcher</h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '4px 0 0 0' }}>Sends real-time global messages down the Telegram client network pipeline.</p>
                </div>
              </div>
              <form className="broadcast-form" onSubmit={handleSendBroadcast}>
                <textarea 
                  className="textarea-input"
                  placeholder="Type structural notification string or system maintenance warning updates..."
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  disabled={isBroadcasting}
                />
                <button type="submit" className="action-btn" disabled={isBroadcasting || !broadcastText.trim()}>
                  {isBroadcasting ? 'Dispatched Syncing...' : 'Fire Broadcast Alert'}
                </button>
              </form>
            </div>
          )}

          {/* VIEW: Player Directory */}
          {currentView === 'players' && <PlayerDirectory />}

          {/* VIEW: Deposit System (SMS Parsing Interface) */}
          {currentView === 'deposits' && (
            <div className="view-pane">
              <div className="view-header">
                <div>
                  <h3>Telebirr Incoming SMS Queue</h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '4px 0 0 0' }}>
                    Currently hosting <strong>{Object.keys(rawTransactions).length}</strong> unparsed raw notifications.
                  </p>
                </div>
                <button className="action-btn" onClick={runSmsSyncProcessor} disabled={isSyncing || Object.keys(rawTransactions).length === 0}>
                  {isSyncing ? 'Parsing Log Strings...' : 'Run Extraction Pipeline'}
                </button>
              </div>

              <div className="table-responsive">
                <table className="management-table">
                  <thead>
                    <tr>
                      <th style={{ width: '20%' }}>Push Key</th>
                      <th>Raw Transmitted Body</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(rawTransactions).length === 0 ? (
                      <tr>
                        <td colSpan="2" style={{ textDim: 'center', color: 'var(--text-dim)', padding: '24px' }}>
                          No raw entries to pull from incoming database channels.
                        </td>
                      </tr>
                    ) : (
                      Object.entries(rawTransactions).map(([id, item]) => (
                        <tr key={id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-dim)' }}>{id}</td>
                          <td style={{ fontSize: '13px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{item.message}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {syncLogs.length > 0 && (
                <div>
                  <h4 style={{ margin: '16px 0 8px 0', fontSize: '13px' }}>Execution Sync Traces:</h4>
                  <div className="log-box">
                    {syncLogs.map((log, index) => <div key={index}>{log}</div>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: Withdrawal Vault */}
          {currentView === 'withdrawals' && <WithdrawalVault />}
        </div>
      </div>
    </div>
  );
}