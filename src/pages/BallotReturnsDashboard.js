// src/pages/BallotReturnsDashboard.js
import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function BallotReturnsDashboard() {
  const [runoffData, setRunoffData] = useState([]);
  const [primaryData, setPrimaryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // Track window resize for responsive design
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const isMobile = windowWidth < 768;
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load runoff data
        const runoffPath = window.location.hostname === 'localhost' 
          ? `${process.env.PUBLIC_URL}/data/ballot_returns/master_returns.csv`
          : `/sd-d1-runoff-tracker/data/ballot_returns/master_returns.csv`;
          
        const primaryPath = window.location.hostname === 'localhost'
          ? `${process.env.PUBLIC_URL}/data/ballot_returns/primary_returns.csv`
          : `/sd-d1-runoff-tracker/data/ballot_returns/primary_returns.csv`;
        
        const [runoffResponse, primaryResponse] = await Promise.all([
          fetch(runoffPath),
          fetch(primaryPath)
        ]);
        
        if (!runoffResponse.ok || !primaryResponse.ok) {
          throw new Error('Failed to fetch data files');
        }
        
        const runoffText = await runoffResponse.text();
        const primaryText = await primaryResponse.text();
        
        // Parse CSV data
        Papa.parse(runoffText, {
          header: true,
          complete: (results) => {
            const processedData = results.data.map(row => ({
              date: row.Description,
              total: parseInt(row.Total.replace(/,/g, '')),
              dem: parseInt(row.Dem.replace(/,/g, '')),
              rep: parseInt(row.Rep.replace(/,/g, '')),
              other: parseInt(row['Other (Not DEM or REP)'].replace(/,/g, ''))
            }));
            setRunoffData(processedData);
          }
        });
        
        Papa.parse(primaryText, {
          header: true,
          complete: (results) => {
            const processedData = results.data.map(row => ({
              date: row.Description,
              total: parseInt(row.Total.replace(/,/g, '')),
              dem: parseInt(row.Dem.replace(/,/g, '')),
              rep: parseInt(row.Rep.replace(/,/g, '')),
              other: parseInt(row['Other (Not DEM or REP)'].replace(/,/g, ''))
            }));
            setPrimaryData(processedData);
          }
        });
        
        setLoading(false);
      } catch (err) {
        setError(`Error loading data: ${err.message}`);
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Calculate current statistics
  const getCurrentStats = () => {
    if (runoffData.length < 2) return null;
    
    const latest = runoffData[runoffData.length - 1];
    const registration = runoffData[0];
    
    const totalReturned = latest.total;
    const totalRegistered = registration.total;
    const turnoutRate = (totalReturned / totalRegistered * 100).toFixed(1);
    
    const demPercent = (latest.dem / totalReturned * 100).toFixed(1);
    const repPercent = (latest.rep / totalReturned * 100).toFixed(1);
    const otherPercent = (latest.other / totalReturned * 100).toFixed(1);
    
    return {
      totalReturned,
      totalRegistered,
      turnoutRate,
      demPercent,
      repPercent,
      otherPercent
    };
  };
  
  // Calculate batch changes
  const getBatchChanges = () => {
    if (runoffData.length < 3) return []; // Need at least registration + 2 data points
    
    const changes = [];
    // Start from index 2 (second data point) since index 0 is registration and index 1 is first batch
    for (let i = 2; i < runoffData.length; i++) {
      const current = runoffData[i];
      const previous = runoffData[i - 1];
      
      const totalChange = current.total - previous.total;
      const demChange = current.dem - previous.dem;
      const repChange = current.rep - previous.rep;
      const otherChange = current.other - previous.other;
      
      const demPercent = totalChange > 0 ? (demChange / totalChange * 100).toFixed(1) : '-';
      const repPercent = totalChange > 0 ? (repChange / totalChange * 100).toFixed(1) : '-';
      const otherPercent = totalChange > 0 ? (otherChange / totalChange * 100).toFixed(1) : '-';
      
      changes.push({
        date: current.date,
        totalChange,
        demPercent,
        repPercent,
        otherPercent
      });
    }
    
    // Also add the first batch (compared to zero)
    if (runoffData.length >= 2) {
      const firstBatch = runoffData[1]; // First actual data point (not registration)
      changes.unshift({
        date: firstBatch.date,
        totalChange: firstBatch.total,
        demPercent: (firstBatch.dem / firstBatch.total * 100).toFixed(1),
        repPercent: (firstBatch.rep / firstBatch.total * 100).toFixed(1),
        otherPercent: (firstBatch.other / firstBatch.total * 100).toFixed(1)
      });
    }
    
    return changes;
  };
  
  // Prepare data for comparison charts
  const getComparisonData = () => {
    if (runoffData.length < 2 || primaryData.length < 2) return null;
    
    const runoffRegistration = runoffData[0];
    const primaryRegistration = primaryData[0];
    
    // Calculate days from election for primary
    const primaryElectionDate = new Date('2025-04-08');
    const primaryDataWithDays = primaryData.slice(1).map(d => {
      const date = new Date(d.date);
      const daysFromElection = Math.ceil((primaryElectionDate - date) / (1000 * 60 * 60 * 24));
      return {
        daysFromElection,
        'Turnout %': parseFloat((d.total / primaryRegistration.total * 100).toFixed(1)),
        'Dem %': parseFloat((d.dem / d.total * 100).toFixed(1)),
        'Rep %': parseFloat((d.rep / d.total * 100).toFixed(1)),
        'Other %': parseFloat((d.other / d.total * 100).toFixed(1))
      };
    });
    
    // Calculate days from election for runoff
    const runoffElectionDate = new Date('2025-07-01');
    const runoffDataWithDays = runoffData.slice(1).map(d => {
      const date = new Date(d.date);
      const daysFromElection = Math.ceil((runoffElectionDate - date) / (1000 * 60 * 60 * 24));
      return {
        daysFromElection,
        'Turnout %': parseFloat((d.total / runoffRegistration.total * 100).toFixed(1)),
        'Dem %': parseFloat((d.dem / d.total * 100).toFixed(1)),
        'Rep %': parseFloat((d.rep / d.total * 100).toFixed(1)),
        'Other %': parseFloat((d.other / d.total * 100).toFixed(1))
      };
    });
    
    // Get the range of days we need to show
    const maxDays = Math.max(
      ...primaryDataWithDays.map(d => d.daysFromElection),
      ...runoffDataWithDays.map(d => d.daysFromElection)
    );
    const minDays = Math.min(
      ...primaryDataWithDays.map(d => d.daysFromElection),
      ...runoffDataWithDays.map(d => d.daysFromElection)
    );
    
    // Create arrays with all days in the range
    const allDays = Array.from({ length: maxDays - minDays + 1 }, (_, i) => maxDays - i);
    
    // Create complete datasets with null values for missing days
    const primaryChartData = allDays.map(days => {
      const existingData = primaryDataWithDays.find(d => d.daysFromElection === days);
      return {
        label: `${days} days out`,
        daysFromElection: days,
        'Turnout %': existingData ? existingData['Turnout %'] : null,
        'Dem %': existingData ? existingData['Dem %'] : null,
        'Rep %': existingData ? existingData['Rep %'] : null,
        'Other %': existingData ? existingData['Other %'] : null
      };
    });
    
    const runoffChartData = allDays.map(days => {
      const existingData = runoffDataWithDays.find(d => d.daysFromElection === days);
      return {
        label: `${days} days out`,
        daysFromElection: days,
        'Turnout %': existingData ? existingData['Turnout %'] : null,
        'Dem %': existingData ? existingData['Dem %'] : null,
        'Rep %': existingData ? existingData['Rep %'] : null,
        'Other %': existingData ? existingData['Other %'] : null
      };
    });
    
    return {
      primary: primaryChartData,
      runoff: runoffChartData
    };
  };
  
  if (loading) {
    return (
      <div className="text-center my-3">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading ballot return data...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="alert alert-danger my-3" role="alert">
        <h4>Error Loading Data</h4>
        <p>{error}</p>
      </div>
    );
  }
  
  const currentStats = getCurrentStats();
  const batchChanges = getBatchChanges();
  const comparisonData = getComparisonData();
  
  const COLORS = ['#2E86C1', '#C0392B', '#7F8C8D'];
  
  return (
    <div>
      <h1 className={isMobile ? "h3 mb-2" : "h2 mb-3"}>Ballot Returns Dashboard</h1>
      <p className={isMobile ? "small mb-3" : "mb-3"}>Showing ballot return statistics for the San Diego District 1 Supervisor Runoff Election.</p>
      
      {/* Current Statistics */}
      <div className="alert alert-info mb-3">
        <h6 className="mb-2"><strong>Current Snapshot</strong></h6>
        <p className="mb-0 small">
          These numbers show the latest available data on ballot returns. Turnout percentage is calculated as returned ballots divided by total registered voters. 
          Party breakdown shows what percentage of returned ballots came from voters registered with each party.
        </p>
      </div>
      
      {currentStats && (
        <div className="card mb-4">
          <div className="card-header">
            Current Snapshot
          </div>
          <div className="card-body">
            {/* Turnout Summary */}
            <div className="row mb-4">
              <div className="col-12">
                <div className="text-center p-3 bg-light rounded">
                  <h2 className="mb-2 text-primary">{currentStats.turnoutRate}% Turnout</h2>
                  <p className="mb-0 text-muted">
                    {currentStats.totalReturned.toLocaleString()} ballots returned out of {currentStats.totalRegistered.toLocaleString()} registered voters
                  </p>
                </div>
              </div>
            </div>
            
            {/* Party Breakdown */}
            <div className="row">
              <div className={isMobile ? "col-12 mb-3" : "col-md-8 mb-3"}>
                <h5 className="mb-3">Party Breakdown</h5>
                <div style={{ width: '100%', height: isMobile ? 300 : 350 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Democrat', value: parseFloat(currentStats.demPercent) },
                          { name: 'Republican', value: parseFloat(currentStats.repPercent) },
                          { name: 'Other', value: parseFloat(currentStats.otherPercent) }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}\n${(percent * 100).toFixed(1)}%`}
                        outerRadius={isMobile ? 100 : 120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className={isMobile ? "col-12" : "col-md-4"}>
                <h5 className="mb-3">Details</h5>
                <div className="list-group list-group-flush">
                  <div className="list-group-item d-flex justify-content-between align-items-center px-0">
                    <div>
                      <span className="text-primary fw-bold">Democrat</span>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold">{currentStats.demPercent}%</div>
                      <small className="text-muted">{Math.round(currentStats.totalReturned * parseFloat(currentStats.demPercent) / 100).toLocaleString()} ballots</small>
                    </div>
                  </div>
                  <div className="list-group-item d-flex justify-content-between align-items-center px-0">
                    <div>
                      <span className="text-danger fw-bold">Republican</span>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold">{currentStats.repPercent}%</div>
                      <small className="text-muted">{Math.round(currentStats.totalReturned * parseFloat(currentStats.repPercent) / 100).toLocaleString()} ballots</small>
                    </div>
                  </div>
                  <div className="list-group-item d-flex justify-content-between align-items-center px-0">
                    <div>
                      <span className="text-secondary fw-bold">Other</span>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold">{currentStats.otherPercent}%</div>
                      <small className="text-muted">{Math.round(currentStats.totalReturned * parseFloat(currentStats.otherPercent) / 100).toLocaleString()} ballots</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Batch Changes */}
      <div className="alert alert-info mb-3">
        <h6 className="mb-2"><strong>Batch-to-Batch Changes</strong></h6>
        <p className="mb-0 small">
          This shows the composition of each new batch of returned ballots. For example, if 1,000 new ballots were returned in a batch and 450 came from Democratic voters, 
          that batch would show 45% Democratic. This helps identify trends - are certain parties returning ballots faster or slower over time?
        </p>
      </div>
      
      {batchChanges.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            Recent Batch Changes
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-striped mb-0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Total Change</th>
                    <th>Dem %</th>
                    <th>Rep %</th>
                    <th>Other %</th>
                  </tr>
                </thead>
                <tbody>
                  {batchChanges.map((change, index) => (
                    <tr key={index}>
                      <td>{change.date}</td>
                      <td>+{change.totalChange.toLocaleString()}</td>
                      <td className="text-primary">{change.demPercent}%</td>
                      <td className="text-danger">{change.repPercent}%</td>
                      <td className="text-secondary">{change.otherPercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Primary vs Runoff Comparison */}
      <div className="alert alert-info mb-3">
        <h6 className="mb-2"><strong>Primary vs. Runoff Comparison</strong></h6>
        <p className="mb-0 small">
          These charts compare ballot return patterns between the April 2025 primary election and the current July 2025 runoff. 
          The x-axis shows "days before election" to align the timelines. This helps identify if turnout is tracking higher or lower than the primary, 
          and whether party composition is shifting. Empty bars in the runoff chart represent future data points that haven't been released yet.
        </p>
      </div>
      
      {/* Primary Election Chart */}
      {comparisonData && (
        <div className="card mb-4">
          <div className="card-header">
            Primary Election Returns (April 8, 2025)
          </div>
          <div className="card-body">
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <BarChart
                  data={comparisonData.primary}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="label" 
                    label={{ value: 'Days Before Election', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: 'Percentage', angle: -90, position: 'insideLeft' }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                  <Bar dataKey="Turnout %" fill="#8884d8" />
                  <Bar dataKey="Dem %" fill="#2E86C1" />
                  <Bar dataKey="Rep %" fill="#C0392B" />
                  <Bar dataKey="Other %" fill="#7F8C8D" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Runoff Election Chart */}
      {comparisonData && (
        <div className="card mb-4">
          <div className="card-header">
            Runoff Election Returns (July 1, 2025)
          </div>
          <div className="card-body">
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <BarChart
                  data={comparisonData.runoff}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="label" 
                    label={{ value: 'Days Before Election', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: 'Percentage', angle: -90, position: 'insideLeft' }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (value === null) return ['No data yet', name];
                      return [`${value}%`, name];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Turnout %" fill="#8884d8" />
                  <Bar dataKey="Dem %" fill="#2E86C1" />
                  <Bar dataKey="Rep %" fill="#C0392B" />
                  <Bar dataKey="Other %" fill="#7F8C8D" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile optimization styles */}
      <style jsx>{`
        @media (max-width: 767.98px) {
          .card-header {
            padding: 0.5rem 0.75rem;
            font-size: 0.9rem;
          }
          .table th, .table td {
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
          }
          .table-responsive {
            margin-bottom: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default BallotReturnsDashboard;