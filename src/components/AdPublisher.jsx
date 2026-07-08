import React, { useState } from 'react';

const FIREBASE_BASE = 'https://ydm-bingo-realtime-default-rtdb.firebaseio.com/';

export default function AdPublisher({ adminUser }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublishAd = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      alert('Ad Title and Message are required.');
      return;
    }

    setIsPublishing(true);
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        image_url: imageUrl.trim() || null,
        cta_text: buttonText.trim() || null,
        cta_url: buttonUrl.trim() || null,
        publisher: adminUser,
        timestamp: Date.now(),
        status: 'active' // active, archived
      };

      await fetch(`${FIREBASE_BASE}ads.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      alert('Advertisement has been published successfully!');
      setTitle('');
      setMessage('');
      setImageUrl('');
      setButtonText('');
      setButtonUrl('');
    } catch (err) {
      console.error(err);
      alert('There was a network fault while publishing the ad.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="view-pane">
      <div className="view-header">
        <div>
          <h3>Client-Side Ad Publisher</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Create and manage advertisements to be displayed on client profile pages.
          </p>
        </div>
      </div>
      <form className="broadcast-form" onSubmit={handlePublishAd}>
        <div className="form-group">
          <label>Ad Title</label>
          <input type="text" className="text-input" placeholder="e.g., Special Weekend Bonus!" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isPublishing} required />
        </div>
        <div className="form-group">
          <label>Ad Message</label>
          <textarea className="textarea-input" placeholder="Describe the promotion or announcement..." value={message} onChange={(e) => setMessage(e.target.value)} disabled={isPublishing} required />
        </div>
        <div className="form-group">
          <label>Banner Image URL (Optional)</label>
          <input type="url" className="text-input" placeholder="https://example.com/ad-banner.png" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} disabled={isPublishing} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label>CTA Button Text (Optional)</label>
            <input type="text" className="text-input" placeholder="e.g., Claim Now" value={buttonText} onChange={(e) => setButtonText(e.target.value)} disabled={isPublishing} />
          </div>
          <div className="form-group">
            <label>CTA Button URL (Optional)</label>
            <input type="url" className="text-input" placeholder="https://t.me/YourBingoBot/app" value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} disabled={isPublishing} />
          </div>
        </div>
        <button type="submit" className="action-btn" disabled={isPublishing || !title.trim() || !message.trim()}>
          {isPublishing ? 'Publishing...' : '🚀 Publish Ad'}
        </button>
      </form>
    </div>
  );
}