import React, { useState } from 'react';

// Configuration constants matching your PHP variables
const BASE_FIREBASE = 'https://ydm-bingo-realtime-default-rtdb.firebaseio.com/';
const URL_TRANSACTIONS = `${BASE_FIREBASE}transactions.json`;
const URL_DEPOSITS = `${BASE_FIREBASE}deposits/`;

const SyncProcessor = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const processSync = async () => {
    setLoading(true);
    setResult(null);

    try {
      // 1. Fetch the raw unstructured notifications pool
      const response = await fetch(URL_TRANSACTIONS);
      if (!response.ok) throw new Error('Failed to fetch raw transactions');
      
      const rawTransactions = await response.json();

      if (!rawTransactions || typeof rawTransactions !== 'object') {
        setResult({ status: 'idle', message: 'No raw transaction entries to process.' });
        setLoading(false);
        return;
      }

      let processedCount = 0;

      // Iterate through the firebase database nodes
      for (const [firebasePushId, data] of Object.entries(rawTransactions)) {
        const messageText = data?.message || '';

        if (!messageText) continue; // Skip empty nodes

        // ======================================
        // EXTRACTION CORE (English & Amharic)
        // ======================================
        let txId = '';
        let amount = 0.00;
        let sender = 'Unknown Customer';

        // Extract 10-char structural Telebirr ID (e.g., DEJ85VI416)
        const idMatch = messageText.toUpperCase().match(/\b([A-Z0-9]{10})\b/);
        if (idMatch) {
          txId = idMatch[1];
        }

        // Extract dynamic numeric currency stream
        const amtMatchEng = messageText.match(/received\s+ETB\s*([\d,]+\.\d{2})/i);
        const amtMatchAmh = messageText.match(/([\d,]+\.\d{2})\s*ብር/u);

        if (amtMatchEng) {
          amount = parseFloat(amtMatchEng[1].replace(/,/g, ''));
        } else if (amtMatchAmh) {
          amount = parseFloat(amtMatchAmh[1].replace(/,/g, ''));
        }

        // Extract sender profiles
        const senderMatchEng = messageText.match(/from\s+([A-Za-z0-9\s\+\.\(\)]+?)(?=\s+\d)/i);
        const senderMatchAmh = messageText.match(/ወደ\s+([A-Za-z0-9\s\+\.\(\)]+?)(?=\s+\d)/u);

        if (senderMatchEng) {
          sender = senderMatchEng[1].trim();
        } else if (senderMatchAmh) {
          sender = senderMatchAmh[1].trim();
        }

        // If we can't extract a valid transaction ID, skip it or archive it safely
        if (!txId) continue;

        // 2. Format a clean record structure for the deposits node
        const depositPayload = {
          tx_id: txId,
          amount: amount,
          sender: sender,
          raw_text: messageText,
          status: 'unclaimed', // unclaimed, processed
          timestamp: data?.timestamp ? parseInt(data.timestamp, 10) : Date.now()
        };

        const targetDepositUrl = `${URL_DEPOSITS}${txId}.json`;

        // Check if it already exists in deposits to prevent rewriting status values
        const checkExistsRes = await fetch(targetDepositUrl);
        const exists = await checkExistsRes.json();

        if (!exists) {
          // Send PUT request to structure clean data under the target transaction ID node
          await fetch(targetDepositUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(depositPayload)
          });
        }

        // 3. Delete from raw incoming transactions node to clean up the queue
        const deleteUrl = `${BASE_FIREBASE}transactions/${firebasePushId}.json`;
        await fetch(deleteUrl, { method: 'DELETE' });

        processedCount++;
      }

      setResult({ status: 'success', processed_records: processedCount });
    } catch (error) {
      setResult({ status: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Telebirr Transaction Sync Processor</h2>
      <p>Processes raw text transaction logs into categorized deposits.</p>
      
      <button 
        onClick={processSync} 
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#ccc' : '#0070f3',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Processing Sync...' : 'Run Sync Queue'}
      </button>

      {result && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
          <h3>Results:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default SyncProcessor;