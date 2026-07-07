import React, { useState, useEffect } from 'react';// Single dot (.) means same folder // Added an extra '../' to jump out of components/ into src/ // Imports the database reference from your firebase.js configuration file
import { ref, push, onValue } from 'firebase/database';

export default function DepositSystem() {
  const [smsText, setSmsText] = useState('');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Helper Regular Expression String Parsers ---
  const extractAmount = (text) => {
    const match = text.match(/received\s+ETB\s*([0-9,.]+)/i);
    return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
  };

  const extractTxn = (text) => {
    const match = text.match(/transaction number\s+([A-Z0-9]+)/i);
    return match ? match[1] : "";
  };

  const extractName = (text) => {
    const match = text.match(/-\s([A-Za-z\s]+)\./);
    return match ? match[1].trim() : "";
  };

  const extractDate = (text) => {
    const match = text.match(/on\s+([0-9\-]+\s+[0-9:]+)/i);
    return match ? match[1] : "";
  };

  const extractBank = (text) => {
    const match = text.match(/from\s+(.+?)\s+to your telebirr/i);
    return match ? match[1] : "";
  };

  // --- Live Firebase Subscription Sync Listener ---
  useEffect(() => {
    const smsPaymentsRef = ref(db, 'sms_payments');
    
    const unsubscribe = onValue(smsPaymentsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setPayments([]);
        setLoading(false);
        return;
      }

      // Format from key-value map and arrange array to show newest entries first
      const parsedPayments = Object.entries(data).map(([id, p]) => {
        const rawText = typeof p === 'string' ? p : (p.smsText || "");
        return {
          id,
          smsText: rawText,
          amount: p.amount || extractAmount(rawText),
          transactionId: p.transactionId || extractTxn(rawText),
          fullName: p.fullName || extractName(rawText),
          bank: p.bank || extractBank(rawText),
          paymentDate: p.paymentDate || extractDate(rawText),
          status: p.status || "pending"
        };
      }).reverse();

      setPayments(parsedPayments);
      setLoading(false);
    }, (error) => {
      console.error("Firebase read error: ", error);
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup standard listener loop hooks safely on view unmounts
  }, []);

  // --- Manual Push Form Execution Entry Handle ---
  const handleSaveSMS = (e) => {
    e.preventDefault();
    if (!smsText.trim()) {
      alert("Please paste an SMS text entry string first.");
      return;
    }

    const targetRef = ref(db, 'sms_payments');
    const paymentData = {
      smsText: smsText,
      amount: extractAmount(smsText),
      transactionId: extractTxn(smsText),
      fullName: extractName(smsText),
      paymentDate: extractDate(smsText),
      bank: extractBank(smsText),
      verified: false,
      status: "pending",
      createdAt: Date.now()
    };

    push(targetRef, paymentData)
      .then(() => {
        alert("Payment Data Added Successfully.");
        setSmsText('');
      })
      .catch((err) => alert("Failed to save entry: " + err.message));
  };

  return (
    <div className="view-pane flex-container-layout">
      <style>{`
        .flex-container-layout { display: flex; flex-direction: column; height: 100%; }
        .input-box-wrapper { background: #1e293b; padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.05); }
        .input-box-wrapper textarea { width: 100%; height: 80px; padding: 12px; border: none; border-radius: 8px; background: #070709; color: white; font-size: 14px; box-sizing: border-box; resize: none; margin-top: 8px; }
        .input-box-wrapper textarea:focus { outline: 1px solid #ffbc00; }
        .save-btn { width: 100%; padding: 12px; border: none; border-radius: 8px; margin-top: 12px; background: #38bdf8; color: #000; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.2s; }
        .save-btn:hover { background: #ffbc00; }
        .payments-scroll-area { flex-grow: 1; overflow-y: auto; padding-right: 4px; display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
        .sms-card { background: #1e293b; border-radius: 12px; padding: 18px; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 4px 12px rgba(0,0,0,0.2); display: flex; flex-direction: column; gap: 10px; }
        .card-row { display: flex; flex-direction: column; font-size: 13px; }
        .card-lbl { color: var(--text-dim); font-weight: 500; margin-bottom: 2px; }
        .card-val { color: #fff; word-break: break-all; }
        .card-val.bold-text { font-weight: 700; font-size: 15px; }
        .card-val.sms-block { background: #070709; padding: 8px; border-radius: 6px; font-size: 12px; color: #a1a1aa; line-height: 1.4; max-height: 90px; overflow-y: auto; }
        .card-status { align-self: flex-start; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .card-status.pending { background: rgba(255,188,0,0.15); color: #ffbc00; }
        .card-status.completed { background: rgba(74,222,128,0.15); color: #4ade80; }
        .card-status.rejected { background: rgba(239,68,68,0.15); color: #ef4444; }
        .no-data { text-align: center; grid-column: 1 / -1; color: var(--text-dim); padding: 40px; font-size: 15px; }
      `}</style>

      {/* Manual Input Paste Engine Box Area */}
      <div className="input-box-wrapper">
        <h4 style={{ color: '#38bdf8', margin: 0 }}>Log incoming SMS stream</h4>
        <textarea 
          placeholder="Paste real-time webhook or macro mobile phone system alert raw text logs string here..."
          value={smsText}
          onChange={(e) => setSmsText(e.target.value)}
        />
        <button onClick={handleSaveSMS} className="save-btn">SAVE TRANSACTION DATA</button>
      </div>

      {/* Real-time Responsive Stream Grid Matrix List Layout view */}
      <div className="payments-scroll-area">
        {loading ? (
          <div className="no-data">Synchronizing real-time stream matrices...</div>
        ) : payments.length > 0 ? (
          payments.map((payment) => (
            <div className="sms-card" key={payment.id}>
              <div className="card-row">
                <span className="card-lbl">Amount</span>
                <span className="card-val bold-text" style={{ color: '#4ade80' }}>ETB {payment.amount.toFixed(2)}</span>
              </div>
              <div className="card-row">
                <span className="card-lbl">Transaction ID</span>
                <span className="card-val bold-text" style={{ fontFamily: 'monospace' }}>{payment.transactionId || 'UNKNOWN'}</span>
              </div>
              <div className="card-row">
                <span className="card-lbl">Sender Full Name</span>
                <span className="card-val">{payment.fullName || 'Unidentified source'}</span>
              </div>
              <div className="card-row">
                <span className="card-lbl">Bank / Source Routing</span>
                <span className="card-val" style={{ color: '#ffbc00' }}>{payment.bank || 'Direct Telebirr'}</span>
              </div>
              <div className="card-row">
                <span className="card-lbl">Payment timestamp</span>
                <span className="card-val" style={{ color: '#8a8a93' }}>{payment.paymentDate || 'No index parsed'}</span>
              </div>
              <div className="card-row">
                <span className="card-lbl">Processing Status</span>
                <span className={`card-status ${payment.status === 'completed' ? 'completed' : payment.status === 'rejected' ? 'rejected' : 'pending'}`}>
                  {payment.status}
                </span>
              </div>
              <div className="card-row">
                <span className="card-lbl">Raw SMS Payload Text Log</span>
                <span className="card-val sms-block">{payment.smsText}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="no-data">No recorded text payment histories detected in transaction parameters node.</div>
        )}
      </div>
    </div>
  );
}