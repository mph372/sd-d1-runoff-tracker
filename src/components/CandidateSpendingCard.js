// src/components/CandidateSpendingCard.js
import React from 'react';

function CandidateSpendingCard({ candidate, supportAmount, opposeAmount, color }) {
  const totalAmount = supportAmount + opposeAmount;
  
  return (
    <div className="card">
      <div className="card-header" style={{ backgroundColor: color, color: 'white' }}>
        {candidate}
      </div>
      <div className="card-body">
        <div className="row">
          <div className="col-md-4">
            <h6>Total</h6>
            <h4>${totalAmount.toLocaleString()}</h4>
          </div>
          <div className="col-md-4">
            <h6>Supporting</h6>
            <h4 className="text-success">${supportAmount.toLocaleString()}</h4>
          </div>
          <div className="col-md-4">
            <h6>Opposing</h6>
            <h4 className="text-danger">${opposeAmount.toLocaleString()}</h4>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CandidateSpendingCard;