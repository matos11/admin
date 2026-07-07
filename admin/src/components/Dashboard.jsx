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

  useEffect(() => {
    fetchLiveMetrics();
    const interval = setInterval(fetchLiveMetrics, 12000);
    return () => clearInterval(interval);
  }, []);

  const switchView = (viewKey, title) => {
    setCurrentView(viewKey);
    setViewTitle(title);
  };

  return (
    <div className="dashboard-root-wrapper">
      {/* Scope Global Styles Injector */}
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
        
        /* View Content Styling Rules */
        .view-pane { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); height: 100%; box-sizing: border-box; display: flex; flex-direction: column; }
        .view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .search-input { background: #070709; border: 1px solid var(--border); padding: 8px 14px; border-radius: 6px; color: #fff; width: 250px; }
        .management-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
        .management-table th { padding: 12px; border-bottom: 2px solid var(--border); color: var(--text-dim); font-weight: 600; }
        .management-table td { padding: 14px 12px; border-bottom: 1px solid var(--border); }
        .mono { font-family: monospace; color: var(--text-dim); }
        .bold { font-weight: 600; }
        .accent-text { color: var(--accent); font-weight: 700; }
        .dim-text { color: var(--text-dim); font-size: 12px; }
        .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .status-badge.pending { background: rgba(255, 188, 0, 0.15); color: var(--accent); }
        .status-badge.completed { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
        .status-badge.rejected { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
        .action-buttons { display: flex; gap: 6px; }
        .btn-approve, .btn-reject { padding: 6px 12px; border-radius: 4px; border: none; font-weight: 600; cursor: pointer; font-size: 12px; }
        .btn-approve { background: #4ade80; color: #000; }
        .btn-reject { background: #ef4444; color: #fff; }
        .filter-group { display: flex; gap: 6px; }
        .filter-btn { background: rgba(255,255,255,0.02); border: 1px solid var(--border); color: var(--text-dim); padding: 6px 12px; border-radius: 4px; cursor: pointer; }
        .filter-btn.active { background: var(--accent); color: #000; font-weight: 600; }
        .table-responsive { overflow-x: auto; flex-grow: 1; }
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

        {/* Render Selected View Directly (No sub-iframes needed) */}
        <div className="view-container">
          {currentView === 'broadcast' && <div className="view-pane"><h3>Broadcast Admin Content Placeholder</h3></div>}
          {currentView === 'players' && <PlayerDirectory />}
          {currentView === 'deposits' && <div className="view-pane"><h3>Deposit System Content Placeholder</h3></div>}
          {currentView === 'withdrawals' && <WithdrawalVault />}
        </div>
      </div>
    </div>
  );
}