import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Users, Clock, AlertTriangle, ArrowRightLeft, ArrowUpRight, ChevronRight, UserPlus, ScanFace, FileClock, Activity } from 'lucide-react';

export default function HomeTab({ setTab, setScanMode }) {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    presentToday: 0,
    lateToday: 0,
    absentToday: 0,
    avgWorkingHours: 8.0
  });
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats
      const statsRes = await fetch('http://localhost:8082/api/admin/analytics');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch logs
      const logsRes = await fetch('http://localhost:8082/api/logs');
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        // reverse to get recent first
        setRecentLogs([...logsData].reverse().slice(0, 5));
      }

      // Fetch unread count
      const notifRes = await fetch('http://localhost:8082/api/notifications');
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setUnreadCount(notifData.length);
      }
    } catch (err) {
      console.warn("Unable to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Poll stats every 8 seconds
    const interval = setInterval(fetchDashboardData, 8000);
    return () => clearInterval(interval);
  }, []);

  const mockAlerts = [
    {
      id: 'mock-1',
      message: 'Unauthorized facial scanning signature mismatch on Outer gate 3',
      type: 'ALERT',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: 'SECURITY BREACH',
      badgeClass: 'red',
      iconClass: 'red'
    },
    {
      id: 'mock-2',
      message: 'Database synchronization with cloud main frame finalized',
      type: 'SECURE',
      timestamp: '09:15 AM',
      category: 'DATA INTEGRITY',
      badgeClass: 'blue',
      iconClass: 'blue'
    },
    {
      id: 'mock-3',
      message: 'Routine calibration of biometric scan depth sensors',
      type: 'SUCCESS',
      timestamp: '08:00 AM',
      category: 'ROUTINE MAINTENANCE',
      badgeClass: 'gray',
      iconClass: 'gray'
    }
  ];

  // Map real logs to matching categories
  const mappedRealLogs = recentLogs.map(log => {
    let category = 'ROUTINE MAINTENANCE';
    let badgeClass = 'gray';
    let iconClass = 'gray';

    if (log.type === 'ALERT') {
      category = 'SECURITY BREACH';
      badgeClass = 'red';
      iconClass = 'red';
    } else if (log.type === 'SECURE') {
      category = 'DATA INTEGRITY';
      badgeClass = 'blue';
      iconClass = 'blue';
    }

    // Format time if log has a timestamp
    let displayTime = log.timestamp || '';
    if (displayTime.includes(':')) {
      const parts = displayTime.split(':');
      if (parts.length >= 2) {
        displayTime = `${parts[0]}:${parts[1]}`;
      }
    } else {
      displayTime = 'Just now';
    }

    return {
      id: log.id,
      message: log.message,
      type: log.type,
      timestamp: displayTime,
      category,
      badgeClass,
      iconClass
    };
  });

  // Combine real logs and mock logs
  const displayAlerts = [...mappedRealLogs, ...mockAlerts].slice(0, 5);

  return (
    <div className="dashboard-container">
      {/* Welcome Block */}
      <div className="dashboard-welcome">
        <div className="welcome-info">
          <h1>Welcome, Admin</h1>
          <div className="system-status">
            <ShieldCheck size={16} style={{ color: 'var(--color-green)' }} />
            <span>System status: Fully Encrypted</span>
            <span className="status-indicator-dot anim-pulse" />
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="dashboard-stats-grid">
        {/* Active Users */}
        <div className="dashboard-card">
          <span className="stat-label">Active Users</span>
          <span className="stat-value">{loading ? '--' : stats.activeEmployees}</span>
          <span className="stat-trend up">
            <ArrowUpRight size={14} />
            <span>+12% this month</span>
          </span>
        </div>

        {/* System Uptime */}
        <div className="dashboard-card">
          <span className="stat-label">System Uptime</span>
          <span className="stat-value">99.9%</span>
          <span className="stat-trend up">
            <span className="status-indicator-dot" />
            <span>Normal Operations</span>
          </span>
        </div>

        {/* Alerts Navy Card */}
        <div className="dashboard-card navy">
          <span className="stat-label">Unresolved Alerts</span>
          <span className="stat-value">{loading ? '--' : unreadCount}</span>
          <span className="stat-trend">
            <Activity size={14} />
            <span>Action Required</span>
          </span>
        </div>
      </div>

      {/* Quick Actions & Recent Alerts Grid */}
      <div className="home-dashboard-grid">
        {/* Left Column: Quick Actions */}
        <div className="home-grid-left">
          <div className="dashboard-card" style={{ padding: '20px' }}>
            <h2 className="dashboard-section-title">
              <Activity size={18} style={{ color: 'var(--color-gold)' }} />
              <span>Quick Actions</span>
            </h2>
            
            <div className="quick-actions-list">
              <button 
                className="action-row-btn"
                onClick={() => setTab('users')}
              >
                <div className="action-left">
                  <div className="action-icon-wrapper">
                    <UserPlus size={20} />
                  </div>
                  <div className="action-info">
                    <span className="action-title">Add User</span>
                    <span className="action-desc">Register a new profile and capture biometric data</span>
                  </div>
                </div>
                <ChevronRight className="action-chevron" size={18} />
              </button>

              <button 
                className="action-row-btn"
                onClick={() => {
                  setScanMode('check-in');
                  setTab('scan');
                }}
              >
                <div className="action-left">
                  <div className="action-icon-wrapper">
                    <ScanFace size={20} />
                  </div>
                  <div className="action-info">
                    <span className="action-title">Launch Scanner</span>
                    <span className="action-desc">Perform facial recognition clock-in/out check</span>
                  </div>
                </div>
                <ChevronRight className="action-chevron" size={18} />
              </button>

              <button 
                className="action-row-btn"
                onClick={() => setTab('logs')}
              >
                <div className="action-left">
                  <div className="action-icon-wrapper">
                    <FileClock size={20} />
                  </div>
                  <div className="action-info">
                    <span className="action-title">View Logs</span>
                    <span className="action-desc">Review security audit logs and event database</span>
                  </div>
                </div>
                <ChevronRight className="action-chevron" size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Alerts */}
        <div className="home-grid-right">
          <div className="dashboard-card" style={{ padding: '20px' }}>
            <h2 className="dashboard-section-title">
              <ShieldAlert size={18} style={{ color: 'var(--color-red)' }} />
              <span>Recent Alerts</span>
            </h2>

            <div className="recent-alerts-list">
              {displayAlerts.map(alert => (
                <div key={alert.id} className="alert-item-row">
                  <div className="alert-item-left">
                    <div className={`alert-avatar-icon ${alert.iconClass}`}>
                      {alert.type === 'ALERT' ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                    </div>
                    <div className="alert-details">
                      <span className="alert-message">{alert.message}</span>
                      <span className="alert-time">{alert.timestamp}</span>
                    </div>
                  </div>
                  <span className={`alert-badge ${alert.badgeClass}`}>{alert.category}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
