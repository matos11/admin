import React, { useState } from 'react';

const FIREBASE_ADMINS_URL = 'https://ydm-bingo-realtime-default-rtdb.firebaseio.com/admins.json';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(FIREBASE_ADMINS_URL);
      const adminsData = await response.json();

      if (adminsData) {
        // Firebase objects have keys like "admin1". We parse out the values.
        const adminsList = Object.values(adminsData);
        
        // Find if any entry matches your inputs: username: "admin" and password: "yourpassword123"
        const matchedAdmin = adminsList.find(
          (admin) => admin.username === username && admin.password === password
        );

        if (matchedAdmin) {
          // Send "SuperAdmin" back up to your application state
          onLoginSuccess(matchedAdmin.displayName || matchedAdmin.username);
        } else {
          setError('Invalid username or password.');
        }
      } else {
        setError('No administrator accounts found in the database.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to connect to Firebase. Check your internet or database rules.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      <style>{`
        .login-root {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          width: 100vw;
          background-color: #070709;
          font-family: sans-serif;
        }
        .login-card {
          background: #111115;
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 40px;
          border-radius: 12px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .login-card h2 {
          color: #fff;
          margin-bottom: 8px;
          font-size: 24px;
        }
        .login-card h2 span {
          color: #ffbc00;
        }
        .login-card p {
          color: #8a8a93;
          font-size: 14px;
          margin-bottom: 24px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          color: #e1e1e6;
          font-size: 13px;
          margin-bottom: 8px;
          font-weight: 500;
        }
        .form-group input {
          width: 100%;
          padding: 12px;
          background: #070709;
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 6px;
          color: #fff;
          box-sizing: border-box;
          font-size: 14px;
        }
        .form-group input:focus {
          border-color: #ffbc00;
          outline: none;
        }
        .login-btn {
          width: 100%;
          padding: 14px;
          background: #ffbc00;
          border: none;
          color: #000;
          font-weight: 700;
          font-size: 15px;
          border-radius: 6px;
          cursor: pointer;
          transition: opacity 0.2s;
          margin-top: 10px;
        }
        .login-btn:hover {
          opacity: 0.9;
        }
        .login-btn:disabled {
          background: #555;
          color: #888;
          cursor: not-allowed;
        }
        .error-banner {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          color: #ef4444;
          padding: 10px;
          border-radius: 6px;
          font-size: 13px;
          margin-bottom: 20px;
          text-align: center;
        }
      `}</style>

      <div className="login-card">
        <h2>YDM <span>BINGO</span></h2>
        <p>Management Hub Authentication</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Admin Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              placeholder="Enter username"
            />
          </div>

          <div className="form-group">
            <label>Security Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In To Hub'}
          </button>
        </form>
      </div>
    </div>
  );
}