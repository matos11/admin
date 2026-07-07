import React, { useState, useEffect } from 'react';
import PlayerDirectory from './PlayerDirectory';
import WithdrawalVault from './WithdrawalVault';
import DepositSystem from './DepositSystem';
const FIREBASE_BASE = 'https://ydm-bingo-realtime-default-rtdb.firebaseio.com/';

export default function Dashboard({ adminUser = 'Admin' }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState('broadcast'); // views: broadcast, players, deposits, withdrawals
  const [viewTitle, setViewTitle] = useState('Broadcast Engine');
  const [metrics, setMetrics] = useState({ total_users: 0, total_balance: 0, pending_withdrawals: 0 });

  // Component states
  const [broadcastText, setBroadcastText] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [rawTransactions, setRawTransactions] = useState({});
  const [parsedDeposits, setParsedDeposits] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState([]);

  // Fetch metrics
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

  // Fetch raw SMS transactions and structured deposits
  const fetchDepositData = async () => {
    try {
      const [transRes, depoRes] = await Promise.all([
        fetch(`${FIREBASE_BASE}transactions.json`),
        fetch(`${FIREBASE_BASE}deposits.json`)
      ]);
      const transData = await transRes.json();
      const depoData = await depoRes.json();
      
      setRawTransactions(transData || {});
      setParsedDeposits(depoData || {});
    } catch (err) {
      console.log('Error updating deposit view frames:', err);
    }
  };

  useEffect(() => {
    fetchLiveMetrics();
    fetchDepositData();
    const interval = setInterval(() => {
      fetchLiveMetrics();
      if (currentView === 'deposits') fetchDepositData();
    }, 12000);
    return () => clearInterval(interval);
  }, [currentView]);

  const switchView = (viewKey, title) => {
    setCurrentView(viewKey);
    setViewTitle(title);
  };

  // Dispatch global broadcast message to database node
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;

    setIsBroadcasting(true);
    try {
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

      alert('Broadcast dispatched safely to Telegram backend queue node.');
      setBroadcastText('');
    } catch (err) {
      console.error(err);
      alert('Network fault dispatching broadcast data.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Regex Core processor for parsing SMS logs live
  const runSmsSyncProcessor = async () => {
    if (Object.keys(rawTransactions).length === 0) {
      alert('The raw transaction pool is clean.');
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

        const idMatch = messageText.toUpperCase().match(/\b([A-Z0-9]{10})\b/);
        if (idMatch) txId = idMatch[1];

        const amtMatchEng = messageText.match(/received\s+ETB\s*([\d,]+\.\d{2})/i);
        const amtMatchAmh = messageText.match(/([\d,]+\.\d{2})\s*ብር/u);

        if (amtMatchEng) {
          amount = parseFloat(amtMatchEng[1].replace(/,/g, ''));
        } else if (amtMatchAmh) {
          amount = parseFloat(amtMatchAmh[1].replace(/,/g, ''));
        }

        const senderMatchEng = messageText.match(/from\s+([A-Za-z0-9\s\+\.\(\)]+?)(?=\s+\d)/i);
        const senderMatchAmh = messageText.match(/ወደ\s+([A-Za-z0-9\s\+\.\(\)]+?)(?=\s+\d)/u);

        if (senderMatchEng) {
          sender = senderMatchEng[1].trim();
        } else if (senderMatchAmh) {
          sender = senderMatchAmh[1].trim();
        }

        if (!txId) {
          logs.push(`⚠️ Invalid structural formatting on push node ${firebasePushId}`);
          continue;
        }

        const targetDepositUrl = `${FIREBASE_BASE}deposits/${txId}.json`;
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

        await fetch(`${FIREBASE_BASE}transactions/${firebasePushId}.json`, { method: 'DELETE' });
        logs.push(`✅ Saved: ${txId} | ETB ${amount.toFixed(2)}`);
        processedCount++;
      }

      setSyncLogs(logs);
      alert(`Pipeline optimization execution complete. Normalized ${processedCount} entries.`);
      await fetchDepositData();
    } catch (err) {
      console.error(err);
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
        
        /* Grid setup for Deposits section layout split */
        .deposit-split-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; flex-grow: 1; min-height: 0; }
        .deposit-panel-card { background: #13131a; border: 1px solid var(--border); border-radius: 6px; padding: 16px; display: flex; flex-direction: column; min-height: 0; }
        .deposit-panel-card h4 { margin: 0 0 12px 0; color: #fff; font-size: 15px; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
        
        .broadcast-form { display: flex; flex-direction: column; gap: 16px; max-width: 600px; }
        .textarea-input { background: #070709; border: 1px solid var(--border); padding: 14px; border-radius: 8px; color: #fff; font-size: 14px; min-height: 120px; }
        .action-btn { background: var(--accent); color: #000; padding: 10px 20px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }
        .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .management-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
        .management-table th { padding: 10px; border-bottom: 2px solid var(--border); color: var(--text-dim); }
        .management-table td { padding: 10px; border-bottom: 1px solid var(--border); }
        .table-responsive { overflow-x: auto; overflow-y: auto; flex-grow: 1; }
        .log-box { background: #070709; border: 1px solid var(--border); border-radius: 6px; padding: 10px; font-family: monospace; font-size: 11px; color: #4ade80; height: 100px; overflow-y: auto; margin-top: 10px; }
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

      {/* Main Workspace Panel */}
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
                  <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '4px 0 0 0' }}>Sends real-time messages to the Telegram client network channel.</p>
                </div>
              </div>
              <form className="broadcast-form" onSubmit={handleSendBroadcast}>
                <textarea 
                  className="textarea-input"
                  placeholder="Type message string or maintenance warning updates here..."
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  disabled={isBroadcasting}
                />
                <button type="submit" className="action-btn" disabled={isBroadcasting || !broadcastText.trim()}>
                  {isBroadcasting ? 'Sending...' : 'Fire Broadcast Alert'}
                </button>
              </form>
            </div>
          )}

          {/* VIEW: Player Directory */}
          {currentView === 'players' && <PlayerDirectory />}

          {/* VIEW: Deposit System Matrix */}
          {currentView === 'deposits' && (
            <div className="view-pane">
              <div className="view-header" style={{ marginBottom: '14px' }}>
                <div>
                  <h3>Deposit Management Terminal</h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: '2px 0 0 0' }}>Parse incoming SMS message queues down to structured structural reference payloads.</p>
                </div>
                <button className="action-btn" onClick={runSmsSyncProcessor} disabled={isSyncing || Object.keys(rawTransactions).length === 0}>
                  {isSyncing ? 'Parsing logs...' : '⚡ Run Extraction Sync Engine'}
                </button>
              </div>

              <div className="deposit-split-grid">
                {/* SUB-PANEL: Raw Queue incoming pool */}
                <div className="deposit-panel-card">
                  <h4>Incoming Raw Logs ({Object.keys(rawTransactions).length})</h4>
                  <div className="table-responsive">
                    <table className="management-table">
                      <thead>
                        <tr>
                          <th>Log Entry Reference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(rawTransactions).length === 0 ? (
                          <tr><td style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '20px' }}>Transaction pool is empty.</td></tr>
                        ) : (
                          Object.entries(rawTransactions).map(([id, item]) => (
                            <tr key={id}>
                              <td style={{ wordBreak: 'break-word', color: '#b5b5be' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--accent)', display: 'block', marginBottom: '3px' }}>Node: {id}</span>
                                {item.message}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SUB-PANEL: Parsed and Extracted Deposit entries */}
                <div className="deposit-panel-card">
                  <h4>Structured Deposits ({Object.keys(parsedDeposits).length})</h4>
                  <div className="table-responsive">
                    <table className="management-table">
                      <thead>
                        <tr>
                          <th>TX ID</th>
                          <th>Sender</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(parsedDeposits).length === 0 ? (
                          <tr><td colSpan="4" style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '20px' }}>No parsed records found.</td></tr>
                        ) : (
                          Object.values(parsedDeposits).reverse().map((depo) => (
                            <tr key={depo.tx_id}>
                              <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{depo.tx_id}</td>
                              <td style={{ color: '#b5b5be' }}>{depo.sender}</td>
                              <td style={{ color: 'var(--accent)', fontWeight: '600' }}>{depo.amount?.toFixed(2)}</td>
                              <td>
                                <span className={`status-badge ${depo.status}`}>
                                  {depo.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {syncLogs.length > 0 && (
                <div className="log-box">
                  {syncLogs.map((log, index) => <div key={index}>{log}</div>)}
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