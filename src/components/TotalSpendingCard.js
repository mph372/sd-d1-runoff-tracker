
// src/components/TotalSpendingCard.js
import React from 'react';

function TotalSpendingCard({ totalSpending }) {
  return (
    <div className="card h-100">
      <div className="card-body d-flex flex-column justify-content-center">
        <h5 className="card-title">Total Independent Expenditures</h5>
        <h2 className="card-text">${totalSpending.toLocaleString()}</h2>
      </div>
    </div>
  );
}

export default TotalSpendingCard;