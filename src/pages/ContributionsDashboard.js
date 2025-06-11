import React, { useState, useEffect } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
  // Add a state to track window width for responsive adjustments
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  const CONTRIBUTOR_CHART_COLOR = '#7373DB';

  // Effect to handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine if we're on mobile
  const isMobile = windowWidth < 768;

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
                let committee = normalizeCommitteeName(row['Filer_Nam L'] || '');                
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
  .map(item => normalizeCommitteeName(item.committee))
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
  
  // Normalize contributor names for consistency - simplified to avoid issues
  // Enhanced normalize contributor name function with better case-insensitive handling
const normalizeContributorName = (name) => {
  if (!name) return '';
  
  // Remove excess whitespace
  name = name.trim();
  
  // Handle specific duplicate cases with case-insensitive matching
  const upperName = name.toUpperCase();
  if (upperName.includes('THE LINCOLN CLUB OF SAN DIEGO COUNTY') || 
      upperName.includes('LINCOLN CLUB OF SAN DIEGO COUNTY, THE')) {
    return 'Lincoln Club of San Diego County';
  }
  
  // Convert to title case for consistency (this handles the general case)
  const titleCased = name.split(' ')
    .map(word => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
  
  return titleCased;
};

const normalizeCommitteeName = (name) => {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // strip punctuation
    .toUpperCase();          // consistent casing
};
  
  // Effect to filter data
  useEffect(() => {
    if (data.length === 0) return;
    
    let result = [...data];
    
    // Filter by committee if one is selected
if (selectedCommittee !== 'All') {
  result = result.filter(
    item => normalizeCommitteeName(item.committee) === selectedCommittee
  );
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
    // Normalize the contributor name
    let contributor = '';
    if (item.contributor) {
      contributor = normalizeContributorName(
        (item.contributor + ' ' + (item.contributorFirstName || '')).trim()
      );
    } else {
      // Skip empty contributors
      return;
    }
    
    if (contributor) {
      const currentAmount = contributorMap.get(contributor) || 0;
      contributorMap.set(contributor, currentAmount + item.amount);
    }
  });
  
  const topContributors = Array.from(contributorMap.entries())
    .map(([name, amount]) => ({ 
      name, 
      amount,
      // Add shortened name for mobile display
      shortName: shortenName(name)
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
  
  // Committees receiving funds - normalize committee names case-insensitively
  const committeeMap = new Map();
  dataArray.forEach(item => {
    if (item.committee) {
      // Use the normalized name as the key (case-insensitive)
const normalizedCommittee = normalizeCommitteeName(item.committee);
      const currentAmount = committeeMap.get(normalizedCommittee) || 0;
      committeeMap.set(normalizedCommittee, currentAmount + item.amount);
    }
  });
  
  const topCommittees = Array.from(committeeMap.entries())
    .map(([name, amount]) => ({ 
      name, 
      amount,
      // Add shortened name for mobile display
      shortName: shortenName(name)
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
  
  setStats({
    topContributors,
    topCommittees
  });
};
  
  // Function to shorten names for mobile display
  const shortenName = (name) => {
    if (!name) return '';
    if (name.length <= 20) return name;
    
    // Check for obvious abbreviations in parentheses
    const parenMatch = name.match(/\((.*?)\)/);
    if (parenMatch && parenMatch[1].length < 20) {
      return parenMatch[1];
    }
    
    // Otherwise, truncate
    return name.substring(0, 17) + '...';
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
      <h1 className="h3 mb-3">Campaign Contributions Dashboard</h1>
      <p className="mb-4">Showing campaign contributions for the San Diego District 1 Supervisor Runoff Election.</p>
      
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
                <option key={committee} value={committee}>
                  {isMobile ? shortenName(committee) : committee}
                </option>
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
          <div className="card-body p-0">
            {/* Mobile-specific chart content */}
            {isMobile && (
              <div className="table-responsive">
                <table className="table table-striped mb-0">
                  <thead>
                    <tr>
                      <th>Contributor</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topContributors.map((item, index) => (
                      <tr key={index}>
                        <td title={item.name}>{item.shortName}</td>
                        <td>${item.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Desktop chart content - Improved version */}
            {!isMobile && (
              <div style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={stats.topContributors}
                    layout="vertical"
                    margin={{ left: 200, right: 40, top: 20, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} />
                    <XAxis 
                      type="number" 
                      tickFormatter={(value) => `$${value.toLocaleString()}`} 
                      domain={[0, 'dataMax']}
                      padding={{ left: 10, right: 10 }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={190}
                      tick={{ 
                        textAnchor: 'end', 
                        fill: '#333',
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    />
                    <Tooltip 
                      formatter={(value) => `$${value.toLocaleString()}`} 
                      labelFormatter={(value) => value}
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '8px'
                      }}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill={CONTRIBUTOR_CHART_COLOR}
                      barSize={26}
                      radius={[0, 4, 4, 0]}
                    >
                      {stats.topContributors.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CONTRIBUTOR_CHART_COLOR} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
        
        <div className="card">
          <div className="card-header">
            Committees Receiving Contributions
          </div>
          <div className="card-body p-0">
            {/* Mobile-specific chart content */}
            {isMobile && (
              <div className="table-responsive">
                <table className="table table-striped mb-0">
                  <thead>
                    <tr>
                      <th>Committee</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topCommittees.map((item, index) => (
                      <tr key={index}>
                        <td title={item.name}>{item.shortName}</td>
                        <td>${item.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Desktop chart content - Also improved */}
            {!isMobile && (
              <div style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={stats.topCommittees}
                    layout="vertical"
                    margin={{ left: 200, right: 40, top: 20, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} />
                    <XAxis 
                      type="number" 
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                      domain={[0, 'dataMax']} 
                      padding={{ left: 10, right: 10 }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={190}
                      tick={{ 
                        textAnchor: 'end',
                        fill: '#333',
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    />
                    <Tooltip 
                      formatter={(value) => `$${value.toLocaleString()}`} 
                      labelFormatter={(value) => value}
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '8px'
                      }}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill="#82ca9d"
                      barSize={26}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <span>Itemized Contributions</span>
          <span className="badge bg-secondary">{filteredData.length} records</span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-striped mb-0">
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
                  {!isMobile && (
                    <th onClick={() => requestSort('committee')} className="sortable-header">
                      Receiving Committee
                      {sortConfig.key === 'committee' && (
                        <span className="ms-1">
                          {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                        </span>
                      )}
                    </th>
                  )}
                  <th onClick={() => requestSort('amount')} className="sortable-header">
                    Amount
                    {sortConfig.key === 'amount' && (
                      <span className="ms-1">
                        {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                  {!isMobile && (
                    <th onClick={() => requestSort('formType')} className="sortable-header">
                      Form
                      {sortConfig.key === 'formType' && (
                        <span className="ms-1">
                          {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                        </span>
                      )}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, index) => (
                  <tr key={index}>
                    <td>{item.date}</td>
                    <td title={formatContributorName(item.contributor, item.contributorFirstName)}>
                      {isMobile 
                        ? shortenName(formatContributorName(item.contributor, item.contributorFirstName))
                        : formatContributorName(item.contributor, item.contributorFirstName)
                      }
                    </td>
                    {!isMobile && <td>{item.committee}</td>}
                    <td>${item.amount.toLocaleString()}</td>
                    {!isMobile && <td>{item.formType}</td>}
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
        /* Add custom styles for mobile optimization */
        @media (max-width: 767.98px) {
          .card-header {
            padding: 0.5rem 0.75rem;
          }
          .table th, .table td {
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
          }
          h1 {
            font-size: 1.5rem;
          }
          p {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
}

export default ContributionsDashboard;