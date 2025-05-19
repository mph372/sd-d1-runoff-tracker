import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';

function ContributionsDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'descending' // Default sort: newest to oldest
  });
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCommittee, setSelectedCommittee] = useState('All');
  const [committees, setCommittees] = useState([]);
  const [stats, setStats] = useState({
    topContributors: [],
    topCommittees: []
  });

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  useEffect(() => {
    const loadContributionData = async () => {
      try {
        setLoading(true);
        
        const csvPath = window.location.hostname === 'localhost' 
          ? `${process.env.PUBLIC_URL}/data/contributions.csv` 
          : `/sd-d1-runoff-tracker/data/contributions.csv`;
        
        const response = await fetch(csvPath);        
        
        if (!response.ok) {
          throw new Error(`Failed to fetch CSV file: ${response.status} ${response.statusText}`);
        }
        
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            const rawData = results.data;
            
            // Simplified data format
            // Filter out F497P2 transactions and map the remaining data
const processedData = rawData
  .filter(row => row.Form_Type !== 'F497P2')
  .map(row => {
    // Normalize committee name
    let committee = row['Filer_Nam L'] || '';
    
    // Combine Imperial Beach Locals committees
    if (row.Filer_ID === 1467372) {
        committee = 'IMPERIAL BEACH LOCALS AND SOUTH BAY LOCALS';
    }
    
    return {
        id: row.Tran_ID || '',
        date: formatDate(row.Tran_Date) || '',
        amount: parseFloat(row.Amount) || 0,
        formType: row.Form_Type || '',
        recType: row.Rec_Type || '',
        contributor: row['Entity_Nam L'] || '',
        contributorFirstName: row['Entity_Nam F'] || '',
        committee: committee,
    };
  });
            
            // Remove duplicates
            const uniqueData = removeDuplicateTransactions(processedData);
            console.log(`Removed ${processedData.length - uniqueData.length} duplicate transactions`);
            
            setData(uniqueData);
            
            // Extract unique committees
            const uniqueCommittees = [...new Set(uniqueData
              .map(item => item.committee)
              .filter(committee => committee && committee.trim() !== ''))]
              .sort();
            
            setCommittees(uniqueCommittees);
            
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
    
    loadContributionData();
  }, []);
  
  // Function to remove duplicate transactions
  const removeDuplicateTransactions = (dataArray) => {
    const uniqueMap = new Map();
    
    dataArray.forEach(item => {
      // Create a key based on date + contributor + amount
      const contributor = (item.contributor + ' ' + item.contributorFirstName).trim();
      const key = `${item.date}_${contributor}_${item.amount}`;
      
      if (!uniqueMap.has(key) || (!uniqueMap.get(key).id && item.id)) {
        uniqueMap.set(key, item);
      }
    });
    
    return Array.from(uniqueMap.values());
  };
  
  // Effect to filter data
  useEffect(() => {
    if (data.length === 0) return;
    
    let result = [...data];
    
    // Filter by committee if one is selected
    if (selectedCommittee !== 'All') {
      result = result.filter(item => item.committee === selectedCommittee);
    }
    
    // Filter by search term
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => {
        return (
          (item.committee && item.committee.toLowerCase().includes(term)) ||
          (item.contributor && item.contributor.toLowerCase().includes(term)) ||
          (item.contributorFirstName && item.contributorFirstName.toLowerCase().includes(term))
        );
      });
    }
    
    // Sort the filtered data
    result = getSortedData(result);
    
    setFilteredData(result);
    
    // Calculate stats
    calculateStats(result);
  }, [data, selectedCommittee, searchTerm, sortConfig]);
  
  // Function to handle sorting
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  // Sort function
  const getSortedData = (items) => {
    const sortableItems = [...items];
    
    sortableItems.sort((a, b) => {
      // Date sorting requires special handling
      if (sortConfig.key === 'date') {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        if (sortConfig.direction === 'ascending') {
          return dateA - dateB;
        }
        return dateB - dateA;
      }
      
      // Handle amount sorting
      if (sortConfig.key === 'amount') {
        if (sortConfig.direction === 'ascending') {
          return a.amount - b.amount;
        }
        return b.amount - a.amount;
      }
      
      // Default string sorting for other fields
      const valA = a[sortConfig.key] || '';
      const valB = b[sortConfig.key] || '';
      
      if (valA < valB) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (valA > valB) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
    
    return sortableItems;
  };
  
  // Calculate summary statistics
  const calculateStats = (dataArray) => {
    // Top contributors
    const contributorMap = new Map();
    dataArray.forEach(item => {
      const contributor = (item.contributor + ' ' + item.contributorFirstName).trim();
      if (contributor) {
        const currentAmount = contributorMap.get(contributor) || 0;
        contributorMap.set(contributor, currentAmount + item.amount);
      }
    });
    
    const topContributors = Array.from(contributorMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
    
    // Committees receiving funds
    const committeeMap = new Map();
    dataArray.forEach(item => {
      if (item.committee) {
        const currentAmount = committeeMap.get(item.committee) || 0;
        committeeMap.set(item.committee, currentAmount + item.amount);
      }
    });
    
    const topCommittees = Array.from(committeeMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
    
    setStats({
      topContributors,
      topCommittees
    });
  };
  
  // Format date function
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    
    // Try parsing the date
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };
  
  // Format contributor name
  const formatContributorName = (contributor, firstName) => {
    if (!contributor) return '';
    if (firstName) return `${firstName} ${contributor}`;
    return contributor;
  };
  
  if (loading) {
    return (
      <div className="text-center my-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading contribution data...</p>
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
  
  if (data.length === 0) {
    return (
      <div className="alert alert-info my-5" role="alert">
        <h4>No Contribution Data Available</h4>
        <p>Make sure the data processing script has been run to generate the contributions.csv file.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Campaign Contributions Dashboard</h1>
      <p>This dashboard shows campaign contributions for the San Diego District 1 Supervisor Runoff Election.</p>
      
      <div className="row mb-4">
        <div className="col-md-8">
          <div className="mb-3">
            <label htmlFor="committeeFilter" className="form-label">Filter by Committee:</label>
            <select 
              id="committeeFilter" 
              className="form-select" 
              value={selectedCommittee} 
              onChange={(e) => setSelectedCommittee(e.target.value)}
            >
              <option value="All">All Committees</option>
              {committees.map(committee => (
                <option key={committee} value={committee}>{committee}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="col-md-4">
          <div className="mb-3">
            <label htmlFor="searchTerm" className="form-label">Search:</label>
            <input
              id="searchTerm"
              type="text"
              className="form-control"
              placeholder="Search contributors or committees"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <div className="mb-4">
  <div className="card mb-4">
    <div className="card-header">
      Top Contributors
    </div>
    <div className="card-body">
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <BarChart
            data={stats.topContributors}
            layout="vertical"
            margin={{ left: 300, right: 30, top: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(value) => `$${value.toLocaleString()}`} />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={300}
              tick={{ textAnchor: 'end' }}
            />
            <Tooltip 
              formatter={(value) => `$${value.toLocaleString()}`} 
              labelFormatter={(value) => value}
            />
            <Bar dataKey="amount" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
  
  <div className="card">
    <div className="card-header">
      Committees Receiving Contributions
    </div>
    <div className="card-body">
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <BarChart
            data={stats.topCommittees}
            layout="vertical"
            margin={{ left: 300, right: 30, top: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(value) => `$${value.toLocaleString()}`} />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={300}
              tick={{ textAnchor: 'end' }}
            />
            <Tooltip 
              formatter={(value) => `$${value.toLocaleString()}`} 
              labelFormatter={(value) => value}
            />
            <Bar dataKey="amount" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
</div>
      
      <div className="card">
        <div className="card-header">
          Itemized Contributions ({filteredData.length} records)
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th onClick={() => requestSort('date')} className="sortable-header">
                    Date
                    {sortConfig.key === 'date' && (
                      <span className="ms-1">
                        {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                  <th onClick={() => requestSort('contributor')} className="sortable-header">
                    Contributor
                    {sortConfig.key === 'contributor' && (
                      <span className="ms-1">
                        {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                  <th onClick={() => requestSort('committee')} className="sortable-header">
                    Receiving Committee
                    {sortConfig.key === 'committee' && (
                      <span className="ms-1">
                        {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                  <th onClick={() => requestSort('amount')} className="sortable-header">
                    Amount
                    {sortConfig.key === 'amount' && (
                      <span className="ms-1">
                        {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                  <th onClick={() => requestSort('formType')} className="sortable-header">
                    Form
                    {sortConfig.key === 'formType' && (
                      <span className="ms-1">
                        {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, index) => (
                  <tr key={index}>
                    <td>{item.date}</td>
                    <td>{formatContributorName(item.contributor, item.contributorFirstName)}</td>
                    <td>{item.committee}</td>
                    <td>${item.amount.toLocaleString()}</td>
                    <td>{item.formType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .sortable-header {
          cursor: pointer;
          user-select: none;
        }
        .sortable-header:hover {
          background-color: #f8f9fa;
        }
      `}</style>
    </div>
  );
}

export default ContributionsDashboard;