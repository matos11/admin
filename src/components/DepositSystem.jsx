import React, { useState, useEffect } from 'react';

const FIREBASE_BASE = 'https://ydm-bingo-realtime-default-rtdb.firebaseio.com/';

export default function DepositSystem() {
  const [rawTransactions, setRawTransactions] = useState({});
  const [parsedDeposits, setParsedDeposits] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all'); // all, unclaimed, processed

  // Pull data streams from Firebase
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
      console.error('Error updating live database sync structures:', err);
    }
  };

  useEffect(() => {
    fetchDepositData();
    const interval = setInterval(fetchDepositData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  // Structural Core Regex Extraction Engine
  const runSmsSyncProcessor = async () => {
    const rawKeys = Object.keys(rawTransactions);
    if (rawKeys.length === 0) {
      alert('The incoming raw transaction queue is completely clean.');
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

        // 1. Extract 10-char structural Telebirr ID (e.g., DEJ85VI416)
        const idMatch = messageText.toUpperCase().match(/\b([A-Z0-9]{10})\b/);
        if (idMatch) txId = idMatch[1];

        // 2. Extract dynamic numeric currency stream (English & Amharic variations)
        const amtMatchEng = messageText.match(/received\s+ETB\s*([\d,]+\.\d{2})/i);
        const amtMatchAmh = messageText.match(/([\d,]+\.\d{2})\s*ብር/u);

        if (amtMatchEng) {
          amount = parseFloat(amtMatchEng[1].replace(/,/g, ''));
        } else if (amtMatchAmh) {
          amount = parseFloat(amtMatchAmh[1].replace(/,/g, ''));
        }

        // 3. Extract Sender Profile Identity data
        const senderMatchEng = messageText.match(/from\s+([A-Za-z0-9\s\+\.\(\)]+?)(?=\s+\d)/i);
        const senderMatchAmh = messageText.match(/ወደ\s+([A-Za-z0-9\s\+\.\(\)]+?)(?=\s+\d)/u);

        if (senderMatchEng) {
          sender = senderMatchEng[1].trim();
        } else if (senderMatchAmh) {
          sender = senderMatchAmh[1].trim();
        }

        // Integrity check: Skip or flag if structural transaction ID is missing
        if (!txId) {
          logs.push(`⚠️ Skipped node [${firebasePushId}]: Unrecognized transaction syntax.`);
          continue;
        }

        const targetDepositUrl = `${FIREBASE_BASE}deposits/${txId}.json`;
        
        // Safety verification: Check if deposit already exists to protect data mutations
        const checkRes = await fetch(targetDepositUrl);
        const exists = await checkRes.json();

        if (!exists) {
          const depositPayload = {
            tx_id: txId,
            amount: amount,
            sender: sender,
            raw_text: messageText,
            status: 'unclaimed', // unclaimed, processed
            timestamp: data?.timestamp ? parseInt(data.timestamp, 10) : Date.now()
          };

          // Save cleanly under deposits/TX_ID.json
          await fetch(targetDepositUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(depositPayload)
          });
        }

        // 4. Clean up queue by deleting raw source transaction record
        await fetch(`${FIREBASE_BASE}transactions/${firebasePushId}.json`, { method: 'DELETE' });
        logs.push(`✅ Successfully extracted structural node: ${txId} (ETB ${amount.toFixed(2)})`);
        processedCount++;
      }

      setSyncLogs(logs);
      alert(`Pipeline execution complete. Normalized and structuralized ${processedCount} records.`);
      await fetchDepositData();
    } catch (err) {
      console.error('Queue processing halted mid-execution:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // UI Filtering Logic for Structured Records
  const filteredDeposits = Object.values(parsedDeposits).filter((depo) => {
    if (filterStatus === 'all') return true;
    return depo.status === filterStatus;
  });

  return (
    <div className="view-pane">
      <style>{`
        .view-pane { background: #111115; border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); display: flex; flex-direction: column; height: 100%; box-sizing: border-box; }
        .view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .view-header h3 { margin: 0; font-size: 18px; color: #fff; }
        .view-header p { margin: 4px 0 0 0; font-size: 13px; color: #8a8a93; }
        .deposit-split-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 20px; flex-grow: 1; min-height: 0; }
        .deposit-panel-card { background: #13131a; border: 1px solid rgba(255,255,255,0.05); border-radius: 6px; padding: 16px; display: flex; flex-direction: column; min-height: 0; }
        .deposit-panel-card h4 { margin: 0 0 12px 0; color: #fff; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
        .action-btn { background: #ffbc00; color: #000; padding: 10px 18px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
        .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .management-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
        .management-table th { padding: 10px; border-bottom: 2px solid rgba(255,255,255,0.05); color: #8a8a93; font-weight: 600; }
        .management-table td { padding: 12px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: top; }
        .table-responsive { overflow-x: auto; overflow-y: auto; flex-grow: 1; }
        .status-badge { padding: 3px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .status-badge.unclaimed { background: rgba(255, 188, 0, 0.15); color: #ffbc00; }
        .status-badge.processed { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
        .filter-tabs { display: flex; gap: 4px; background: rgba(0,0,0,0.2); padding: 2px; border-radius: 4px; }
        .tab-btn { background: transparent; border: none; color: #8a8a93; padding: 4px 8px; font-size: 11px; border-radius: 3px; cursor: pointer; }
        .tab-btn.active { background: rgba(255,255,255,0.05); color: #fff; }
        .log-box { background: #070709; border: 1px solid rgba(255,255,255,0.05); border-radius: 6px; padding: 10px; font-family: monospace; font-size: 11px; color: #4ade80; height: 110px; overflow-y: auto; margin-top: 16px; }
      `}</style>

      <div className="view-header">
        <div>
          <h3>Deposit Extraction Terminal</h3>
          <p>Parse out structured telemetry metrics from unstructured gateway text sequences.</p>
        </div>
        <button 
          className="action-btn" 
          onClick={runSmsSyncProcessor} 
          disabled={isSyncing || Object.keys(rawTransactions).length === 0}
        >
          {isSyncing ? 'Processing Core...' : '⚡ Run SMS Extraction Pipeline'}
        </button>
      </div>

      <div className="deposit-split-grid">
        {/* LEFT COLUMN: Unstructured Incoming SMS Stream Queue */}
        <div className="deposit-panel-card">
          <h4>Incoming SMS Pool ({Object.keys(rawTransactions).length})</h4>
          <div className="table-responsive">
            <table className="management-table">
              <thead>
                <tr>
                  <th>Source Firebase Message Log</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(rawTransactions).length === 0 ? (
                  <tr>
                    <td style={{ color: '#8a8a93', textAlign: 'center', padding: '32px' }}>
                      Incoming transaction pool is empty.
                    </td>
                  </tr>
                ) : (
                  Object.entries(rawTransactions).map(([id, item]) => (
                    <tr key={id}>
                      <td style={{ wordBreak: 'break-word', color: '#e1e1e6', lineHeight: '1.4' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#ffbc00', display: 'block', marginBottom: '4px' }}>
                          Push Key: {id}
                        </span>
                        {item.message}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: Extracted Structured Target Database */}
        <div className="deposit-panel-card">
          <h4>
            <span>Structured Deposit Logs ({filteredDeposits.length})</span>
            <div className="filter-tabs">
              <button className={`tab-btn ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>All</button>
              <button className={`tab-btn ${filterStatus === 'unclaimed' ? 'active' : ''}`} onClick={() => setFilterStatus('unclaimed')}>Unclaimed</button>
              <button className={`tab-btn ${filterStatus === 'processed' ? 'active' : ''}`} onClick={() => setFilterStatus('processed')}>Processed</button>
            </div>
          </h4>
          <div className="table-responsive">
            <table className="management-table">
              <thead>
                <tr>
                  <th>TX ID</th>
                  <th>Sender Identity</th>
                  <th>Amount</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeposits.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ color: '#8a8a93', textAlign: 'center', padding: '32px' }}>
                      No matching parsed records found.
                    </td>
                  </tr>
                ) : (
                  filteredDeposits.reverse().map((depo) => (
                    <tr key={depo.tx_id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: '700', color: '#fff' }}>{depo.tx_id}</td>
                      <td style={{ color: '#8a8a93', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={depo.sender}>
                        {depo.sender}
                      </td>
                      <td style={{ color: '#ffbc00', fontWeight: '600' }}>ETB {depo.amount?.toFixed(2)}</td>
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

      {/* Real-time Processing Console Logs */}
      {syncLogs.length > 0 && (
        <div className="log-box">
          <div style={{ fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px', color: '#8a8a93' }}>Pipeline Output Log Traces:</div>
          {syncLogs.map((log, index) => <div key={index}>{log}</div>)}
        </div>
      )}
    </div>
  );
}