import React, { useState, useEffect } from 'react';
import axios from 'axios';
// Future: replace mocked data with Firestore aggregations or Cloud Functions
import { 
  BarChart, 
  TrendingUp, 
  Download, 
  Calendar,
  Users,
  MapPin,
  DollarSign,
  Activity
} from 'lucide-react';
import { toast } from 'react-toastify';

const AdminReports = () => {
  const [reports, setReports] = useState({
    dailyStats: [],
    monthlyRevenue: [],
    popularSlots: [],
    userActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [reportType, setReportType] = useState('overview');

  useEffect(() => {
    // Placeholder: simulate load while we keep UI responsive
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, [dateRange]);

  const exportReport = async (type) => {
    try {
      const response = await axios.get(`/api/admin/reports/export?type=${type}&days=${dateRange}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-report-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading reports...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Reports & Analytics</h1>
            <p className="page-subtitle">Insights across bookings, usage, and revenue</p>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <select
              className="form-input"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
              <option value="365">Last year</option>
            </select>
            
            <button
              onClick={() => exportReport('overview')}
              className="btn btn-outline"
            >
              <Download size={16} style={{ marginRight: '6px' }} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="container">
        <div className="tab-navigation">
          <button
            className={`tab-button ${reportType === 'overview' ? 'active' : ''}`}
            onClick={() => setReportType('overview')}
          >
            <BarChart size={16} />
            Overview
          </button>
          <button
            className={`tab-button ${reportType === 'usage' ? 'active' : ''}`}
            onClick={() => setReportType('usage')}
          >
            <Activity size={16} />
            Usage
          </button>
          <button
            className={`tab-button ${reportType === 'revenue' ? 'active' : ''}`}
            onClick={() => setReportType('revenue')}
          >
            <DollarSign size={16} />
            Revenue
          </button>
          <button
            className={`tab-button ${reportType === 'users' ? 'active' : ''}`}
            onClick={() => setReportType('users')}
          >
            <Users size={16} />
            Users
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {reportType === 'overview' && (
        <>
          {/* Key Metrics */}
          <div className="stats-grid">
            <div className="stat-card stat-primary">
              <div className="stat-icon">
                <Calendar size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">
                  {reports.dailyStats?.reduce((sum, day) => sum + day.bookings, 0) || 0}
                </div>
                <div className="stat-label">Total Bookings</div>
                <div className="stat-change positive">
                  <TrendingUp size={12} />
                  +12% from last period
                </div>
              </div>
            </div>
            
            <div className="stat-card stat-success">
              <div className="stat-icon">
                <DollarSign size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">
                  {formatCurrency(reports.monthlyRevenue?.reduce((sum, month) => sum + month.revenue, 0) || 0)}
                </div>
                <div className="stat-label">Revenue</div>
                <div className="stat-change positive">
                  <TrendingUp size={12} />
                  +8% from last period
                </div>
              </div>
            </div>
            
            <div className="stat-card stat-info">
              <div className="stat-icon">
                <MapPin size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">
                  {formatPercentage(0.85)}
                </div>
                <div className="stat-label">Occupancy Rate</div>
                <div className="stat-change neutral">
                  <Activity size={12} />
                  Steady
                </div>
              </div>
            </div>
            
            <div className="stat-card stat-warning">
              <div className="stat-icon">
                <Users size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">156</div>
                <div className="stat-label">Active Users</div>
                <div className="stat-change positive">
                  <TrendingUp size={12} />
                  +5% from last period
                </div>
              </div>
            </div>
          </div>

          {/* Charts Placeholder */}
          <div className="container">
            <div className="grid grid-2">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Daily Bookings Trend</h3>
                  <button
                    onClick={() => exportReport('daily-bookings')}
                    className="btn btn-outline btn-sm"
                  >
                    <Download size={14} />
                  </button>
                </div>
                <div className="chart-placeholder">
                  <BarChart size={48} style={{ color: '#ddd' }} />
                  <p>Daily bookings chart would be displayed here</p>
                  <small>Average: 25 bookings/day</small>
                </div>
              </div>
              
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Revenue Growth</h3>
                  <button
                    onClick={() => exportReport('revenue')}
                    className="btn btn-outline btn-sm"
                  >
                    <Download size={14} />
                  </button>
                </div>
                <div className="chart-placeholder">
                  <TrendingUp size={48} style={{ color: '#ddd' }} />
                  <p>Revenue trend chart would be displayed here</p>
                  <small>Monthly growth: +15%</small>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Usage Analytics Tab */}
      {reportType === 'usage' && (
        <div className="container">
          <div className="grid grid-2">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Most Popular Slots</h3>
                <button
                  onClick={() => exportReport('popular-slots')}
                  className="btn btn-outline btn-sm"
                >
                  <Download size={14} />
                </button>
              </div>
              <div style={{ padding: '20px' }}>
                {reports.popularSlots?.length > 0 ? (
                  <div className="ranking-list">
                    {reports.popularSlots.slice(0, 10).map((slot, index) => (
                      <div key={slot._id} className="ranking-item">
                        <div className="ranking-position">#{index + 1}</div>
                        <div className="ranking-content">
                          <div className="ranking-name">{slot.slotNumber}</div>
                          <div className="ranking-details">{slot.location}</div>
                        </div>
                        <div className="ranking-value">{slot.bookingCount} bookings</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <MapPin className="empty-state-icon" />
                    <p>No usage data available</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Peak Usage Hours</h3>
              </div>
              <div className="chart-placeholder">
                <Activity size={48} style={{ color: '#ddd' }} />
                <p>Hourly usage chart would be displayed here</p>
                <small>Peak hours: 9 AM - 11 AM, 2 PM - 4 PM</small>
              </div>
            </div>
          </div>
          
          {/* Location Usage */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Usage by Location</h3>
              <button
                onClick={() => exportReport('location-usage')}
                className="btn btn-outline btn-sm"
              >
                <Download size={14} />
              </button>
            </div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Total Slots</th>
                    <th>Average Occupancy</th>
                    <th>Total Bookings</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Building A</td>
                    <td>10</td>
                    <td>85%</td>
                    <td>245</td>
                    <td>$2,450</td>
                  </tr>
                  <tr>
                    <td>Building B</td>
                    <td>10</td>
                    <td>78%</td>
                    <td>210</td>
                    <td>$2,100</td>
                  </tr>
                  <tr>
                    <td>Building C</td>
                    <td>10</td>
                    <td>92%</td>
                    <td>280</td>
                    <td>$2,800</td>
                  </tr>
                  <tr>
                    <td>Main Campus</td>
                    <td>10</td>
                    <td>70%</td>
                    <td>189</td>
                    <td>$1,890</td>
                  </tr>
                  <tr>
                    <td>Sports Complex</td>
                    <td>10</td>
                    <td>65%</td>
                    <td>156</td>
                    <td>$1,560</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Tab */}
      {reportType === 'revenue' && (
        <div className="container">
          <div className="grid grid-2">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Monthly Revenue</h3>
                <button
                  onClick={() => exportReport('monthly-revenue')}
                  className="btn btn-outline btn-sm"
                >
                  <Download size={14} />
                </button>
              </div>
              <div className="chart-placeholder">
                <DollarSign size={48} style={{ color: '#ddd' }} />
                <p>Monthly revenue chart would be displayed here</p>
                <small>Current month: {formatCurrency(10800)}</small>
              </div>
            </div>
            
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Revenue by User Type</h3>
              </div>
              <div style={{ padding: '20px' }}>
                <div className="progress-item">
                  <div className="progress-label">
                    <span>Faculty</span>
                    <span>{formatCurrency(6500)}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '60%' }}></div>
                  </div>
                </div>
                
                <div className="progress-item">
                  <div className="progress-label">
                    <span>Students</span>
                    <span>{formatCurrency(4300)}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '40%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Reports Tab */}
      {reportType === 'users' && (
        <div className="container">
          <div className="grid grid-2">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">User Registration Trend</h3>
                <button
                  onClick={() => exportReport('user-registrations')}
                  className="btn btn-outline btn-sm"
                >
                  <Download size={14} />
                </button>
              </div>
              <div className="chart-placeholder">
                <Users size={48} style={{ color: '#ddd' }} />
                <p>User registration chart would be displayed here</p>
                <small>New users this month: 23</small>
              </div>
            </div>
            
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Top Users by Bookings</h3>
              </div>
              <div style={{ padding: '20px' }}>
                <div className="ranking-list">
                  <div className="ranking-item">
                    <div className="ranking-position">#1</div>
                    <div className="ranking-content">
                      <div className="ranking-name">Dr. Sarah Johnson</div>
                      <div className="ranking-details">Faculty</div>
                    </div>
                    <div className="ranking-value">45 bookings</div>
                  </div>
                  
                  <div className="ranking-item">
                    <div className="ranking-position">#2</div>
                    <div className="ranking-content">
                      <div className="ranking-name">Emily Davis</div>
                      <div className="ranking-details">Student</div>
                    </div>
                    <div className="ranking-value">38 bookings</div>
                  </div>
                  
                  <div className="ranking-item">
                    <div className="ranking-position">#3</div>
                    <div className="ranking-content">
                      <div className="ranking-name">Prof. Michael Smith</div>
                      <div className="ranking-details">Faculty</div>
                    </div>
                    <div className="ranking-value">32 bookings</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
