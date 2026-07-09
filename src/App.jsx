import React, { useState, useEffect } from 'react';
import { apiFetch } from './config/api';
import { Home, ScanFace, Fingerprint, Volume2, VolumeX, ShieldAlert, ShieldCheck, LockKeyhole, Sun, Moon, Users, BarChart3, Settings, Shield } from 'lucide-react';
import HomeTab from './pages/Home';
import ScanTab from './pages/Scan';
import UserTab from './pages/User';
import AdminPanel from './pages/Admin';
import agentAvatar from './assets/agent_avatar.png';
import './App.css';




export default function App() {
  const [tab, setTab] = useState('home'); // 'home', 'scan', 'logs', 'user', 'admin'
  const [scanMode, setScanMode] = useState('check-in'); // 'check-in' or 'check-out'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [theme, setTheme] = useState('light'); // 'light' or 'dark'
  const [unreadCount, setUnreadCount] = useState(0);
  const [loggedInEmployee, setLoggedInEmployee] = useState(null);
  const [verificationTarget, setVerificationTarget] = useState(null);

  const handleEmployeeLogout = () => {
    if (loggedInEmployee) {
      apiFetch('/api/employee/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toLocaleTimeString(),
          employeeName: loggedInEmployee.name,
          employeeId: loggedInEmployee.employeeId
        })
      }).catch(err => console.warn("Unable to log portal logout session:", err));
    }
    setLoggedInEmployee(null);
    setTab('home');
  };

  // Fetch unread notifications count for alerts badge
  const fetchNotificationCount = async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications`);
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.length);
      }
    } catch (err) {
      console.warn("Unable to fetch notification badge count:", err);
    }
  };

  useEffect(() => {
    fetchNotificationCount();
    const interval = setInterval(fetchNotificationCount, 10000);
    return () => clearInterval(interval);
  }, []);

  // Theme effect
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleScanFinished = (scanData, mode) => {
    // Biometric scanner completed successfully
    fetchNotificationCount();
    if (mode === 'verify') {
      if (scanData && scanData.employee) {
        // Call backend login to record session in database logs
        apiFetch('/api/employee/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timestamp: new Date().toLocaleTimeString(),
            employeeName: scanData.employee.name,
            employeeId: scanData.employee.employeeId
          })
        }).catch(err => console.warn("Unable to log portal login session:", err));

        setLoggedInEmployee(scanData.employee);
        setTab('user'); // Redirect to their personal portal dashboard
      }
    }
  };

  const renderContent = () => {
    switch (tab) {
      case 'home':
        return <HomeTab setTab={setTab} setScanMode={setScanMode} />;
      case 'users':
        return <AdminPanel soundEnabled={soundEnabled} initialTab="employees" />;
      case 'analytics':
        return <AdminPanel soundEnabled={soundEnabled} initialTab="analytics" />;
      case 'settings':
        return <AdminPanel soundEnabled={soundEnabled} initialTab="settings" />;
      case 'scan':
        return (
          <ScanTab 
            onScanComplete={(data) => handleScanFinished(data, scanMode)} 
            soundEnabled={soundEnabled} 
            initialMode={scanMode} 
            verificationTarget={verificationTarget}
            onCancelVerification={() => {
              setTab('user');
            }}
          />
        );
      case 'user':
        return (
          <UserTab 
            loggedInEmployee={loggedInEmployee} 
            onLogout={handleEmployeeLogout}
            onLoginSuccess={(empData) => {
              // Record session
              apiFetch('/api/employee/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  timestamp: new Date().toLocaleTimeString(),
                  employeeName: empData.name,
                  employeeId: empData.employeeId
                })
              }).catch(err => console.warn("Unable to log portal login session:", err));

              setLoggedInEmployee(empData);
            }}
          />
        );
      default:
        return <HomeTab setTab={setTab} setScanMode={setScanMode} />;
    }
  };

  return (
    <div className="app-container">
      {/* Left Sidebar for Desktop Viewports */}
      <aside className="desktop-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <Shield size={20} style={{ color: 'var(--color-gold)' }} />
            <span className="sidebar-brand-title">Security Pro</span>
          </div>
          <span className="sidebar-brand-sub">Biometric Access Console</span>
        </div>

        <div className="sidebar-menu">
          <button 
            className={`sidebar-btn ${tab === 'home' ? 'active' : ''}`}
            onClick={() => setTab('home')}
          >
            <Home size={16} />
            <span>Home Dashboard</span>
          </button>

          <button 
            className={`sidebar-btn ${tab === 'scan' ? 'active' : ''}`}
            onClick={() => {
              setScanMode('check-in');
              setTab('scan');
            }}
          >
            <ScanFace size={16} />
            <span>Biometric Scanner</span>
          </button>


          <button 
            className={`sidebar-btn ${tab === 'users' ? 'active' : ''}`}
            onClick={() => setTab('users')}
          >
            <Users size={16} />
            <span>Staff Registry</span>
          </button>

          <button 
            className={`sidebar-btn ${tab === 'analytics' ? 'active' : ''}`}
            onClick={() => setTab('analytics')}
          >
            <BarChart3 size={16} />
            <span>System Analytics</span>
          </button>

          <button 
            className={`sidebar-btn ${tab === 'settings' ? 'active' : ''}`}
            onClick={() => setTab('settings')}
            style={{ marginTop: 'auto' }}
          >
            <Settings size={16} />
            <span>Console Settings</span>
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-footer-actions">
            {/* Theme Toggle */}
            <button 
              className="audio-toggle" 
              onClick={toggleTheme}
              title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} style={{ color: 'var(--color-gold)' }} />}
            </button>

            {/* Audio Toggle */}
            <button 
              className="audio-toggle" 
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute chimes" : "Enable chimes"}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-green)' }} className="anim-pulse" />
            <span>SYSTEM ENCRYPTED</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area (supports bottom nav on mobile) */}
      <div className="app-screen">
        {/* Top Header for Mobile matching the mock */}
        <header className="app-header">
          <div className="brand-section">
            <Shield size={20} style={{ color: 'var(--color-text-primary)' }} />
            <span className="brand-title" style={{ fontWeight: '700', fontSize: '15px', letterSpacing: '0.5px' }}>Security Pro</span>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Audio Toggle Shortcut */}
            <button 
              className="audio-toggle" 
              onClick={() => setSoundEnabled(!soundEnabled)}
              style={{ border: 'none', width: '28px', height: '28px' }}
              title={soundEnabled ? "Mute" : "Unmute"}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>

            {/* Theme Toggle Shortcut */}
            <button 
              className="audio-toggle" 
              onClick={toggleTheme}
              style={{ border: 'none', width: '28px', height: '28px' }}
              title="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} style={{ color: 'var(--color-gold)' }} />}
            </button>

            {/* Rounded Admin profile picture matching mock */}
            <div style={styles.avatarWrapper}>
              <img src={agentAvatar} alt="Admin Profile" style={styles.avatarImg} />
            </div>
          </div>
        </header>

        {/* Dynamic Content Panel */}
        <main className="app-content">
          {renderContent()}
        </main>

        {/* Bottom Navigation for Mobile (matches the mock exactly) */}
        <nav className="app-nav">
          <button 
            className={`nav-item ${tab === 'home' ? 'active' : ''}`}
            onClick={() => setTab('home')}
          >
            <Home className="nav-icon" />
            <span>Home</span>
          </button>


          <button 
            className={`nav-item ${tab === 'users' ? 'active' : ''}`}
            onClick={() => setTab('users')}
          >
            <Users className="nav-icon" />
            <span>Users</span>
          </button>

          <button 
            className={`nav-item ${tab === 'analytics' ? 'active' : ''}`}
            onClick={() => setTab('analytics')}
          >
            <BarChart3 className="nav-icon" />
            <span>Analytics</span>
          </button>

          <button 
            className={`nav-item ${tab === 'settings' ? 'active' : ''}`}
            onClick={() => setTab('settings')}
          >
            <Settings className="nav-icon" />
            <span>Settings</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

const styles = {
  avatarWrapper: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    overflow: 'hidden',
    border: '1.5px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  }
};


