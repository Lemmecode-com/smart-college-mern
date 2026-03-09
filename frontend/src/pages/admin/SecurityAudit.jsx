import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function SecurityAudit() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    eventType: '',
    severity: '',
    startDate: '',
    endDate: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [filters, currentPage]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...filters,
        page: currentPage,
        limit: 20
      });
      const res = await api.get(`/security-audit?${params}`);
      console.log('📊 Security Audit API Response:', res.data);
      
      // API returns array directly, not wrapped in object
      const logsData = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.logs || []);
      console.log('Logs data:', logsData);
      console.log('Logs length:', logsData?.length);
      
      setLogs(Array.isArray(logsData) ? logsData : []);
      setPagination(res.data?.pagination || null);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/security-audit/dashboard');
      setStats(res.data?.data || null);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStats(null);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handleMarkAsReviewed = async (id) => {
    try {
      await api.put(`/security-audit/${id}/review`, { notes: 'Reviewed by admin' });
      fetchLogs();
      fetchStats();
    } catch (error) {
      console.error('Failed to mark as reviewed:', error);
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams(filters);
    window.open(`/api/security-audit/export/download?${params}`, '_blank');
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'severity-critical';
      case 'HIGH': return 'severity-high';
      case 'MEDIUM': return 'severity-medium';
      case 'LOW': return 'severity-low';
      default: return '';
    }
  };

  const getEventTypeIcon = (eventType) => {
    const icons = {
      'LOGIN_SUCCESS': '✅',
      'LOGIN_FAILED': '❌',
      'LOGOUT': '🚪',
      'PASSWORD_RESET_REQUEST': '🔑',
      'PASSWORD_RESET_SUCCESS': '✅',
      'PERMISSION_DENIED': '🚫',
      'UNAUTHORIZED_ACCESS': '⚠️',
      'BRUTE_FORCE_DETECTED': '🚨',
      'TOKEN_BLACKLISTED': '⛔',
      'DATA_MODIFICATION': '📝',
      'BULK_DATA_EXPORT': '📊'
    };
    return icons[eventType] || '📋';
  };

  return (
    <div className="security-audit-page" style={{ padding: '20px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>🔒 Security Audit Dashboard</h2>
        <button className="btn btn-outline-primary" onClick={handleExport}>
          📥 Export CSV
        </button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card stat-card bg-primary text-white">
              <div className="card-body">
                <h3>{stats.last24Hours.totalEvents}</h3>
                <p>Events (24h)</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card stat-card bg-warning text-white">
              <div className="card-body">
                <h3>{stats.last24Hours.failedLogins}</h3>
                <p>Failed Logins (24h)</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card stat-card bg-danger text-white">
              <div className="card-body">
                <h3>{stats.last24Hours.criticalEvents}</h3>
                <p>Critical Events (24h)</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card stat-card bg-success text-white">
              <div className="card-body">
                <h3>{stats.last7Days.totalEvents}</h3>
                <p>Total Events (7 days)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <h5>Filters</h5>
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Event Type</label>
              <select 
                className="form-select" 
                value={filters.eventType}
                onChange={(e) => handleFilterChange('eventType', e.target.value)}
              >
                <option value="">All Event Types</option>
                <option value="LOGIN_SUCCESS">Login Success</option>
                <option value="LOGIN_FAILED">Login Failed</option>
                <option value="LOGOUT">Logout</option>
                <option value="PASSWORD_RESET_REQUEST">Password Reset Request</option>
                <option value="PASSWORD_RESET_SUCCESS">Password Reset Success</option>
                <option value="PERMISSION_DENIED">Permission Denied</option>
                <option value="UNAUTHORIZED_ACCESS">Unauthorized Access</option>
                <option value="BRUTE_FORCE_DETECTED">Brute Force Detected</option>
                <option value="TOKEN_BLACKLISTED">Token Blacklisted</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Severity</label>
              <select 
                className="form-select"
                value={filters.severity}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
              >
                <option value="">All Severities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Start Date</label>
              <input 
                type="date" 
                className="form-control"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">End Date</label>
              <input 
                type="date" 
                className="form-control"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-primary w-100" onClick={() => setCurrentPage(1)}>
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card">
        <div className="card-body">
          <h5>Security Events Log</h5>

          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover table-striped">
                  <thead className="table-dark">
                    <tr>
                      <th>Timestamp</th>
                      <th>Event</th>
                      <th>User</th>
                      <th>IP Address</th>
                      <th>Severity</th>
                      <th>Endpoint</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs && logs.length > 0 ? (
                      logs.map(log => (
                      <tr key={log._id}>
                        <td>
                          <small>
                            {new Date(log.createdAt).toLocaleDateString()}<br />
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </small>
                        </td>
                        <td>
                          <span className="me-2">{getEventTypeIcon(log.eventType)}</span>
                          <span className={`badge ${log.category === 'AUTHENTICATION' ? 'bg-info' : 'bg-warning'}`}>
                            {log.eventType}
                          </span>
                        </td>
                        <td>
                          {log.userEmail ? (
                            <>
                              <div>{log.userEmail}</div>
                              <small className="text-muted">{log.userRole}</small>
                            </>
                          ) : (
                            <span className="text-muted">N/A</span>
                          )}
                        </td>
                        <td>
                          <code>{log.ipAddress}</code>
                        </td>
                        <td>
                          <span className={`badge ${getSeverityBadgeClass(log.severity)}`}>
                            {log.severity}
                          </span>
                        </td>
                        <td>
                          <small>{log.endpoint || 'N/A'}</small>
                        </td>
                        <td>
                          {log.reviewed ? (
                            <span className="badge bg-success">✅ Reviewed</span>
                          ) : (
                            <span className="badge bg-warning">⏳ Pending</span>
                          )}
                        </td>
                        <td>
                          {!log.reviewed && (
                            <button 
                              className="btn btn-sm btn-success"
                              onClick={() => handleMarkAsReviewed(log._id)}
                            >
                              Mark Reviewed
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
                          <div className="alert alert-info mb-0">
                            No security events found for the selected filters.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <nav>
                  <ul className="pagination justify-content-center">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => setCurrentPage(prev => prev - 1)}
                      >
                        Previous
                      </button>
                    </li>
                    {[...Array(pagination.pages)].map((_, i) => (
                      <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => setCurrentPage(i + 1)}
                        >
                          {i + 1}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === pagination.pages ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => setCurrentPage(prev => prev + 1)}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      {/* Custom CSS for severity badges */}
      <style>{`
        .severity-critical { background-color: #dc3545; }
        .severity-high { background-color: #fd7e14; }
        .severity-medium { background-color: #ffc107; color: #000; }
        .severity-low { background-color: #28a745; }
        
        .stat-card {
          transition: transform 0.2s;
        }
        .stat-card:hover {
          transform: translateY(-5px);
        }
      `}</style>
    </div>
  );
}
