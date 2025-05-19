import React from 'react';

function CandidateSpendingCard({ candidate, supportAmount, opposeAmount, color }) {
  const totalAmount = supportAmount + opposeAmount;
  
  return (
    <div className="card h-100">
      <div className="card-header py-1" style={{ backgroundColor: color, color: 'white' }}>
        {candidate}
      </div>
      <div className="card-body p-2">
        <div className="d-flex flex-column">
          <div className="mb-1">
            <div className="d-flex justify-content-between align-items-center">
              <span className="text-muted small">Total:</span>
              <span className="fw-bold">${totalAmount.toLocaleString()}</span>
            </div>
          </div>
          <div className="mb-1">
            <div className="d-flex justify-content-between align-items-center">
              <span className="text-muted small">Support:</span>
              <span className="text-success fw-bold">${supportAmount.toLocaleString()}</span>
            </div>
          </div>
          <div>
            <div className="d-flex justify-content-between align-items-center">
              <span className="text-muted small">Oppose:</span>
              <span className="text-danger fw-bold">${opposeAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CandidateSpendingCard;