import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [originalImage, setOriginalImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [counts, setCounts] = useState({ cars: 0, plates: 0 });
  const [plateTexts, setPlateTexts] = useState([]);
  const [plateImages, setPlateImages] = useState([]);
  const [carBrands, setCarBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savedAnalyses, setSavedAnalyses] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('anpr_analyses');
    if (saved) {
      setSavedAnalyses(JSON.parse(saved));
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setOriginalImage(URL.createObjectURL(file));
      setProcessedImage(null);
      setCounts({ cars: 0, plates: 0 });
    }
  };

  const handleUpload = async () => {
    if (!originalImage) return;
    setLoading(true);
    const fileInput = document.querySelector('input[type="file"]');
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/detect', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Detection data:', data);
      setProcessedImage(`data:image/jpeg;base64,${data.image}`);
      setCounts({ cars: data.cars, plates: data.plates });
      setPlateTexts(data.plate_texts || []);
      setPlateImages(data.plate_images || []);
      setCarBrands(data.car_brands || []);

      // Auto-save analysis (without image to save storage)
      const analysisData = {
        timestamp: new Date().toISOString(),
        cars: data.cars,
        plates: data.plates,
        plateTexts: data.plate_texts || [],
        carBrands: data.car_brands || [],
      };
      const newAnalysis = { ...analysisData, id: Date.now(), processedImage: `data:image/jpeg;base64,${data.image}` };
      setSavedAnalyses(prev => {
        const updated = [...prev, newAnalysis].slice(-5); // Keep only last 5
        // Store without processedImage to avoid quota issues
        const stored = updated.map(a => ({ ...a, processedImage: undefined }));
        localStorage.setItem('anpr_analyses', JSON.stringify(stored));
        return updated;
      });
    } catch (error) {
      console.error('Error:', error);
      alert('Detection failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Automatic Number Plate Recognition (ANPR)</h1>
        <p>Upload an image to detect cars and license plates</p>
      </header>
      <main className="App-main">
        {savedAnalyses.length > 0 && (
          <div className="summary-section">
            <h2>Analysis Summary</h2>
            <div className="summary-stats">
              <div className="summary-item">
                <span className="summary-number">{savedAnalyses.length}</span>
                <span className="summary-label">Total Analyses</span>
              </div>
              <div className="summary-item">
                <span className="summary-number">{savedAnalyses.reduce((sum, a) => sum + a.cars, 0)}</span>
                <span className="summary-label">Total Cars Detected</span>
              </div>
              <div className="summary-item">
                <span className="summary-number">{savedAnalyses.reduce((sum, a) => sum + a.plates, 0)}</span>
                <span className="summary-label">Total Plates Detected</span>
              </div>
              <div className="summary-item">
                <span className="summary-number">{savedAnalyses.reduce((sum, a) => sum + a.plateTexts.length, 0)}</span>
                <span className="summary-label">Total Texts Recognized</span>
              </div>
            </div>
          </div>
        )}
        {savedAnalyses.length > 0 && (
          <div className="history-toggle">
            <button className="toggle-btn" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? 'Hide Analysis History' : 'Show Analysis History'}
            </button>
          </div>
        )}
        {showHistory && savedAnalyses.length > 0 && (
          <div className="history-section">
            <h2>Analysis History</h2>
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
        <div className="upload-section">
          <label htmlFor="file-input" className="file-label">
            Choose Image
          </label>
          <input id="file-input" type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          {originalImage && <span className="file-name">{document.querySelector('input[type="file"]')?.files[0]?.name}</span>}
          <button className="detect-btn" onClick={handleUpload} disabled={!originalImage || loading}>
            {loading ? 'Processing...' : 'Detect Vehicles & Plates'}
          </button>
        </div>
        <div className="results-section">
          {originalImage && !processedImage && (
            <div className="image-card">
              <h3>Original Image</h3>
              <img src={originalImage} alt="Original" className="result-image" />
            </div>
          )}
          {processedImage && (
            <div className="image-card">
              <h3>Processed Image</h3>
              <img src={processedImage} alt="Processed" className="result-image" />
            </div>
          )}
          {(counts.cars > 0 || counts.plates > 0) && (
            <div className="stats">
              <div className="stat-item">
                <span className="stat-number">{counts.cars}</span>
                <span className="stat-label">Vehicles Detected</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{counts.plates}</span>
                <span className="stat-label">Plates Detected</span>
              </div>
            </div>
          )}
          {carBrands.length > 0 && (
            <div className="texts-section">
              <h3>Detected Car Brands</h3>
              <ul className="text-list">
                {carBrands.map((brand, index) => (
                  <li key={index} className="text-item">{brand || 'Unknown'}</li>
                ))}
              </ul>
            </div>
          )}
          {plateTexts.length > 0 && (
            <div className="texts-section">
              <h3>Recognized Plate Texts</h3>
              <ul className="text-list">
                {plateTexts.map((text, index) => (
                  <li key={index} className="text-item" dir="rtl">{text || 'No text recognized'}</li>
                ))}
              </ul>
            </div>
          )}
          {plateImages.length > 0 && (
            <div className="plates-section">
              <h3>Detected Plates</h3>
              <div className="plate-list">
                {plateImages.map((img, index) => (
                  <div key={index} className="plate-card">
                    <img src={`data:image/jpeg;base64,${img}`} alt={`Plate ${index + 1}`} className="plate-image" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
