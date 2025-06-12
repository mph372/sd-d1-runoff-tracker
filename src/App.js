// src/App.js - Updated with header
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Pages
import ExpendituresDashboard from './pages/ExpendituresDashboard';
import ContributionsDashboard from './pages/ContributionsDashboard';
import BallotReturnsDashboard from './pages/BallotReturnsDashboard';

function App() {
  const basename = process.env.NODE_ENV === 'production' ? '/sd-d1-runoff-tracker' : '';
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Track window resize for responsive adjustments
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  return (
    <Router basename={basename}>
      <div className="App">
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
          <div className="container">
            <Link className="navbar-brand" to="/">SD D1 Runoff Tracker</Link>
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav">
                <li className="nav-item">
                  <Link className="nav-link" to="/">Expenditures</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/contributions">Contributions</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/ballot-returns">Ballot Returns</Link>
                </li>
              </ul>
            </div>
          </div>
        </nav>

        {/* Banner section */}
        <div className="container-fluid py-3 bg-light border-bottom">
          <div className="container text-center">
            <a 
              href="https://www.theballotbook.com?utm_source=sd_d1_tracker&utm_medium=referral&utm_campaign=runoff_2025" 
              target="_blank" 
              rel="noopener noreferrer"
              className="d-inline-block"
            >
              <img 
                src={`${process.env.PUBLIC_URL}/ballot_book${isMobile ? '_mobile' : ''}.png`}
                alt="The Ballot Book"
                className="img-fluid"
                style={{ 
                  maxHeight: isMobile ? '120px' : '100px',
                  height: 'auto'
                }}
              />
            </a>
          </div>
        </div>

        {/* Attribution header */}
        <div className="container mt-3 mb-4 pb-2 border-bottom small text-muted">
          <p className="mb-1">
            Created by <a href="mailto:mason@edgewater-strategies.com" className="text-primary">Mason Herron</a>. 
            Email with questions, feedback, or other inquiries.
          </p>
          <p className="mb-0">
            Follow <a href="https://x.com/mason_herron" className="text-primary" target="_blank" rel="noopener noreferrer">@mason_herron</a> or <a href="https://www.linkedin.com/in/masonherron/" className="text-primary" target="_blank" rel="noopener noreferrer">LinkedIn</a>.
          </p>
        </div>

        <div className="container mt-4">
          <Routes>
            <Route path="/" element={<ExpendituresDashboard />} />
            <Route path="/contributions" element={<ContributionsDashboard />} />
            <Route path="/ballot-returns" element={<BallotReturnsDashboard />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;