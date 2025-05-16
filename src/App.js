// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Pages
import ExpendituresDashboard from './pages/ExpendituresDashboard';
import ContributionsDashboard from './pages/ContributionsDashboard';
import BallotReturnsDashboard from './pages/BallotReturnsDashboard';

function App() {
  return (
    <Router>
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