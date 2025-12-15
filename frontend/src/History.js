import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './App.css';

function History() {
  const [savedAnalyses, setSavedAnalyses] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('anpr_analyses');
    if (saved) {
      setSavedAnalyses(JSON.parse(saved));
    }
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Analysis History</h1>
        <p>View all past detections</p>
        <Link to="/" className="nav-link">Back to Detection</Link>
      </header>
      <main className="App-main">
        {savedAnalyses.length === 0 ? (
          <div className="no-history">
            <p>No analyses saved yet.</p>
            <Link to="/" className="nav-link">Go to Detection</Link>
          </div>
        ) : (
          <div className="history-section">
            <div className="history-list">
              {savedAnalyses.slice().reverse().map(analysis => (
                <div key={analysis.id} className="history-item">
                  <div className="history-image">
                    <img src={analysis.processedImage} alt="Processed" />
                  </div>
                  <div className="history-details">
                    <p><strong>Date:</strong> {new Date(analysis.timestamp).toLocaleString()}</p>
                    <p><strong>Cars:</strong> {analysis.cars}</p>
                    <p><strong>Brands:</strong> {analysis.carBrands ? analysis.carBrands.join(', ') : 'N/A'}</p>
                    <p><strong>Plates:</strong> {analysis.plates}</p>
                    <p><strong>Texts:</strong> {analysis.plateTexts.join(', ') || 'None'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default History;