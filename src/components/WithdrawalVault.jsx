import React, { useState, useEffect } from 'react';

const FIREBASE_WITHDRAWALS_URL = 'https://ydm-bingo-realtime-default-rtdb.firebaseio.com/withdrawals.json';

export default function WithdrawalVault() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const response = await fetch(FIREBASE_WITHDRAWALS_URL);
      const data = await response.json();
      if (data) {
        const normalized = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        // Sort newest first
        setWithdrawals(normalized.reverse());
      }
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    if (!window.confirm(`Are you sure you want to mark this transaction as ${newStatus}?`)) return;
    
    try {
      // Direct Firebase patch request targeting the specific record key
      const response = await fetch(`https://ydm-bingo-realtime-default-rtdb.firebaseio.com/withdrawals/${id}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        alert(`Transaction successfully marked as ${newStatus}!`);
        fetchWithdrawals(); // Reload state context map
      }
    } catch (error) {
      alert("Failed to update status on Firebase.");
    }
  };

  const filteredWithdrawals = withdrawals.filter(w => 
    filterStatus === 'all' ? true : (w.status || 'pending') === filterStatus
  );

  return (
    <div className="view-pane">
      <div className="view-header">
        <h3>📤 Withdrawal Vault</h3>
        <div className="filter-group">
          <button className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>All</button>
          <button className={`filter-btn ${filterStatus === 'pending' ? 'active' : ''}`} onClick={() => setFilterStatus('pending')}>Pending</button>
          <button className={`filter-btn ${filterStatus === 'completed' ? 'active' : ''}`} onClick={() => setFilterStatus('completed')}>Completed</button>
        </div>
      </div>

      {loading ? (
        <div className="loader">Processing payout records...</div>
      ) : (
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th>Reference ID</th>
                <th>Player Phone/Account</th>
                <th>Amount requested</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWithdrawals.length > 0 ? (
                filteredWithdrawals.map((w) => (
                  <tr key={w.id}>
                    <td className="mono">{w.id.substring(0, 10)}</td>
                    <td>{w.accountNumber || w.phone || 'N/A'}</td>
                    <td className="bold">ETB {parseFloat(w.amount || 0).toFixed(2)}</td>
                    <td>
                      <span className={`status-badge ${w.status || 'pending'}`}>
                        {w.status || 'pending'}
                      </span>
                    </td>
                    <td>
                      {(w.status === 'pending' || !w.status) && (
                        <div className="action-buttons">
                          <button onClick={() => handleUpdateStatus(w.id, 'completed')} className="btn-approve">Approve</button>
                          <button onClick={() => handleUpdateStatus(w.id, 'rejected')} className="btn-reject">Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="center-text">No withdrawal entries found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}