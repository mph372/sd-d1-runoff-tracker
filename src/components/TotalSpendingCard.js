// src/components/TotalSpendingCard.js
import React from 'react';

function TotalSpendingCard({ totalSpending }) {
  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">Total Independent Expenditures</h5>
        <h2 className="card-text">${totalSpending.toLocaleString()}</h2>
      </div>
    </div>
  );
}

export default TotalSpendingCard;