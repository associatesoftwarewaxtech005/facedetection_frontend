import React, { useState, useEffect } from 'react';
import { apiFetch } from '../config/api';
import { Fingerprint, Search, Shield, ShieldCheck, Mail, Phone, Calendar, Clock, Award } from 'lucide-react';
import { ProfileAvatar } from '../config/avatar';

const formatWorkingHours = (decimalHours) => {
  if (decimalHours === null || decimalHours === undefined) return '0h 0m';
  const totalMinutes = Math.round(decimalHours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
};

export default function UserTab({ loggedInEmployee, onLogout, onLoginSuccess }) {
  const [employeeId, setEmployeeId] = useState(loggedInEmployee ? loggedInEmployee.employeeId : '');
  const [employee, setEmployee] = useState(loggedInEmployee || null);
  const [records, setRecords] = useState([]);
  const [searchId, setSearchId] = useState(loggedInEmployee ? loggedInEmployee.employeeId : '');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginInputId, setLoginInputId] = useState('');
  const [loginPasscode, setLoginPasscode] = useState('');
  const [loginError, setLoginError] = useState('');

  const [lockoutState, setLockoutState] = useState(() => {
    const saved = localStorage.getItem('biometric_lockouts');
    return saved ? JSON.parse(saved) : {}; // Maps ID -> timestamp of lockout expiration
  });

  const [failedCounts, setFailedCounts] = useState(() => {
    const saved = localStorage.getItem('biometric_failed_counts');
    return saved ? JSON.parse(saved) : {}; // Maps ID -> count
  });

  const handleLoginInitiate = async (e) => {
    e.preventDefault();
    const cleanId = loginInputId.trim().toUpperCase();
    const cleanPin = loginPasscode.trim();
    if (!cleanId) {
      setLoginError('PLEASE ENTER YOUR EMPLOYEE ID.');
      return;
    }
    if (!cleanPin) {
      setLoginError('PLEASE ENTER YOUR PASSCODE PIN.');
      return;
    }

    // Check if currently locked out
    const now = Date.now();
    if (lockoutState[cleanId] && now < lockoutState[cleanId]) {
      const remainingSecs = Math.ceil((lockoutState[cleanId] - now) / 1000);
      setLoginError(`PORTAL LOCKED OUT. RETRY IN ${remainingSecs} SECONDS.`);
      return;
    }

    setLoading(true);
    setLoginError('');
    try {
      const res = await apiFetch('/api/employee/login-with-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: cleanId,
          passcode: cleanPin
        })
      });
      const data = await res.json();
      if (res.ok) {
        // Direct login success!
        // Reset failed count
        const updatedCounts = { ...failedCounts, [cleanId]: 0 };
        setFailedCounts(updatedCounts);
        localStorage.setItem('biometric_failed_counts', JSON.stringify(updatedCounts));
        
        onLoginSuccess && onLoginSuccess(data);
      } else {
        // Increment failed attempt count
        const newCount = (failedCounts[cleanId] || 0) + 1;
        const updatedCounts = { ...failedCounts, [cleanId]: newCount };
        setFailedCounts(updatedCounts);
        localStorage.setItem('biometric_failed_counts', JSON.stringify(updatedCounts));

        if (newCount >= 3) {
          // Lockout for 5 minutes
          const expiration = Date.now() + 5 * 60 * 1000;
          const updatedLockouts = { ...lockoutState, [cleanId]: expiration };
          setLockoutState(updatedLockouts);
          localStorage.setItem('biometric_lockouts', JSON.stringify(updatedLockouts));
          
          // Clear attempts
          const resetCounts = { ...failedCounts, [cleanId]: 0 };
          setFailedCounts(resetCounts);
          localStorage.setItem('biometric_failed_counts', JSON.stringify(resetCounts));

          setLoginError('TOO MANY FAILED ATTEMPTS. ACCOUNT LOCKED FOR 5 MINUTES.');
        } else {
          setLoginError(data.message || `INVALID ID OR PASSCODE PIN. ATTEMPT ${newCount}/3.`);
        }
      }
    } catch (err) {
      setLoginError('CONNECTION FAULT: DB OFFLINE.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeData = async (targetId) => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch from employees list to get details
      const empListRes = await apiFetch('/api/admin/employees');
      if (empListRes.ok) {
        const list = await empListRes.json();
        const found = list.find(e => e.employeeId.toUpperCase() === targetId.toUpperCase());
        
        if (found) {
          setEmployee(found);
          
          // 2. Fetch history
          const historyRes = await apiFetch(`/api/attendance/employee/${found.employeeId}`);
          if (historyRes.ok) {
            const history = await historyRes.json();
            // Sort by newest date
            setRecords([...history].reverse());
          }
        } else {
          setEmployee(null);
          setRecords([]);
          setErrorMsg('EMPLOYEE ID NOT RECOGNIZED.');
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('DATABASE CONNECTION FAULT');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loggedInEmployee) {
      setEmployeeId(loggedInEmployee.employeeId);
      setEmployee(loggedInEmployee);
      setSearchId(loggedInEmployee.employeeId);
    } else {
      setEmployeeId('');
      setEmployee(null);
      setSearchId('');
      setRecords([]);
    }
  }, [loggedInEmployee]);

  useEffect(() => {
    if (employeeId) {
      fetchEmployeeData(employeeId);
    }
  }, [employeeId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    setEmployeeId(searchId);
  };

  // Stats calculation
  const calculateTotalHours = () => {
    const total = records.reduce((acc, r) => acc + (r.workingHours || 0), 0);
    return formatWorkingHours(total);
  };

  const countStatus = (status) => {
    return records.filter(r => r.status === status).length;
  };

  return (
    <div style={styles.container}>
      {loggedInEmployee ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <button 
            onClick={onLogout} 
            style={{
              background: 'var(--color-red-bg)',
              border: '1px solid var(--color-red-border)',
              color: 'var(--color-red)',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              letterSpacing: '0.5px'
            }}
            className="mono-font"
          >
            LOCK PORTAL SESSION
          </button>
        </div>
      ) : null}

      {errorMsg && (
        <div style={styles.errorBanner} className="mono-font">
          <AlertCircle size={14} />
          <span>{errorMsg}</span>
        </div>
      )}

      {employee ? (
        <>
          {/* Access Authorized Checkmark */}
          <div style={styles.verificationSection}>
            <div style={styles.reticleFrame}>
              <div style={styles.cornerTL} />
              <div style={styles.cornerTR} />
              <div style={styles.cornerBL} />
              <div style={styles.cornerBR} />
              
              <div style={styles.checkmarkCircle}>
                <ShieldCheck size={38} style={{ color: 'var(--color-gold)' }} />
              </div>
            </div>
            <h1 style={styles.accessAuthorized} className="hud-font">BIOMETRICS SECURE</h1>
            <p style={styles.identityVerification} className="mono-font">
              {employee.name} // Status: {employee.status}
            </p>
          </div>

          {/* Subject Profile Section */}
          <div style={styles.profileSection} className="cyber-panel">
            <div style={styles.cardHeaderPlate} className="mono-font">
              <span>EMPLOYEE PROFILE DATA</span>
              <span style={{ color: 'var(--color-gold)' }}>ROLE: {employee.role}</span>
            </div>

            <div style={styles.profileCard}>
              <div style={{ position: 'relative' }}>
                <ProfileAvatar employee={employee} size={84} style={{ borderRadius: '16px' }} />
                <div style={styles.avatarSubBadge}>
                  <Fingerprint size={14} style={{ color: 'var(--color-bg-deep)' }} />
                </div>
              </div>

              <div style={styles.profileDetails}>
                <div style={styles.detailsLabel} className="mono-font">FULL NAME</div>
                <div style={styles.detailsName} className="hud-font">{employee.name}</div>
                
                <div style={{ ...styles.detailsLabel, marginTop: '8px' }} className="mono-font">DEPARTMENT // POSITION</div>
                <div style={styles.detailsInfo} className="mono-font">
                  {employee.department} // {employee.position}
                </div>

                <div style={styles.contactBlock} className="mono-font">
                  <div style={styles.contactItem}>
                    <Mail size={12} />
                    <span>{employee.email}</span>
                  </div>
                  <div style={styles.contactItem}>
                    <Phone size={12} />
                    <span>{employee.phoneNumber}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div style={styles.metricsGrid}>
            <div className="cyber-panel" style={styles.metricCard}>
              <div style={styles.metricHeader} className="mono-font">HOURS WORKED</div>
              <div style={styles.metricVal} className="hud-font">{calculateTotalHours()}</div>
            </div>

            <div className="cyber-panel" style={styles.metricCard}>
              <div style={styles.metricHeader} className="mono-font">ATTENDANCE RATE</div>
              <div style={styles.metricVal} className="hud-font">
                {records.length > 0 ? (((countStatus('PRESENT') + countStatus('LATE')) / records.length) * 100).toFixed(0) : '0'}%
              </div>
            </div>
          </div>

          {/* History Details */}
          <div className="cyber-panel" style={styles.historySection}>
            <div style={styles.cardHeaderPlate} className="mono-font">
              <Calendar size={12} />
              <span>ATTENDANCE RECORD LEDGER</span>
            </div>

            <div style={styles.recordsList}>
              {records.length > 0 ? (
                records.map((rec, idx) => (
                  <div key={idx} style={styles.recordRow} className="mono-font">
                    <div style={styles.recordLeft}>
                      <span style={styles.recordDate}>{rec.date}</span>
                      <span style={{ 
                        ...styles.statusBadge,
                        color: rec.status === 'LATE' ? '#eab308' : (rec.status === 'HALF_DAY' ? 'var(--color-text-secondary)' : 'var(--color-gold)'),
                        background: rec.status === 'LATE' ? 'rgba(234, 179, 8, 0.05)' : (rec.status === 'HALF_DAY' ? 'var(--color-border)' : 'var(--color-gold-bg)')
                      }}>{rec.status}</span>
                    </div>

                    <div style={styles.recordRight}>
                      <div style={styles.timeInfo}>
                        <Clock size={10} />
                        <span>In: {rec.checkInTime ? rec.checkInTime.substring(0, 5) : '--:--'}</span>
                        <span>Out: {rec.checkOutTime ? rec.checkOutTime.substring(0, 5) : '--:--'}</span>
                      </div>
                      <span style={styles.workHours}>{formatWorkingHours(rec.workingHours)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={styles.noRecords} className="mono-font">NO ATTENDANCE RECORDS FOUND</div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div style={styles.lockedContainer}>
          <div style={styles.lockedPanel} className="cyber-panel">
            <Fingerprint size={48} style={styles.lockIcon} className="anim-pulse" />
            <h3 style={styles.lockedTitle} className="hud-font">LOGIN/LOGOUT PORTAL SECURE LOGIN</h3>
            <p style={styles.lockedText}>To access your personal logs and attendance records, please authenticate with your Employee ID and Numeric Passcode PIN.</p>
            
            <form onSubmit={handleLoginInitiate} style={styles.loginForm}>
              <div style={styles.loginInputWrapper}>
                <input 
                  type="text" 
                  value={loginInputId}
                  onChange={(e) => setLoginInputId(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase())}
                  style={styles.loginInput}
                  className="mono-font"
                  disabled={loading}
                  maxLength={10}
                />
              </div>

              <div style={styles.loginInputWrapper}>
                <input 
                  type="text" 
                  value={loginPasscode}
                  readOnly
                  style={{ ...styles.loginInput, WebkitTextSecurity: 'disc', letterSpacing: '3px' }}
                  className="mono-font"
                  disabled={loading}
                />
              </div>

              {/* Number Lock keypad */}
              <div style={styles.keypadGrid}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    style={styles.keypadBtn}
                    onClick={() => {
                      if (loginPasscode.length < 6) {
                        setLoginPasscode(prev => prev + num);
                      }
                    }}
                    disabled={loading}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  style={{ ...styles.keypadBtn, color: 'var(--color-red)' }}
                  onClick={() => setLoginPasscode('')}
                  disabled={loading}
                >
                  CLR
                </button>
                <button
                  type="button"
                  style={styles.keypadBtn}
                  onClick={() => {
                    if (loginPasscode.length < 6) {
                      setLoginPasscode(prev => prev + '0');
                    }
                  }}
                  disabled={loading}
                >
                  0
                </button>
                <button
                  type="button"
                  style={styles.keypadBtn}
                  onClick={() => {
                    setLoginPasscode(prev => prev.slice(0, -1));
                  }}
                  disabled={loading}
                >
                  ⌫
                </button>
              </div>
              
              {loginError && (
                <div style={styles.loginErrorText} className="mono-font">
                  {loginError}
                </div>
              )}

              <button 
                type="submit" 
                style={{
                  ...styles.loginBtn,
                  opacity: loading ? 0.6 : 1,
                  marginTop: '10px'
                }}
                className="mono-font"
                disabled={loading}
              >
                {loading ? 'VALIDATING PIN...' : 'SECURE LOG IN'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const AlertCircle = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const styles = {
  container: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    flex: 1,
    overflowY: 'auto'
  },
  searchForm: {
    background: 'var(--color-bg-card)',
    display: 'flex',
    padding: '6px',
    borderRadius: '16px',
    border: '1px solid var(--color-border)',
    gap: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)'
  },
  searchInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingLeft: '12px',
    flex: 1
  },
  searchInput: {
    background: 'none',
    border: 'none',
    outline: 'none',
    color: 'var(--color-text-primary)',
    fontSize: '12px',
    flex: 1,
    letterSpacing: '1px'
  },
  searchBtn: {
    background: 'var(--color-gold)',
    border: 'none',
    color: '#ffffff',
    padding: '10px 20px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    letterSpacing: '0.5px',
    transition: 'all var(--transition-fast)'
  },
  errorBanner: {
    background: 'var(--color-red-bg)',
    border: '1px solid var(--color-red-border)',
    color: 'var(--color-red)',
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '11px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    letterSpacing: '0.5px'
  },
  verificationSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    margin: '12px 0'
  },
  reticleFrame: {
    width: '110px',
    height: '110px',
    border: '1px solid var(--color-gold-border)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: '16px',
    background: 'transparent',
    borderRadius: '16px'
  },
  checkmarkCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    border: '2px solid var(--color-gold)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'var(--color-gold-bg)'
  },
  cornerTL: {
    position: 'absolute',
    top: '-2px', left: '-2px',
    width: '14px', height: '14px',
    borderTop: '2.5px solid var(--color-gold)',
    borderLeft: '2.5px solid var(--color-gold)',
    borderTopLeftRadius: '6px'
  },
  cornerTR: {
    position: 'absolute',
    top: '-2px', right: '-2px',
    width: '14px', height: '14px',
    borderTop: '2.5px solid var(--color-gold)',
    borderRight: '2.5px solid var(--color-gold)',
    borderTopRightRadius: '6px'
  },
  cornerBL: {
    position: 'absolute',
    bottom: '-2px', left: '-2px',
    width: '14px', height: '14px',
    borderBottom: '2.5px solid var(--color-gold)',
    borderLeft: '2.5px solid var(--color-gold)',
    borderBottomLeftRadius: '6px'
  },
  cornerBR: {
    position: 'absolute',
    bottom: '-2px', right: '-2px',
    width: '14px', height: '14px',
    borderBottom: '2.5px solid var(--color-gold)',
    borderRight: '2.5px solid var(--color-gold)',
    borderBottomRightRadius: '6px'
  },
  accessAuthorized: {
    color: 'var(--color-gold)',
    fontSize: '22px',
    fontWeight: '900',
    letterSpacing: '1px',
    margin: '0 0 6px 0',
    textTransform: 'uppercase'
  },
  identityVerification: {
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
    letterSpacing: '0.5px',
    margin: '0',
    textTransform: 'uppercase',
    fontWeight: '600'
  },
  profileSection: {
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '16px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
  },
  cardHeaderPlate: {
    background: 'var(--color-bg-card-hover)',
    color: 'var(--color-text-primary)',
    padding: '10px 16px',
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--color-border)',
    borderTopLeftRadius: '16px',
    borderTopRightRadius: '16px'
  },
  profileCard: {
    padding: '20px',
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  avatarWrapper: {
    position: 'relative',
    width: '84px',
    height: '84px',
    border: '1px solid var(--color-border)',
    borderRadius: '16px',
    overflow: 'hidden',
    flexShrink: 0
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  avatarSubBadge: {
    position: 'absolute',
    bottom: '0',
    right: '0',
    background: 'var(--color-gold)',
    padding: '5px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: '8px'
  },
  profileDetails: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  },
  detailsLabel: {
    fontSize: '9px',
    color: 'var(--color-text-muted)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    fontWeight: '600'
  },
  detailsName: {
    fontSize: '20px',
    fontWeight: '800',
    color: 'var(--color-text-primary)',
    letterSpacing: '0.5px'
  },
  detailsInfo: {
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
    marginTop: '2px',
    fontWeight: '500'
  },
  contactBlock: {
    display: 'flex',
    gap: '16px',
    marginTop: '10px',
    fontSize: '11px',
    color: 'var(--color-text-secondary)',
    flexWrap: 'wrap'
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px'
  },
  metricCard: {
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
  },
  metricHeader: {
    fontSize: '9px',
    color: 'var(--color-text-secondary)',
    letterSpacing: '0.5px',
    fontWeight: '600'
  },
  metricVal: {
    fontSize: '22px',
    fontWeight: '800',
    color: 'var(--color-text-primary)'
  },
  historySection: {
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '16px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
  },
  recordsList: {
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '220px',
    overflowY: 'auto'
  },
  recordRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '12px',
    transition: 'background-color var(--transition-fast)'
  },
  recordLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  recordDate: {
    color: 'var(--color-text-primary)',
    fontWeight: '600'
  },
  statusBadge: {
    fontSize: '9px',
    padding: '2px 8px',
    borderRadius: '6px',
    fontWeight: '700',
    letterSpacing: '0.5px'
  },
  recordRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  timeInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--color-text-secondary)'
  },
  workHours: {
    fontWeight: '700',
    color: 'var(--color-text-primary)'
  },
  noRecords: {
    padding: '30px 20px',
    textAlign: 'center',
    fontSize: '12px',
    color: 'var(--color-text-muted)'
  },
  lockedContainer: {
    padding: '60px 20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1
  },
  lockedPanel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '40px 24px',
    background: 'var(--color-bg-card)',
    maxWidth: '340px',
    borderRadius: '20px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)'
  },
  lockIcon: {
    color: 'var(--color-gold-border)',
    marginBottom: '20px'
  },
  lockedTitle: {
    fontSize: '15px',
    color: 'var(--color-text-primary)',
    letterSpacing: '1px',
    marginBottom: '8px',
    fontWeight: '800'
  },
  lockedText: {
    fontSize: '11px',
    color: 'var(--color-text-secondary)',
    lineHeight: '1.5',
    marginBottom: '16px'
  },
  loginForm: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  loginInputWrapper: {
    background: 'var(--color-bg-deep)',
    border: '1px solid var(--color-border)',
    borderRadius: '10px',
    padding: '4px 10px',
    display: 'flex',
    alignItems: 'center'
  },
  loginInput: {
    background: 'none',
    border: 'none',
    outline: 'none',
    color: 'var(--color-text-primary)',
    fontSize: '12px',
    padding: '8px 4px',
    width: '100%',
    textAlign: 'center',
    letterSpacing: '1px'
  },
  loginErrorText: {
    color: 'var(--color-red)',
    fontSize: '9px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    marginTop: '-4px',
    textAlign: 'center'
  },
  loginBtn: {
    background: 'var(--color-gold)',
    border: 'none',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    transition: 'all var(--transition-fast)'
  },
  keypadGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '6px',
    marginTop: '8px',
    width: '100%',
    maxWidth: '240px',
    margin: '10px auto'
  },
  keypadBtn: {
    background: 'var(--color-bg-card-hover)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    borderRadius: '10px',
    padding: '10px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all var(--transition-fast)',
    outline: 'none'
  }
};


