import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

function PartyMoneyCard() {
  const [demData, setDemData] = useState([]);
  const [repData, setRepData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('2025-04-09'); // Default: after primary election (4/8)
  const [expanded, setExpanded] = useState(false);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Note: Since the files are .xls, they would need to be converted to CSV first
        // For now, I'll assume they've been converted to CSV format
        const demPath = window.location.hostname === 'localhost' 
          ? `${process.env.PUBLIC_URL}/data/party_money/dem_party.csv`
          : `/sd-d1-runoff-tracker/data/party_money/dem_party.csv`;
          
        const repPath = window.location.hostname === 'localhost'
          ? `${process.env.PUBLIC_URL}/data/party_money/republican_party.csv`
          : `/sd-d1-runoff-tracker/data/party_money/republican_party.csv`;
        
        const [demResponse, repResponse] = await Promise.all([
          fetch(demPath),
          fetch(repPath)
        ]);
        
        if (!demResponse.ok || !repResponse.ok) {
          throw new Error('Failed to fetch party money data files');
        }
        
        const demText = await demResponse.text();
        const repText = await repResponse.text();
        
        // Parse Democratic party data
        Papa.parse(demText, {
          header: true,
          complete: (results) => {
            const processedData = results.data
              .filter(row => row['NAME OF CONTRIBUTOR'] && row['TRANS. DATE'])
              .map(row => ({
                recipient: row['NAME OF CONTRIBUTOR'],
                amount: parseFloat(row['AMOUNT'].replace(/[^0-9.-]+/g, '')),
                date: row['TRANS. DATE'],
                transactionType: row['TRANSACTION TYPE']
              }))
              .filter(row => 
                row.recipient === 'PALOMA AGUIRRE FOR SUPERVISOR 2025' &&
                new Date(row.date) > new Date('2025-04-08') &&
                new Date(row.date) >= new Date(startDate)
              );
            setDemData(processedData);
          }
        });
        
        // Parse Republican party data
        Papa.parse(repText, {
          header: true,
          complete: (results) => {
            const processedData = results.data
              .filter(row => row['NAME OF CONTRIBUTOR'] && row['TRANS. DATE'])
              .map(row => ({
                recipient: row['NAME OF CONTRIBUTOR'],
                amount: parseFloat(row['AMOUNT'].replace(/[^0-9.-]+/g, '')),
                date: row['TRANS. DATE'],
                transactionType: row['TRANSACTION TYPE']
              }))
              .filter(row => 
                (row.recipient === 'MCCANN FOR SUPERVISOR 2025' || row.recipient === 'MCCANN FOR SUPERVISOR') &&
                new Date(row.date) > new Date('2025-04-08') &&
                new Date(row.date) >= new Date(startDate)
              );
            setRepData(processedData);
          }
        });
        
        setLoading(false);
      } catch (err) {
        setError(`Error loading party money data: ${err.message}`);
        setLoading(false);
      }
    };
    
    loadData();
  }, [startDate]);
  
  // Calculate totals
  const demTotal = demData.reduce((sum, item) => sum + item.amount, 0);
  const repTotal = repData.reduce((sum, item) => sum + item.amount, 0);
  
  if (loading) {
    return (
      <div className="card mb-3">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <span>Party Money</span>
            <div className="spinner-border spinner-border-sm" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="card mb-3">
        <div className="card-header">
          Party Money
        </div>
        <div className="card-body">
          <div className="alert alert-warning mb-0">
            <small>Party money data not yet available. Please convert .xls files to .csv format.</small>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="card mb-3">
      <div className="card-header">
        <div className="d-flex justify-content-between align-items-center">
          <span>Party Money</span>
          <div className="d-flex align-items-center">
            <label htmlFor="startDate" className="form-label me-2 mb-0 small">Since:</label>
            <input
              type="date"
              id="startDate"
              className="form-control form-control-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '140px' }}
              min="2025-04-09"
            />
          </div>
        </div>
      </div>
      <div className="card-body">
        <div className="row">
          <div className="col-md-6">
            <div className="text-center p-3 border rounded">
              <h5 className="text-primary mb-2">Paloma Aguirre</h5>
              <h4 className="mb-1">${demTotal.toLocaleString()}</h4>
              <small className="text-muted">from San Diego County Democratic Party</small>
              <div className="mt-2">
                <small className="text-muted">{demData.length} contribution{demData.length !== 1 ? 's' : ''}</small>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="text-center p-3 border rounded">
              <h5 className="text-danger mb-2">John McCann</h5>
              <h4 className="mb-1">${repTotal.toLocaleString()}</h4>
              <small className="text-muted">from Republican Party of San Diego County</small>
              <div className="mt-2">
                <small className="text-muted">{repData.length} contribution{repData.length !== 1 ? 's' : ''}</small>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 d-flex justify-content-between align-items-center">
          <small className="text-muted">
            Shows party contributions after the primary election (4/8/2025) since {new Date(startDate).toLocaleDateString()}.
          </small>
          <button 
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
        
        {expanded && (
          <div className="mt-3">
            <div className="row">
              {demData.length > 0 && (
                <div className="col-md-6">
                  <h6 className="text-primary">Paloma Aguirre Contributions</h6>
                  <div className="table-responsive">
                    <table className="table table-sm table-striped">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {demData
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .map((item, index) => (
                          <tr key={index}>
                            <td>{new Date(item.date).toLocaleDateString()}</td>
                            <td>${item.amount.toLocaleString()}</td>
                            <td className="small">{item.transactionType}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {repData.length > 0 && (
                <div className="col-md-6">
                  <h6 className="text-danger">John McCann Contributions</h6>
                  <div className="table-responsive">
                    <table className="table table-sm table-striped">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {repData
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .map((item, index) => (
                          <tr key={index}>
                            <td>{new Date(item.date).toLocaleDateString()}</td>
                            <td>${item.amount.toLocaleString()}</td>
                            <td className="small">{item.transactionType}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            {demData.length === 0 && repData.length === 0 && (
              <div className="text-center text-muted py-3">
                No contributions found for the selected date range.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PartyMoneyCard; 