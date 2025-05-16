// src/pages/ExpendituresDashboard.js
import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import TotalSpendingCard from '../components/TotalSpendingCard';
import CandidateSpendingCard from '../components/CandidateSpendingCard';

function ExpendituresDashboard() {
  const [data, setData] = useState([]);
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Function to load and parse the CSV
    const loadCSV = async () => {
      try {
        setLoading(true);
        
        // Fetch the CSV file
        const response = await fetch('/data/expenditures.csv');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch CSV file: ${response.status} ${response.statusText}`);
        }
        
        const csvText = await response.text();
        
        // Parse the CSV data
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            // Process the data
            const processedData = results.data.map(item => ({
              entity: item.Entity,
              date: item.Date,
              description: item.Description,
              amount: parseFloat(item.Amount.replace(/[^0-9.-]+/g, '')),  // Remove $ and commas
              candidate: item.Candidate,
              oppositionOrSupport: item['Oppose/Support']
            }));
            
            setData(processedData);
            
            // Extract unique entities
            const uniqueEntities = [...new Set(processedData.map(item => item.entity))];
            setEntities(uniqueEntities);
            
            setLoading(false);
          },
          error: (error) => {
            setError(`CSV parsing error: ${error.message}`);
            setLoading(false);
          }
        });
      } catch (err) {
        setError(`Error loading data: ${err.message}`);
        setLoading(false);
      }
    };
    
    loadCSV();
  }, []);
  
  // Filter data based on selected entity
  const filteredData = selectedEntity === 'All' 
    ? data 
    : data.filter(item => item.entity === selectedEntity);
  
  // Calculate total spending
  const totalSpending = filteredData.reduce((sum, item) => sum + item.amount, 0);
  
  // Calculate spending by candidate
  const candidateData = {
    'Paloma Aguirre': {
      support: filteredData
        .filter(item => item.candidate === 'Paloma Aguirre' && item.oppositionOrSupport === 'Support')
        .reduce((sum, item) => sum + item.amount, 0),
      oppose: filteredData
        .filter(item => item.candidate === 'Paloma Aguirre' && item.oppositionOrSupport === 'Oppose')
        .reduce((sum, item) => sum + item.amount, 0)
    },
    'John McCann': {
      support: filteredData
        .filter(item => item.candidate === 'John McCann' && item.oppositionOrSupport === 'Support')
        .reduce((sum, item) => sum + item.amount, 0),
      oppose: filteredData
        .filter(item => item.candidate === 'John McCann' && item.oppositionOrSupport === 'Oppose')
        .reduce((sum, item) => sum + item.amount, 0)
    }
  };
  
  // Data for charts
  const chartData = [
    {
      name: 'Paloma Aguirre',
      Support: candidateData['Paloma Aguirre'].support,
      Oppose: candidateData['Paloma Aguirre'].oppose
    },
    {
      name: 'John McCann',
      Support: candidateData['John McCann'].support,
      Oppose: candidateData['John McCann'].oppose
    }
  ];
  
  // Create data for entity spending chart
  const entitySpendingData = entities.map(entity => {
    const entityData = data.filter(item => item.entity === entity);
    const totalAmount = entityData.reduce((sum, item) => sum + item.amount, 0);
    
    return {
      name: entity,
      amount: totalAmount
    };
  }).sort((a, b) => b.amount - a.amount).slice(0, 10); // Sort by amount and get top 10
  
  // Party colors
  const partyColors = {
    'Paloma Aguirre': '#2E86C1', // Democratic blue
    'John McCann': '#C0392B'     // Republican red
  };
  
  if (loading) {
    return (
      <div className="text-center my-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading expenditure data...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="alert alert-danger my-5" role="alert">
        <h4>Error Loading Data</h4>
        <p>{error}</p>
      </div>
    );
  }
  
  return (
    <div>
      <h1>Independent Expenditures Dashboard</h1>
      <p>This dashboard shows independent expenditures for the San Diego District 1 Supervisor Runoff Election.</p>
      
      <div className="mb-3">
        <label htmlFor="entityFilter" className="form-label">Filter by Organization:</label>
        <select 
          id="entityFilter" 
          className="form-select" 
          value={selectedEntity} 
          onChange={(e) => setSelectedEntity(e.target.value)}
        >
          <option value="All">All Organizations</option>
          {entities.map(entity => (
            <option key={entity} value={entity}>{entity}</option>
          ))}
        </select>
      </div>
      
      <div className="row mb-4">
        <div className="col-md-4">
          <TotalSpendingCard totalSpending={totalSpending} />
        </div>
        <div className="col-md-4">
          <CandidateSpendingCard 
            candidate="Paloma Aguirre" 
            supportAmount={candidateData['Paloma Aguirre'].support} 
            opposeAmount={candidateData['Paloma Aguirre'].oppose}
            color={partyColors['Paloma Aguirre']}
          />
        </div>
        <div className="col-md-4">
          <CandidateSpendingCard 
            candidate="John McCann" 
            supportAmount={candidateData['John McCann'].support} 
            opposeAmount={candidateData['John McCann'].oppose}
            color={partyColors['John McCann']}
          />
        </div>
      </div>
      
      <div className="card mb-4">
        <div className="card-header">
          Expenditures by Candidate
        </div>
        <div className="card-body">
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="Support" fill="#28a745" />
                <Bar dataKey="Oppose" fill="#dc3545" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {selectedEntity === 'All' && (
        <div className="card mb-4">
          <div className="card-header">
            Top Spending Organizations
          </div>
          <div className="card-body">
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <BarChart 
                  data={entitySpendingData} 
                  layout="vertical"
                  margin={{ left: 150 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => `$${value.toLocaleString()}`} />
                  <YAxis type="category" dataKey="name" width={150} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Bar dataKey="amount" fill="#5BC0DE" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
      
      <div className="card">
        <div className="card-header">
          Itemized Expenditures
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Candidate</th>
                  <th>Support/Oppose</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, index) => (
                  <tr key={index}>
                    <td>{item.entity}</td>
                    <td>{item.date}</td>
                    <td>{item.description}</td>
                    <td>${item.amount.toLocaleString()}</td>
                    <td>{item.candidate}</td>
                    <td>
                      <span className={item.oppositionOrSupport === 'Support' ? 'text-success' : 'text-danger'}>
                        {item.oppositionOrSupport}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExpendituresDashboard;