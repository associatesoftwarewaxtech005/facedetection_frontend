import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../config/api';
import { 
  Users, Calendar, BarChart3, Settings, ShieldAlert, Plus, Trash2, Edit2, LogOut, Check, X, 
  Camera, Download, Printer, ShieldCheck, Mail, Phone, Clock, AlertTriangle, Eye, Terminal, FileClock 
} from 'lucide-react';
import { ProfileAvatar } from '../config/avatar';

const formatWorkingHours = (decimalHours) => {
  if (decimalHours === null || decimalHours === undefined) return '0h 0m';
  const totalMinutes = Math.round(decimalHours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
};

export default function AdminPanel({ soundEnabled, initialTab = 'employees' }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Primary Tab state: 'employees', 'attendance', 'analytics', 'settings'
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Input focus states
  const [focusUser, setFocusUser] = useState(false);
  const [focusPass, setFocusPass] = useState(false);

  // Employee CRUD states
  const [employees, setEmployees] = useState([]);
  const [empIdInput, setEmpIdInput] = useState('');
  const [empName, setEmpName] = useState('');
  const [empDept, setEmpDept] = useState('Engineering');
  const [empPos, setEmpPos] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empStatus, setEmpStatus] = useState('ACTIVE');
  const [empRole, setEmpRole] = useState('EMPLOYEE');
  const [empPasscode, setEmpPasscode] = useState('1234');

  // Focus states for employee registration form
  const [fId, setFId] = useState(false);
  const [fName, setFName] = useState(false);
  const [fPos, setFPos] = useState(false);
  const [fEmail, setFEmail] = useState(false);
  const [fPhone, setFPhone] = useState(false);
  const [fPasscode, setFPasscode] = useState(false);

  // Editing Employee state
  const [editingEmpId, setEditingEmpId] = useState(null);
  const [editEmpName, setEditEmpName] = useState('');
  const [editEmpDept, setEditEmpDept] = useState('Engineering');
  const [editEmpPos, setEditEmpPos] = useState('');
  const [editEmpEmail, setEditEmpEmail] = useState('');
  const [editEmpPhone, setEditEmpPhone] = useState('');
  const [editEmpStatus, setEditEmpStatus] = useState('ACTIVE');
  const [editEmpRole, setEditEmpRole] = useState('EMPLOYEE');
  const [editEmpPasscode, setEditEmpPasscode] = useState('');

  // Biometric registration states (Webcam Modal)
  const [cameraEmployee, setCameraEmployee] = useState(null);
  const [stream, setStream] = useState(null);
  const [capturedFrames, setCapturedFrames] = useState([]); // Base64 thumbnails
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef(null);

  // Attendance Ledger states
  const [attendance, setAttendance] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  
  // Attendance Editing state
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editRecordStatus, setEditRecordStatus] = useState('PRESENT');

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: 'CONFIRM ACTION',
    message: '',
    onConfirm: null
  });

  // Clear search filter when tab changes
  useEffect(() => {
    setSearchQuery('');
    setFilterStatus('ALL');
  }, [activeTab]);

  // Analytics states
  const [analytics, setAnalytics] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    presentToday: 0,
    lateToday: 0,
    absentToday: 0,
    avgWorkingHours: 8.0,
    weeklyTrend: [],
    departmentBreakdown: {}
  });

  // Settings & Notifications states
  const [notifications, setNotifications] = useState([]);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [spoofAlerts, setSpoofAlerts] = useState(true);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [employeeSessions, setEmployeeSessions] = useState([]);
  const [systemAudits, setSystemAudits] = useState([]);

  // ==========================================
  // COMPONENT LIFECYCLE & FETCHING
  // ==========================================
  const loadDashboardData = async () => {
    try {
      // Fetch Employees
      const empRes = await apiFetch('/api/admin/employees');
      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData);
      }

      // Fetch Attendance Records
      const attRes = await apiFetch('/api/admin/attendance');
      if (attRes.ok) {
        const attData = await attRes.json();
        setAttendance(attData);
      }

      // Fetch Analytics
      const anaRes = await apiFetch('/api/admin/analytics');
      if (anaRes.ok) {
        const anaData = await anaRes.json();
        setAnalytics(anaData);
      }

      // Fetch Notifications
      const notifRes = await apiFetch('/api/notifications');
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData);
      }

      // Fetch Security Logs
      const secLogsRes = await apiFetch('/api/admin/security-logs');
      if (secLogsRes.ok) {
        const secLogsData = await secLogsRes.json();
        setSecurityLogs(secLogsData);
      }

      // Fetch Employee Sessions
      const essRes = await apiFetch('/api/admin/employee-sessions');
      if (essRes.ok) {
        const essData = await essRes.json();
        setEmployeeSessions(essData);
      }

      // Fetch System Audits
      const sysAudRes = await apiFetch('/api/logs');
      if (sysAudRes.ok) {
        const sysAudData = await sysAudRes.json();
        setSystemAudits([...sysAudData].reverse());
      }
    } catch (err) {
      console.warn("Unable to fetch administrator data:", err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadDashboardData();
      const interval = setInterval(loadDashboardData, 8000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  // ==========================================
  // SECURITY & SYSTEM AUTH
  // ==========================================
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await apiFetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setIsLoggedIn(true);
      } else {
        setErrorMsg(data.message || 'CRITICAL: ACCESS KEY INVALID');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('CRITICAL: CONNECTION TIMEOUT');
    }
  };

  const handleLogoutClick = () => {
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
  };

  // ==========================================
  // EMPLOYEE REGISTRY MANAGEMENT
  // ==========================================
  const handleAddEmployeeSubmit = async (e) => {
    e.preventDefault();
    if (!empIdInput.trim() || !empName.trim()) return;

    // Strict Javascript validations
    const empIdRegex = /^[a-zA-Z]{2}\d+$/;
    if (!empIdRegex.test(empIdInput) || empIdInput.length < 3) {
      alert("Employee ID must start with exactly 2 letters followed only by numbers (e.g. EP10005).");
      return;
    }

    if (/\d/.test(empPos)) {
      alert("Position cannot contain numbers or zero.");
      return;
    }

    if (empPhone.replace(/\D/g, '').length !== 10) {
      alert("Phone number must be exactly 10 digits.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(empEmail)) {
      alert("Please enter a valid email address (e.g. name@axon.io).");
      return;
    }

    const payload = {
      employeeId: empIdInput,
      name: empName,
      department: empDept,
      position: empPos,
      email: empEmail,
      phoneNumber: empPhone,
      status: empStatus,
      role: empRole,
      passcode: empPasscode
    };

    try {
      const res = await apiFetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const savedEmployee = await res.json();
        setEmpIdInput('');
        setEmpName('');
        setEmpPos('');
        setEmpEmail('');
        setEmpPhone('');
        setEmpPasscode('1234');
        loadDashboardData();
        // Automatically trigger biometric face registration modal
        startCamera(savedEmployee);
      } else {
        const data = await res.json();
        alert(data.message || "Failed to create employee.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEditEmployee = (emp) => {
    setEditingEmpId(emp.id);
    setEditEmpName(emp.name);
    setEditEmpDept(emp.department);
    setEditEmpPos(emp.position);
    setEditEmpEmail(emp.email || '');
    setEditEmpPhone(emp.phoneNumber || '');
    setEditEmpStatus(emp.status);
    setEditEmpRole(emp.role);
    setEditEmpPasscode(emp.passcode || '');
  };

  const saveEmployeeEdit = async (id) => {
    if (!editEmpName.trim()) return;

    // Strict Javascript validations
    if (/\d/.test(editEmpPos)) {
      alert("Position cannot contain numbers or zero.");
      return;
    }

    if (editEmpPhone.replace(/\D/g, '').length !== 10) {
      alert("Phone number must be exactly 10 digits.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmpEmail)) {
      alert("Please enter a valid email address (e.g. name@axon.io).");
      return;
    }

    try {
      const payload = {
        name: editEmpName,
        department: editEmpDept,
        position: editEmpPos,
        email: editEmpEmail,
        phoneNumber: editEmpPhone,
        status: editEmpStatus,
        role: editEmpRole,
        passcode: editEmpPasscode
      };
      const res = await apiFetch(`/api/admin/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updatedEmp = await res.json();
        // Optimistic state update
        setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, ...updatedEmp } : emp));
        setEditingEmpId(null);
        loadDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEmployee = (id) => {
    const emp = employees.find(e => e.id === id);
    setConfirmModal({
      isOpen: true,
      title: 'DELETE STAFF MEMBER',
      message: `ARE YOU SURE YOU WANT TO PERMANENTLY DELETE ${emp?.name.toUpperCase()} (${emp?.employeeId}) AND ALL ASSOCIATED BIOMETRICS/LOGS?`,
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/admin/employees/${id}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            setEmployees(prev => prev.filter(e => e.id !== id));
            loadDashboardData();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // ==========================================
  // BIOMETRIC REGISTRATION WEBCAM FLOW
  // ==========================================
  const startCamera = async (employee) => {
    setCameraEmployee(employee);
    setCapturedFrames([]);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 320 }
      });
      setStream(mediaStream);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      }, 200);
    } catch (err) {
      console.error(err);
      alert("Webcam camera access failed.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraEmployee(null);
    loadDashboardData();
  };

  const captureFrame = async () => {
    if (!videoRef.current) return;
    setCapturing(true);
    
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, 320, 320);
    const base64 = canvas.toDataURL('image/jpeg');

    // Generate mock embedding signature
    const embedding = [];
    const getSeedFromId = (id) => {
      if (!id) return 0.5;
      let hash = 0;
      for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
      }
      return Math.abs(hash % 100) / 120 + 0.1;
    };
    const seed = getSeedFromId(cameraEmployee.employeeId);
    for (let i = 0; i < 128; i++) {
      embedding.push(Math.sin(i * seed) * 0.5 + 0.5);
    }

    try {
      const res = await apiFetch(`/api/admin/employees/${cameraEmployee.id}/faces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faceImage: base64,
          embedding: `[${embedding.toString()}]`
        })
      });
      
      if (res.ok) {
        // Save to localStorage so the simulator can automatically detect this face
        localStorage.setItem('simulated_face_employee_id', cameraEmployee.employeeId);
        localStorage.setItem('simulated_face_embedding', embedding.toString());
        localStorage.setItem('simulated_face_name', cameraEmployee.name);

        setCapturedFrames(prev => [...prev, base64]);
        loadDashboardData();
        if (soundEnabled) {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.frequency.value = 1000;
          gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.1);
        }
      } else {
        const data = await res.json();
        alert(data.message || "Failed to register face biometrics.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCapturing(false);
    }
  };

  // ==========================================
  // ATTENDANCE LEDGER ACTIONS
  // ==========================================
  const startEditRecord = (rec) => {
    setEditingRecordId(rec.id);
    setEditCheckIn(rec.checkInTime ? rec.checkInTime.substring(0, 5) : '');
    setEditCheckOut(rec.checkOutTime ? rec.checkOutTime.substring(0, 5) : '');
    setEditRecordStatus(rec.status);
  };

  const saveRecordEdit = async (id) => {
    try {
      const res = await apiFetch(`/api/admin/attendance/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkInTime: editCheckIn ? editCheckIn + ":00" : null,
          checkOutTime: editCheckOut ? editCheckOut + ":00" : null,
          status: editRecordStatus
        })
      });
      if (res.ok) {
        const updatedRec = await res.json();
        // Optimistic local state update
        setAttendance(prev => prev.map(rec => rec.id === id ? updatedRec : rec));
        setEditingRecordId(null);
        setEditCheckIn('');
        setEditCheckOut('');
        setEditRecordStatus('PRESENT');
        loadDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // EXPORT EXCEL (CSV Format)
  const exportToCSV = () => {
    if (filteredAttendance.length === 0) {
      alert("No data available to download.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Employee ID,Name,Department,Check-In,Check-Out,Hours Worked,Status,Liveness Verified\n";
    
    filteredAttendance.forEach(rec => {
      const row = [
        rec.date,
        rec.employee.employeeId,
        rec.employee.name,
        rec.employee.department,
        rec.checkInTime || "--:--",
        rec.checkOutTime || "--:--",
        rec.workingHours || "0.0",
        rec.status,
        rec.livenessVerified ? "YES" : "NO"
      ].map(field => `"${field}"`).join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_report_${LocalDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSessionsToCSV = () => {
    const q = searchQuery.toLowerCase();
    const filteredSessions = employeeSessions.filter(sess => {
      return (sess.employeeName && sess.employeeName.toLowerCase().includes(q)) || 
             (sess.employeeId && sess.employeeId.toLowerCase().includes(q));
    });

    if (filteredSessions.length === 0) {
      alert("No data available to download.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Timestamp,Employee ID,Employee Name,Action\n";
    
    filteredSessions.forEach(sess => {
      const row = [
        sess.timestamp,
        sess.employeeId,
        sess.employeeName,
        sess.action
      ].map(field => `"${field}"`).join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `employee_portal_sessions_${LocalDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAuditsToCSV = () => {
    const q = searchQuery.toLowerCase();
    const filteredAudits = systemAudits.filter(aud => {
      return (aud.message && aud.message.toLowerCase().includes(q)) || 
             (aud.type && aud.type.toLowerCase().includes(q)) ||
             (aud.timestamp && aud.timestamp.toLowerCase().includes(q));
    });

    if (filteredAudits.length === 0) {
      alert("No data available to download.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Timestamp,Log Type,Message\n";
    
    filteredAudits.forEach(aud => {
      const row = [
        aud.timestamp,
        aud.type,
        aud.message
      ].map(field => `"${field}"`).join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `system_security_audits_${LocalDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteLog = (id) => {
    const log = systemAudits.find(l => l.id === id);
    setConfirmModal({
      isOpen: true,
      title: 'PURGE AUDIT LOG ENTRY',
      message: `ARE YOU SURE YOU WANT TO PERMANENTLY DELETE THE AUDIT LOG ENTRY FROM [${log?.timestamp}]?`,
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/logs/${id}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            setSystemAudits(prev => prev.filter(log => log.id !== id));
          } else {
            alert('FAILED TO PURGE LOG.');
          }
        } catch (err) {
          console.error(err);
          alert('DATABASE COMMUNICATION ERROR.');
        }
      }
    });
  };

  // EXPORT PDF (Browser Printable layout)
  const exportToPDF = () => {
    if (filteredAttendance.length === 0) {
      alert("No data available to download.");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to generate the PDF report.");
      return;
    }

    let html = `
      <html>
        <head>
          <title>Attendance Report - ${LocalDateString()}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #0F172A; }
            .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #E2E8F0; padding-bottom: 16px; }
            h1 { font-size: 22px; margin: 0; color: #0F172A; text-transform: uppercase; letter-spacing: 1px; }
            .meta { font-size: 11px; color: #64748B; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #E2E8F0; padding: 10px 12px; text-align: left; font-size: 11px; }
            th { background-color: #F8FAFC; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
            tr:nth-child(even) td { background-color: #F9FAFB; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase; }
            .badge-present { background-color: #E6F4EA; color: #137333; }
            .badge-late { background-color: #FEF7E0; color: #B06000; }
            .badge-half-day { background-color: #F1F3F4; color: #5F6368; }
            .badge-absent { background-color: #FCE8E6; color: #C5221F; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <h1>Security Pro - Attendance Report</h1>
              <div class="meta" style="margin-top: 6px;">
                Generated: ${new Date().toLocaleString()}<br/>
                Filter Category: ${filterStatus.toUpperCase()}
              </div>
            </div>
            <div class="meta" style="text-align: right;">
              Total Records: ${filteredAttendance.length}<br/>
              Report Type: SECURE SYSTEMS
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
    `;

    filteredAttendance.forEach(rec => {
      let badgeClass = 'badge-present';
      if (rec.status === 'LATE') badgeClass = 'badge-late';
      else if (rec.status === 'HALF_DAY') badgeClass = 'badge-half-day';
      else if (rec.status === 'ABSENT') badgeClass = 'badge-absent';

      html += `
        <tr>
          <td><strong>${rec.date}</strong></td>
          <td>${rec.employee.employeeId}</td>
          <td>${rec.employee.name}</td>
          <td>${rec.employee.department}</td>
          <td>${rec.checkInTime ? rec.checkInTime.substring(0, 5) : '--:--'}</td>
          <td>${rec.checkOutTime ? rec.checkOutTime.substring(0, 5) : '--:--'}</td>
          <td>${rec.workingHours ? rec.workingHours.toFixed(2) : '0.00'}</td>
          <td><span class="badge ${badgeClass}">${rec.status.replace('_', ' ')}</span></td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const LocalDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // ==========================================
  // NOTIFICATIONS ACTIONS
  // ==========================================
  const clearNotifications = async () => {
    try {
      const res = await apiFetch('/api/notifications/read', { method: 'POST' });
      if (res.ok) {
        loadDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // RENDERING LAYOUT
  // ==========================================
  if (!isLoggedIn) {
    return (
      <div style={styles.loginContainer}>
        <form onSubmit={handleLoginSubmit} style={styles.loginForm} className="cyber-panel">
          <div style={styles.cardHeaderPlate} className="mono-font">
            <ShieldAlert size={12} style={{ color: 'var(--color-gold)' }} />
            <span>ADMINISTRATIVE PORTAL GATE</span>
          </div>
          
          <div style={styles.formContent}>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel} className="mono-font">SECURITY USERNAME</label>
              <input 
                type="text" 
                style={{
                  ...styles.inputField,
                  border: focusUser ? '1px solid var(--color-gold)' : 'none',
                  borderBottom: focusUser ? '1px solid var(--color-gold)' : '1px solid var(--color-border-bright)'
                }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocusUser(true)}
                onBlur={() => setFocusUser(false)}
                className="mono-font"
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel} className="mono-font">SECURITY PASSWORD</label>
              <input 
                type="password" 
                style={{
                  ...styles.inputField,
                  border: focusPass ? '1px solid var(--color-gold)' : 'none',
                  borderBottom: focusPass ? '1px solid var(--color-gold)' : '1px solid var(--color-border-bright)'
                }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusPass(true)}
                onBlur={() => setFocusPass(false)}
                className="mono-font"
                required
              />
            </div>

            {errorMsg && (
              <div style={styles.errorText} className="mono-font">
                {errorMsg}
              </div>
            )}

            <button type="submit" style={styles.primaryBtn} className="mono-font">
              DECRYPT CONTROL SUITE
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Filtered attendance records for search queries
  const filteredAttendance = attendance.filter(rec => {
    const query = searchQuery.toLowerCase();
    const matchesQuery = rec.employee.name.toLowerCase().includes(query) || 
                         rec.employee.employeeId.toLowerCase().includes(query) ||
                         rec.employee.department.toLowerCase().includes(query);
    const matchesStatus = filterStatus === 'ALL' || rec.status.toUpperCase() === filterStatus.toUpperCase();
    return matchesQuery && matchesStatus;
  });

  return (
    <div style={styles.container}>
      {/* Sticky Header + Tab Bar wrapper */}
      <div style={{ flexShrink: 0, padding: '24px 24px 0 24px' }}>
      {/* Header Info */}
      <div style={styles.buttonBar}>
        <div style={styles.sessionStatus} className="mono-font">
          <span style={styles.greenDot} className="anim-pulse" />
          <span>PORTAL SUITE ACTIVE</span>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogoutClick} className="mono-font">
          <LogOut size={12} />
          <span>LOCK CONSOLE</span>
        </button>
      </div>

      {/* Main Tabs Selector */}
      <div style={styles.subTabContainer}>
        <button 
          style={{
            ...styles.subTabButton,
            borderBottom: activeTab === 'employees' ? '2px solid var(--color-gold)' : 'none',
            color: activeTab === 'employees' ? 'var(--color-gold)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'employees' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('employees')}
          className="mono-font"
        >
          <Users size={12} />
          <span>STAFF REGISTRY</span>
        </button>
        <button 
          style={{
            ...styles.subTabButton,
            borderBottom: activeTab === 'attendance' ? '2px solid var(--color-gold)' : 'none',
            color: activeTab === 'attendance' ? 'var(--color-gold)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'attendance' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('attendance')}
          className="mono-font"
        >
          <Calendar size={12} />
          <span>LEDGER</span>
        </button>
        <button 
          style={{
            ...styles.subTabButton,
            borderBottom: activeTab === 'analytics' ? '2px solid var(--color-gold)' : 'none',
            color: activeTab === 'analytics' ? 'var(--color-gold)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'analytics' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('analytics')}
          className="mono-font"
        >
          <BarChart3 size={12} />
          <span>ANALYTICS</span>
        </button>
        <button 
          style={{
            ...styles.subTabButton,
            borderBottom: activeTab === 'sessions' ? '2px solid var(--color-gold)' : 'none',
            color: activeTab === 'sessions' ? 'var(--color-gold)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'sessions' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('sessions')}
          className="mono-font"
        >
          <FileClock size={12} />
          <span>PORTAL SESSIONS</span>
        </button>
        <button 
          style={{
            ...styles.subTabButton,
            borderBottom: activeTab === 'audits' ? '2px solid var(--color-gold)' : 'none',
            color: activeTab === 'audits' ? 'var(--color-gold)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'audits' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('audits')}
          className="mono-font"
        >
          <Terminal size={12} />
          <span>SYSTEM AUDITS</span>
        </button>
        <button 
          style={{
            ...styles.subTabButton,
            borderBottom: activeTab === 'settings' ? '2px solid var(--color-gold)' : 'none',
            color: activeTab === 'settings' ? 'var(--color-gold)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'settings' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('settings')}
          className="mono-font"
        >
          <Settings size={12} />
          <span>SYSTEM</span>
        </button>
        <button 
          style={{
            ...styles.subTabButton,
            borderBottom: activeTab === 'security' ? '2px solid var(--color-gold)' : 'none',
            color: activeTab === 'security' ? 'var(--color-gold)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'security' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('security')}
          className="mono-font"
        >
          <ShieldAlert size={12} />
          <span>SECURITY LOGS</span>
        </button>
      </div>
      </div>{/* end sticky header wrapper */}

      {/* Scrollable Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 24px 24px' }}>
      {/* Dynamic Tab Panels */}
      
      {/* 1. EMPLOYEES TAB */}
      {activeTab === 'employees' && (
        <>
          {/* Register face Camera Modal overlay */}
          {cameraEmployee && (
            <div style={styles.modalOverlay}>
              <div className="cyber-panel" style={styles.modalContent}>
                <div style={styles.cardHeaderPlate} className="mono-font">
                  <Camera size={12} />
                  <span>BIOMETRIC FACE REGISTER // {cameraEmployee.name}</span>
                  <button onClick={stopCamera} style={{ background: 'none', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                    <X size={14} />
                  </button>
                </div>
                
                <div style={styles.modalBody}>
                  <div style={styles.modalWebcamWrapper}>
                    <video ref={videoRef} autoPlay playsInline muted style={styles.modalVideo} />
                    <div style={styles.modalScannerLine} />
                  </div>

                  <div style={styles.modalActions}>
                    <button 
                      onClick={captureFrame} 
                      disabled={capturing || capturedFrames.length >= 3} 
                      style={{
                        ...styles.modalCaptureBtn,
                        background: (capturing || capturedFrames.length >= 3) ? 'rgba(255, 255, 255, 0.05)' : 'var(--color-gold)',
                        color: (capturing || capturedFrames.length >= 3) ? 'var(--color-text-secondary)' : '#ffffff',
                        border: (capturing || capturedFrames.length >= 3) ? '1px solid var(--color-border)' : 'none',
                        cursor: (capturing || capturedFrames.length >= 3) ? 'not-allowed' : 'pointer'
                      }} 
                      className="mono-font"
                    >
                      {capturing ? "RECORDING..." : capturedFrames.length >= 3 ? "SAMPLES COMPLETE" : "CAPTURE WEB FRAME"}
                    </button>
                    <button 
                      onClick={stopCamera} 
                      disabled={capturedFrames.length < 3} 
                      style={{
                        ...styles.modalCloseBtn,
                        background: (capturedFrames.length < 3) ? 'rgba(255, 255, 255, 0.02)' : 'var(--color-gold-bg)',
                        color: (capturedFrames.length < 3) ? 'var(--color-text-muted)' : 'var(--color-gold)',
                        border: (capturedFrames.length < 3) ? '1px dashed var(--color-border)' : '1px solid var(--color-gold-border)',
                        cursor: (capturedFrames.length < 3) ? 'not-allowed' : 'pointer',
                        fontWeight: (capturedFrames.length < 3) ? '500' : '700'
                      }} 
                      className="mono-font"
                    >
                      FINISH REGISTRATION
                    </button>
                  </div>

                  {/* Captured Thumbnails Grid */}
                  <div style={styles.thumbnailWrapper}>
                    <span className="mono-font" style={styles.thumbnailLabel}>Captured Samples: {capturedFrames.length} / 3</span>
                    <div style={styles.thumbnailGrid}>
                      {capturedFrames.map((frame, fIdx) => (
                        <img key={fIdx} src={frame} alt={`captured ${fIdx}`} style={styles.thumbnailImg} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Employee Form */}
          <div className="cyber-panel" style={styles.panelSection}>
            <div style={styles.cardHeaderPlate} className="mono-font">
              <Plus size={12} />
              <span>REGISTER NEW SYSTEM STAFF</span>
            </div>
            <form onSubmit={handleAddEmployeeSubmit} style={styles.addForm}>
              <div style={styles.formRow}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.inputLabel} className="mono-font">EMPLOYEE ID</label>
                  <input 
                    type="text" 
                    style={{
                      ...styles.inputField,
                      border: fId ? '1px solid var(--color-gold)' : 'none',
                      borderBottom: fId ? '1px solid var(--color-gold)' : '1px solid var(--color-border-bright)'
                    }}
                    value={empIdInput}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                      let formatted = '';
                      for (let i = 0; i < clean.length; i++) {
                        const char = clean[i];
                        if (i < 2) {
                          if (/[a-zA-Z]/.test(char)) formatted += char.toUpperCase();
                        } else {
                          if (/[0-9]/.test(char)) formatted += char;
                        }
                      }
                      setEmpIdInput(formatted);
                    }}
                    onFocus={() => setFId(true)}
                    onBlur={() => setFId(false)}
                    className="mono-font"
                    required
                    maxLength={10}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 2 }}>
                  <label style={styles.inputLabel} className="mono-font">FULL NAME</label>
                  <input 
                    type="text" 
                    style={{
                      ...styles.inputField,
                      border: fName ? '1px solid var(--color-gold)' : 'none',
                      borderBottom: fName ? '1px solid var(--color-gold)' : '1px solid var(--color-border-bright)'
                    }}
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value.replace(/[^a-zA-Z\s.'-]/g, ''))}
                    onFocus={() => setFName(true)}
                    onBlur={() => setFName(false)}
                    className="mono-font"
                    required
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.inputLabel} className="mono-font">DEPARTMENT</label>
                  <select 
                    value={empDept} 
                    onChange={(e) => setEmpDept(e.target.value)}
                    style={styles.selectField}
                    className="mono-font"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Operations">Operations</option>
                    <option value="Security">Security</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.inputLabel} className="mono-font">POSITION</label>
                  <input 
                    type="text" 
                    style={{
                      ...styles.inputField,
                      border: fPos ? '1px solid var(--color-gold)' : 'none',
                      borderBottom: fPos ? '1px solid var(--color-gold)' : '1px solid var(--color-border-bright)'
                    }}
                    value={empPos}
                    onChange={(e) => setEmpPos(e.target.value.replace(/[^a-zA-Z\s.\-/()]/g, ''))}
                    onFocus={() => setFPos(true)}
                    onBlur={() => setFPos(false)}
                    className="mono-font"
                    required
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.inputLabel} className="mono-font">EMAIL ADDRESS</label>
                  <input 
                    type="email" 
                    style={{
                      ...styles.inputField,
                      border: fEmail ? '1px solid var(--color-gold)' : 'none',
                      borderBottom: fEmail ? '1px solid var(--color-gold)' : '1px solid var(--color-border-bright)'
                    }}
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value.replace(/[^a-zA-Z0-9@._\-+]/g, ''))}
                    onFocus={() => setFEmail(true)}
                    onBlur={() => setFEmail(false)}
                    className="mono-font"
                    required
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.inputLabel} className="mono-font">PHONE NUMBER</label>
                  <input 
                    type="text" 
                    style={{
                      ...styles.inputField,
                      border: fPhone ? '1px solid var(--color-gold)' : 'none',
                      borderBottom: fPhone ? '1px solid var(--color-gold)' : '1px solid var(--color-border-bright)'
                    }}
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value.replace(/\D/g, ''))}
                    onFocus={() => setFPhone(true)}
                    onBlur={() => setFPhone(false)}
                    className="mono-font"
                    required
                    maxLength={10}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.inputLabel} className="mono-font">STATUS</label>
                  <select 
                    value={empStatus} 
                    onChange={(e) => setEmpStatus(e.target.value)}
                    style={styles.selectField}
                    className="mono-font"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.inputLabel} className="mono-font">ROLE</label>
                  <select 
                    value={empRole} 
                    onChange={(e) => setEmpRole(e.target.value)}
                    style={styles.selectField}
                    className="mono-font"
                  >
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.inputLabel} className="mono-font">PASSWORD / PIN</label>
                  <input 
                    type="text" 
                    style={{
                      ...styles.inputField,
                      border: fPasscode ? '1px solid var(--color-gold)' : 'none',
                      borderBottom: fPasscode ? '1px solid var(--color-gold)' : '1px solid var(--color-border-bright)'
                    }}
                    value={empPasscode}
                    onChange={(e) => setEmpPasscode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                    onFocus={() => setFPasscode(true)}
                    onBlur={() => setFPasscode(false)}
                    className="mono-font"
                    required
                  />
                </div>
              </div>
              
              <button type="submit" style={styles.primaryBtn} className="mono-font">
                SAVE STAFF MEMBER PROFILE
              </button>
            </form>
          </div>

          {/* Employees List */}
          <div className="cyber-panel" style={{ ...styles.panelSection, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={styles.cardHeaderPlate} className="mono-font">
              <span>ACTIVE STAFF DIRECTORY</span>
            </div>
            
            <div style={styles.dbList}>
              {employees.map((emp) => (
                <div key={emp.id} style={editingEmpId === emp.id ? { ...styles.dbRow, flexDirection: 'column', alignItems: 'stretch', height: 'auto', minHeight: 'auto', padding: '16px' } : styles.dbRow}>
                  {editingEmpId === emp.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '10px', padding: '10px 0' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
                          <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontWeight: 'bold' }} className="mono-font">FULL NAME</span>
                          <input 
                            type="text" 
                            style={{ ...styles.inputField, margin: 0 }}
                            value={editEmpName}
                            onChange={(e) => setEditEmpName(e.target.value.replace(/[^a-zA-Z\s.'-]/g, ''))}
                            className="mono-font"
                          />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
                          <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontWeight: 'bold' }} className="mono-font">POSITION</span>
                          <input 
                            type="text" 
                            style={{ ...styles.inputField, margin: 0 }}
                            value={editEmpPos}
                            onChange={(e) => setEditEmpPos(e.target.value.replace(/[^a-zA-Z\s.\-/()]/g, ''))}
                            className="mono-font"
                          />
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
                          <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontWeight: 'bold' }} className="mono-font">DEPARTMENT</span>
                          <select 
                            value={editEmpDept} 
                            onChange={(e) => setEditEmpDept(e.target.value)}
                            style={{ ...styles.selectField, width: '100%' }}
                            className="mono-font"
                          >
                            <option value="Engineering">Engineering</option>
                            <option value="Human Resources">Human Resources</option>
                            <option value="Operations">Operations</option>
                            <option value="Security">Security</option>
                            <option value="Marketing">Marketing</option>
                          </select>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
                          <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontWeight: 'bold' }} className="mono-font">ROLE</span>
                          <select 
                            value={editEmpRole} 
                            onChange={(e) => setEditEmpRole(e.target.value)}
                            style={{ ...styles.selectField, width: '100%' }}
                            className="mono-font"
                          >
                            <option value="EMPLOYEE">EMPLOYEE</option>
                            <option value="MANAGER">MANAGER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
                          <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontWeight: 'bold' }} className="mono-font">EMAIL ADDRESS</span>
                          <input 
                            type="email" 
                            style={{ ...styles.inputField, margin: 0 }}
                            value={editEmpEmail}
                            onChange={(e) => setEditEmpEmail(e.target.value.replace(/[^a-zA-Z0-9@._\-+]/g, ''))}
                            className="mono-font"
                          />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
                          <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontWeight: 'bold' }} className="mono-font">PHONE NUMBER</span>
                          <input 
                            type="text" 
                            style={{ ...styles.inputField, margin: 0 }}
                            value={editEmpPhone}
                            onChange={(e) => setEditEmpPhone(e.target.value.replace(/\D/g, ''))}
                            className="mono-font"
                            maxLength={10}
                          />
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
                          <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontWeight: 'bold' }} className="mono-font">STATUS</span>
                          <select 
                            value={editEmpStatus} 
                            onChange={(e) => setEditEmpStatus(e.target.value)}
                            style={{ ...styles.selectField, width: '100%' }}
                            className="mono-font"
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="INACTIVE">INACTIVE</option>
                          </select>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
                          <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontWeight: 'bold' }} className="mono-font">PASSWORD / PIN</span>
                          <input 
                            type="text" 
                            style={{ ...styles.inputField, margin: 0 }}
                            value={editEmpPasscode}
                            onChange={(e) => setEditEmpPasscode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                            className="mono-font"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px', justifyContent: 'flex-end' }}>
                        <button style={styles.cancelBtn} onClick={() => setEditingEmpId(null)} title="Cancel">
                          Cancel
                        </button>
                        <button style={styles.saveBtn} onClick={() => saveEmployeeEdit(emp.id)} title="Save changes">
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={styles.logLeft}>
                        <ProfileAvatar employee={emp} size={38} style={{ borderRadius: '10px' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: 'var(--color-gold)', fontWeight: 'bold' }} className="mono-font">
                              [{emp.employeeId}]
                            </span>
                            <span style={{ fontWeight: 'bold', color: 'var(--color-text-primary)' }} className="mono-font">
                              {emp.name}
                            </span>
                            <span style={{ 
                              fontSize: '8px',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              fontWeight: 'bold',
                              background: emp.status === 'ACTIVE' ? 'var(--color-gold-bg)' : 'rgba(239, 68, 68, 0.1)',
                              color: emp.status === 'ACTIVE' ? 'var(--color-gold)' : 'var(--color-red)'
                            }} className="mono-font">{emp.status}</span>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }} className="mono-font">
                            {emp.department} // {emp.position} // Registered Faces: {emp.faceCount || 0}
                          </div>
                        </div>
                      </div>
                      
                      <div style={styles.dbActions}>
                        <button 
                          style={{ ...styles.actionBtn, color: 'var(--color-gold)' }} 
                          onClick={() => startCamera(emp)}
                          title="Register/Capture face images"
                        >
                          <Camera size={14} />
                        </button>
                        <button style={styles.actionBtn} onClick={() => startEditEmployee(emp)} title="Edit details">
                          <Edit2 size={12} />
                        </button>
                        <button style={{ ...styles.actionBtn, color: 'var(--color-red)' }} onClick={() => handleDeleteEmployee(emp.id)} title="Delete employee">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 2. ATTENDANCE LEDGER TAB */}
      {activeTab === 'attendance' && (
        <div className="cyber-panel" style={{ ...styles.panelSection, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'var(--color-bg-card-hover)', borderBottom: '1px solid var(--color-border)' }} className="mono-font">
            <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--color-text-primary)', flex: 1, minWidth: '160px' }}>ATTENDANCE LEDGER DATABASE</span>
            {/* Export options */}
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button onClick={exportToCSV} style={styles.exportBtn} className="mono-font" title="Export report to Microsoft Excel CSV file">
                <Download size={12} />
                <span>EXCEL</span>
              </button>
              <button onClick={exportToPDF} style={styles.exportBtn} className="mono-font" title="Open print preview report for PDF saving">
                <Printer size={12} />
                <span>PDF REPORT</span>
              </button>
            </div>
          </div>

          {/* Search/Filter Toolbar */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Search Input - full width */}
            <div style={{ position: 'relative', width: '100%' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }}>🔍</span>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ ...styles.inputField, margin: 0, width: '100%', paddingLeft: '34px', boxSizing: 'border-box' }}
                className="mono-font"
              />
            </div>
            {/* Status Filter - full width below search */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ ...styles.selectField, width: '100%' }}
              className="mono-font"
            >
              <option value="ALL">ALL STATUSES</option>
              <option value="PRESENT">✅ PRESENT</option>
              <option value="LATE">🕐 LATE</option>
              <option value="HALF_DAY">🌗 HALF DAY</option>
              <option value="ABSENT">❌ ABSENT</option>
            </select>
          </div>

          <div style={styles.dbList}>
            {filteredAttendance.map((rec) => (
              <div key={rec.id} style={editingRecordId === rec.id 
                ? { ...styles.dbRow, flexDirection: 'column', alignItems: 'stretch', height: 'auto', minHeight: 'auto', padding: '16px' } 
                : { ...styles.dbRow, padding: '14px 16px', minHeight: 'auto' }}>
                {editingRecordId === rec.id ? (
                  <div style={styles.editRowContainer}>
                    <div style={styles.editInputs}>
                      <div style={{ display: 'flex', gap: '8px', width: '100%', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: '100px' }}>
                          <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontWeight: 'bold' }} className="mono-font">CHECK-IN</span>
                          <input 
                            type="time" 
                            value={editCheckIn}
                            onChange={(e) => setEditCheckIn(e.target.value)}
                            style={{ ...styles.inputField, margin: 0, width: '100%' }}
                            className="mono-font"
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: '100px' }}>
                          <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontWeight: 'bold' }} className="mono-font">CHECK-OUT</span>
                          <input 
                            type="time" 
                            value={editCheckOut}
                            onChange={(e) => setEditCheckOut(e.target.value)}
                            style={{ ...styles.inputField, margin: 0, width: '100%' }}
                            className="mono-font"
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: '120px' }}>
                          <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontWeight: 'bold' }} className="mono-font">STATUS</span>
                          <select
                            value={editRecordStatus}
                            onChange={(e) => setEditRecordStatus(e.target.value)}
                            style={{ ...styles.selectField, width: '100%' }}
                            className="mono-font"
                          >
                            <option value="PRESENT">PRESENT</option>
                            <option value="LATE">LATE</option>
                            <option value="HALF_DAY">HALF DAY</option>
                            <option value="ABSENT">ABSENT</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div style={{ ...styles.editActions, alignSelf: 'flex-end', marginBottom: '2px' }}>
                      <button style={styles.cancelBtn} onClick={() => setEditingRecordId(null)} title="Cancel">
                        <X size={14} />
                      </button>
                      <button style={styles.saveBtn} onClick={() => saveRecordEdit(rec.id)} title="Save changes">
                        <Check size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={styles.logLeft}>
                      <ProfileAvatar employee={rec.employee} size={40} style={{ borderRadius: '10px', flexShrink: 0 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, overflow: 'hidden' }}>
                        {/* Name + ID + Status pill */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }} className="mono-font">
                            {rec.employee.name}
                          </span>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '10px', whiteSpace: 'nowrap' }} className="mono-font">
                            ({rec.employee.employeeId})
                          </span>
                          <span style={{ 
                            fontSize: '9px',
                            padding: '2px 7px',
                            borderRadius: '20px',
                            fontWeight: 'bold',
                            flexShrink: 0,
                            background: rec.status === 'LATE' ? 'rgba(234,179,8,0.12)' : rec.status === 'HALF_DAY' ? 'rgba(148,163,184,0.12)' : rec.status === 'ABSENT' ? 'rgba(239,68,68,0.1)' : 'var(--color-gold-bg)',
                            color: rec.status === 'LATE' ? '#d97706' : rec.status === 'HALF_DAY' ? 'var(--color-text-secondary)' : rec.status === 'ABSENT' ? 'var(--color-red)' : 'var(--color-gold)'
                          }} className="mono-font">{rec.status.replace('_', ' ')}</span>
                        </div>
                        {/* Date row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>📅</span>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'monospace', fontWeight: '600' }}>{rec.date}</span>
                        </div>
                        {/* Times row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                            📥 In: <strong style={{ color: 'var(--color-text-primary)' }}>{rec.checkInTime ? rec.checkInTime.substring(0, 5) : '--:--'}</strong>
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                            📤 Out: <strong style={{ color: 'var(--color-text-primary)' }}>{rec.checkOutTime ? rec.checkOutTime.substring(0, 5) : '--:--'}</strong>
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--color-gold)', fontWeight: 'bold', fontFamily: 'monospace' }}>
                            ⏱ {formatWorkingHours(rec.workingHours)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={styles.dbActions}>
                      <button style={{ ...styles.actionBtn, width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => startEditRecord(rec)} title="Edit checkin times">
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. ANALYTICS & CHARTS TAB */}
      {activeTab === 'analytics' && (
        <div style={styles.analyticsWrapper}>
          {/* SVG Bar Chart: Daily Attendance Rate */}
          <div className="cyber-panel" style={styles.chartPanel}>
            <div style={styles.cardHeaderPlate} className="mono-font">
              <BarChart3 size={12} />
              <span>DAILY ATTENDANCE DISTRIBUTION (LAST 7 DAYS)</span>
            </div>
            <div style={styles.chartContainer}>
              <svg width="100%" height="180" viewBox="0 0 350 180" style={{ overflow: 'visible' }}>
                {/* Horizontal reference lines */}
                <line x1="30" y1="20" x2="330" y2="20" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="30" y1="70" x2="330" y2="70" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="30" y1="120" x2="330" y2="120" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="30" y1="150" x2="330" y2="150" stroke="var(--color-border)" strokeWidth="1" />
                
                {/* Axis Labels */}
                <text x="10" y="24" fill="var(--color-text-secondary)" fontSize="8" fontFamily="monospace">4</text>
                <text x="10" y="74" fill="var(--color-text-secondary)" fontSize="8" fontFamily="monospace">2</text>
                <text x="10" y="124" fill="var(--color-text-secondary)" fontSize="8" fontFamily="monospace">1</text>
                <text x="10" y="154" fill="var(--color-text-secondary)" fontSize="8" fontFamily="monospace">0</text>

                {/* Render Bars */}
                {analytics.weeklyTrend && analytics.weeklyTrend.map((day, idx) => {
                  const barWidth = 18;
                  const xOffset = 45 + idx * 40;
                  
                  // Math scales based on max count 4
                  const presentH = Math.min(130, day.present * 32);
                  const lateH = Math.min(130, day.late * 32);

                  return (
                    <g key={idx}>
                      {/* Total Present Bar */}
                      <rect 
                        x={xOffset} 
                        y={150 - presentH} 
                        width={barWidth} 
                        height={presentH} 
                        fill="var(--color-gold-border)"
                        rx="2"
                      />
                      {/* Late checkins sub-bar */}
                      <rect 
                        x={xOffset} 
                        y={150 - lateH} 
                        width={barWidth} 
                        height={lateH} 
                        fill="#eab308"
                        rx="2"
                        opacity="0.85"
                      />
                      {/* Label */}
                      <text 
                        x={xOffset + barWidth/2} 
                        y="166" 
                        fill="var(--color-text-primary)" 
                        fontSize="8" 
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {day.date}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div style={styles.chartLegend} className="mono-font">
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: 'var(--color-gold)' }} />
                  <span>On-Time Present</span>
                </div>
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: '#eab308' }} />
                  <span>Late Arrivals</span>
                </div>
              </div>
            </div>
          </div>

          {/* SVG Line Chart: Average Daily Working Hours */}
          <div className="cyber-panel" style={styles.chartPanel}>
            <div style={styles.cardHeaderPlate} className="mono-font">
              <Clock size={12} />
              <span>AVERAGE SHIFT WORKING HOURS TREND</span>
            </div>
            <div style={styles.chartContainer}>
              <svg width="100%" height="180" viewBox="0 0 350 180" style={{ overflow: 'visible' }}>
                <line x1="30" y1="30" x2="330" y2="30" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="30" y1="90" x2="330" y2="90" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="30" y1="150" x2="330" y2="150" stroke="var(--color-border)" strokeWidth="1" />

                <text x="10" y="34" fill="var(--color-text-secondary)" fontSize="8" fontFamily="monospace">10h</text>
                <text x="10" y="94" fill="var(--color-text-secondary)" fontSize="8" fontFamily="monospace">5h</text>
                <text x="10" y="154" fill="var(--color-text-secondary)" fontSize="8" fontFamily="monospace">0h</text>

                {/* Curved Bezier Path connecting work hour points */}
                <path 
                  d="M 45 48 C 85 55, 125 40, 165 52 S 245 42, 285 45" 
                  fill="none" 
                  stroke="var(--color-gold)" 
                  strokeWidth="2.5" 
                />
                
                {/* Data Points overlay */}
                <circle cx="45" cy="48" r="4.5" fill="#ffffff" stroke="var(--color-gold)" strokeWidth="2" />
                <circle cx="125" cy="40" r="4.5" fill="#ffffff" stroke="var(--color-gold)" strokeWidth="2" />
                <circle cx="205" cy="50" r="4.5" fill="#ffffff" stroke="var(--color-gold)" strokeWidth="2" />
                <circle cx="285" cy="45" r="4.5" fill="#ffffff" stroke="var(--color-gold)" strokeWidth="2" />

                {/* Labels */}
                <text x="45" y="166" fill="var(--color-text-primary)" fontSize="8" fontFamily="monospace" textAnchor="middle">Mon</text>
                <text x="125" y="166" fill="var(--color-text-primary)" fontSize="8" fontFamily="monospace" textAnchor="middle">Wed</text>
                <text x="205" y="166" fill="var(--color-text-primary)" fontSize="8" fontFamily="monospace" textAnchor="middle">Fri</text>
                <text x="285" y="166" fill="var(--color-text-primary)" fontSize="8" fontFamily="monospace" textAnchor="middle">Today</text>
              </svg>
              <div style={styles.chartDetails} className="mono-font">
                <span>Avg Shift Length: <strong>{analytics.avgWorkingHours} hours</strong></span>
                <span style={{ color: 'var(--color-gold)' }}>Liveness Checked: 100%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SYSTEM SETTINGS & NOTIFS TAB */}
      {activeTab === 'settings' && (
        <div style={styles.analyticsWrapper}>
          {/* Notifications Alerts Suite */}
          <div className="cyber-panel" style={{ ...styles.chartPanel, flex: 2 }}>
            <div style={styles.cardHeaderPlate} className="mono-font">
              <ShieldAlert size={12} />
              <span>SECURITY ALERTS SYSTEM MONITOR</span>
              {notifications.length > 0 && (
                <button onClick={clearNotifications} style={styles.clearBtn} className="mono-font">
                  DISMISS ALL
                </button>
              )}
            </div>

            <div style={styles.notifList}>
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    style={{ 
                      ...styles.notifRow, 
                      borderColor: notif.type === 'UNKNOWN_FACE' ? 'var(--color-red)' : 'var(--color-border)' 
                    }}
                  >
                    <AlertTriangle size={16} style={{ color: notif.type === 'UNKNOWN_FACE' ? 'var(--color-red)' : 'var(--color-gold)' }} />
                    <div style={styles.notifText}>
                      <div style={styles.notifMsg} className="mono-font">{notif.message}</div>
                      <div style={styles.notifTime} className="mono-font">{notif.timestamp.replace('T', ' ').substring(0, 19)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={styles.noNotifs} className="mono-font">
                  <ShieldCheck size={28} style={{ color: 'var(--color-gold)', marginBottom: '8px' }} />
                  <span>ALL SECURITY SHIELDS STABLE // NO PENDING ALERTS</span>
                </div>
              )}
            </div>
          </div>

          {/* Email summaries settings */}
          <div className="cyber-panel" style={{ ...styles.chartPanel, flex: 1 }}>
            <div style={styles.cardHeaderPlate} className="mono-font">
              <Settings size={12} />
              <span>NOTIFICATION CONFIGURATION</span>
            </div>
            <div style={styles.settingsBody} className="mono-font">
              <div style={styles.settingsRow}>
                <span>Email Attendance Summaries:</span>
                <label className="switch" style={styles.switchLabel}>
                  <input 
                    type="checkbox" 
                    checked={emailAlerts} 
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              <div style={styles.settingsRow}>
                <span>Spoofing Attack Alerts:</span>
                <label className="switch" style={styles.switchLabel}>
                  <input 
                    type="checkbox" 
                    checked={spoofAlerts} 
                    onChange={(e) => setSpoofAlerts(e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
              
              <div style={styles.settingsInfo}>
                * Email warnings are dispatched automatically via SMTP relay upon detecting unknown biometric key vectors.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PORTAL SESSIONS TAB */}
      {activeTab === 'sessions' && (
        <div className="cyber-panel" style={{ ...styles.panelSection, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={styles.cardHeaderPlate} className="mono-font">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <FileClock size={12} style={{ color: 'var(--color-gold)' }} />
              <span>PORTAL LOGIN/LOGOUT SESSIONS</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              <button onClick={exportSessionsToCSV} style={styles.exportBtn} className="mono-font" title="Export report to Microsoft Excel CSV file">
                <Download size={12} />
                <span>EXCEL</span>
              </button>
            </div>
          </div>
          
          <div style={styles.ledgerFilterBar}>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...styles.inputField, margin: 0, flex: 1 }}
              className="mono-font"
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px 16px 16px' }}>
            {employeeSessions.filter(sess => {
              const q = searchQuery.toLowerCase();
              return (sess.employeeName && sess.employeeName.toLowerCase().includes(q)) || 
                     (sess.employeeId && sess.employeeId.toLowerCase().includes(q));
            }).length > 0 ? (
              employeeSessions.filter(sess => {
                const q = searchQuery.toLowerCase();
                return (sess.employeeName && sess.employeeName.toLowerCase().includes(q)) || 
                       (sess.employeeId && sess.employeeId.toLowerCase().includes(q));
              }).map((sess) => (
                <div key={sess.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--color-border)',
                  minHeight: '52px',
                  background: 'var(--color-bg-deep)',
                  borderRadius: '12px'
                }} className="mono-font">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--color-gold)', fontWeight: 'bold' }}>
                        [{sess.employeeId}]
                      </span>
                      <span style={{ fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                        {sess.employeeName}
                      </span>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                      Timestamp: {sess.timestamp}
                    </div>
                  </div>
                  <div>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: sess.action === 'LOGIN' ? 'var(--color-green)' : 'var(--color-red)',
                      background: sess.action === 'LOGIN' ? 'var(--color-green-bg)' : 'var(--color-red-bg)'
                    }}>
                      {sess.action}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="mono-font" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                NO SESSION LOGS MATCHING FILTER
              </div>
            )}
          </div>
        </div>
      )}

      {/* SYSTEM AUDITS TAB */}
      {activeTab === 'audits' && (
        <div className="cyber-panel" style={{ ...styles.panelSection, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={styles.cardHeaderPlate} className="mono-font">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <Terminal size={12} style={{ color: 'var(--color-gold)' }} />
              <span>SYSTEM SECURITY AUDITS</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', alignItems: 'center' }}>
              <button onClick={exportAuditsToCSV} style={styles.exportBtn} className="mono-font" title="Export report to Microsoft Excel CSV file">
                <Download size={12} />
                <span>EXCEL</span>
              </button>
            </div>
          </div>
          
          <div style={styles.ledgerFilterBar}>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...styles.inputField, margin: 0, flex: 1 }}
              className="mono-font"
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px 16px 16px' }}>
            {systemAudits.filter(aud => {
              const q = searchQuery.toLowerCase();
              return (aud.message && aud.message.toLowerCase().includes(q)) || 
                     (aud.type && aud.type.toLowerCase().includes(q)) ||
                     (aud.timestamp && aud.timestamp.toLowerCase().includes(q));
            }).length > 0 ? (
              systemAudits.filter(aud => {
                const q = searchQuery.toLowerCase();
                return (aud.message && aud.message.toLowerCase().includes(q)) || 
                       (aud.type && aud.type.toLowerCase().includes(q)) ||
                       (aud.timestamp && aud.timestamp.toLowerCase().includes(q));
              }).map((aud) => (
                <div key={aud.id} style={{
                  display: 'flex',
                  padding: '12px 16px',
                  background: 'var(--color-bg-deep)',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        color: aud.type === 'ALERT' ? 'var(--color-red)' : 'var(--color-gold)',
                        background: aud.type === 'ALERT' ? 'var(--color-red-bg)' : 'var(--color-gold-bg)'
                      }} className="mono-font">
                        {aud.type}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }} className="mono-font">
                        [{aud.timestamp}]
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-primary)', wordBreak: 'break-all' }} className="mono-font">
                      {aud.message}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteLog(aud.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', opacity: 0.6, marginLeft: '12px' }}
                    title="PURGE ENTRY"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            ) : (
              <div className="mono-font" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                NO AUDIT LOGS MATCHING FILTER
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. SECURITY LOGS TAB */}
      {activeTab === 'security' && (
        <div className="cyber-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px' }}>
          <div style={styles.cardHeaderPlate} className="mono-font">
            <ShieldAlert size={12} style={{ color: 'var(--color-red)' }} />
            <span>UNAUTHORIZED ACCESS LOGS</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
            {securityLogs.length > 0 ? (
              securityLogs.map((log) => (
                <div key={log.id} style={{ display: 'flex', padding: '12px', background: 'var(--color-bg-deep)', borderRadius: '12px', border: '1px solid var(--color-border)', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    {log.imagePath && log.imagePath.trim() !== "" ? (
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1.5px solid var(--color-red-border)',
                        flexShrink: 0,
                        background: '#000'
                      }}>
                        <img 
                          src={log.imagePath} 
                          alt="Captured face attempt" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      </div>
                    ) : (
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '8px',
                        border: '1.5px dashed var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Camera size={14} style={{ color: 'var(--color-text-muted)' }} />
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--color-red)', fontWeight: 'bold', fontSize: '11px' }} className="mono-font">
                          [{log.eventType}]
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }} className="mono-font">
                          {log.timestamp.replace('T', ' ').substring(0, 19)}
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', lineHeight: '1.4' }} className="mono-font">
                        <strong>IP Address:</strong> {log.ipAddress} <br />
                        <strong>Device Info:</strong> {log.deviceInfo}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="mono-font" style={{ padding: '60px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={28} style={{ color: 'var(--color-green)', marginBottom: '8px' }} />
                <div style={{ color: 'var(--color-text-secondary)' }}>NO UNAUTHORIZED ACCESS ATTEMPTS DETECTED</div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div style={styles.modalOverlay}>
          <div className="cyber-panel" style={styles.modalContent}>
            <div style={styles.cardHeaderPlate} className="mono-font">
              <AlertTriangle size={12} style={{ color: 'var(--color-red)' }} />
              <span>{confirmModal.title}</span>
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                style={{ background: 'none', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center' }}
              >
                <X size={14} />
              </button>
            </div>
            <div style={{ ...styles.modalBody, padding: '24px', gap: '20px' }}>
              <p className="mono-font" style={{ fontSize: '12px', color: 'var(--color-text-primary)', margin: 0, lineHeight: '1.6', textAlign: 'left' }}>
                {confirmModal.message}
              </p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button 
                  className="mono-font"
                  style={{
                    ...styles.cancelBtn,
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px'
                  }}
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                >
                  Cancel
                </button>
                <button 
                  className="mono-font"
                  style={{
                    ...styles.saveBtn,
                    background: 'var(--color-red)',
                    color: '#ffffff',
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    if (confirmModal.onConfirm) confirmModal.onConfirm();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>{/* end scrollable tab content */}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden'
  },
  loginContainer: {
    padding: '60px 20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1
  },
  loginForm: {
    width: '100%',
    maxWidth: '360px',
    padding: '0',
    borderRadius: '20px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)'
  },
  cardHeaderPlate: {
    background: 'var(--color-bg-card-hover)',
    color: 'var(--color-text-primary)',
    padding: '12px 16px',
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid var(--color-border)'
  },
  formContent: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: '220px',
    flex: 1
  },
  inputLabel: {
    fontSize: '9px',
    color: 'var(--color-text-secondary)',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    fontWeight: '600'
  },
  inputField: {
    background: 'var(--color-bg-deep)',
    border: '1px solid var(--color-border)',
    padding: '10px 12px',
    color: 'var(--color-text-primary)',
    outline: 'none',
    fontSize: '12px',
    borderRadius: '8px',
    width: '100%',
    letterSpacing: '0.5px'
  },
  selectField: {
    background: 'var(--color-bg-deep)',
    border: '1px solid var(--color-border)',
    padding: '10px 12px',
    color: 'var(--color-text-primary)',
    outline: 'none',
    fontSize: '12px',
    borderRadius: '8px',
    width: '100%'
  },
  errorText: {
    color: 'var(--color-red)',
    fontSize: '11px',
    letterSpacing: '0.5px',
    textAlign: 'center',
    fontWeight: '500'
  },
  primaryBtn: {
    width: '100%',
    padding: '12px',
    background: 'var(--color-gold)',
    border: 'none',
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '12px',
    letterSpacing: '1px',
    cursor: 'pointer',
    borderRadius: '12px',
    textTransform: 'uppercase',
    transition: 'all var(--transition-fast)',
    boxShadow: '0 4px 12px hsla(243, 75%, 59%, 0.15)'
  },
  buttonBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--color-bg-card)',
    padding: '10px 16px',
    border: '1px solid var(--color-border)',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.01)'
  },
  sessionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11px',
    color: 'var(--color-text-primary)',
    letterSpacing: '0.5px',
    fontWeight: '600'
  },
  greenDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-green)'
  },
  logoutBtn: {
    background: 'none',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-secondary)',
    fontSize: '10px',
    padding: '6px 12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    borderRadius: '10px',
    letterSpacing: '0.5px',
    transition: 'all var(--transition-fast)',
    fontWeight: '600'
  },
  subTabContainer: {
    display: 'flex',
    gap: '4px',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '2px',
    overflowX: 'auto',
    position: 'sticky',
    top: 0,
    zIndex: 5,
    background: 'var(--color-bg-deep)',
    flexShrink: 0
  },
  subTabButton: {
    background: 'none',
    border: 'none',
    padding: '10px 14px',
    fontSize: '12px',
    cursor: 'pointer',
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all var(--transition-fast)',
    borderBottom: '2px solid transparent'
  },
  panelSection: {
    padding: '0',
    borderRadius: '16px',
    border: '1px solid var(--color-border)',
    background: 'var(--color-bg-card)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
  },
  addForm: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap'
  },
  dbList: {
    flex: 1,
    overflowY: 'auto',
    maxHeight: '680px',
    display: 'flex',
    flexDirection: 'column'
  },
  dbRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid var(--color-border)',
    minHeight: '60px',
    transition: 'background-color var(--transition-fast)'
  },
  logLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    overflow: 'hidden'
  },
  dbActions: {
    display: 'flex',
    gap: '10px',
    flexShrink: 0
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    padding: '6px',
    transition: 'color var(--transition-fast)',
    borderRadius: '6px'
  },
  editRowContainer: {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  editInputs: {
    display: 'flex',
    flex: 1,
    gap: '10px',
    flexWrap: 'wrap'
  },
  editActions: {
    display: 'flex',
    gap: '8px'
  },
  saveBtn: {
    background: 'var(--color-gold)',
    border: 'none',
    color: '#ffffff',
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: '700'
  },
  cancelBtn: {
    background: 'var(--color-bg-card-hover)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: '600'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(9, 13, 26, 0.4)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99
  },
  modalContent: {
    width: '90%',
    maxWidth: '380px',
    background: 'var(--color-bg-card)',
    borderRadius: '24px',
    border: '1px solid var(--color-border)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.1)'
  },
  modalBody: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  modalWebcamWrapper: {
    position: 'relative',
    aspectRatio: '1',
    width: '100%',
    background: '#090d1a',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)'
  },
  modalVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  modalScannerLine: {
    position: 'absolute',
    left: 0,
    width: '100%',
    height: '3px',
    background: 'linear-gradient(90deg, rgba(79, 70, 229, 0) 0%, var(--color-gold) 50%, rgba(79, 70, 229, 0) 100%)',
    animation: 'scan-vertical-glowing 2.5s infinite ease-in-out',
    boxShadow: '0 0 12px 1px var(--color-gold)'
  },
  modalActions: {
    display: 'flex',
    gap: '12px'
  },
  modalCaptureBtn: {
    flex: 2,
    padding: '12px',
    background: 'var(--color-gold)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)'
  },
  modalCloseBtn: {
    flex: 1,
    padding: '12px',
    background: 'var(--color-bg-deep)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    fontWeight: '600'
  },
  thumbnailWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  thumbnailLabel: {
    fontSize: '9px',
    color: 'var(--color-text-secondary)',
    letterSpacing: '0.5px',
    fontWeight: '600'
  },
  thumbnailGrid: {
    display: 'flex',
    gap: '10px',
    overflowX: 'auto',
    paddingBottom: '4px'
  },
  thumbnailImg: {
    width: '56px',
    height: '56px',
    objectFit: 'cover',
    borderRadius: '8px',
    border: '1px solid var(--color-border)'
  },
  exportBtn: {
    background: 'none',
    border: '1px solid var(--color-gold-border)',
    color: 'var(--color-gold)',
    fontSize: '10px',
    padding: '5px 12px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    fontWeight: '700',
    transition: 'all var(--transition-fast)',
    background: 'var(--color-gold-bg)'
  },
  ledgerFilterBar: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  analyticsWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  chartPanel: {
    background: 'var(--color-bg-card)',
    borderRadius: '16px',
    border: '1px solid var(--color-border)',
    padding: '0',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
  },
  chartContainer: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  chartLegend: {
    display: 'flex',
    gap: '16px',
    fontSize: '9px',
    marginTop: '12px',
    fontWeight: '500'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  legendDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%'
  },
  chartDetails: {
    fontSize: '10px',
    marginTop: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    padding: '0 8px',
    color: 'var(--color-text-secondary)'
  },
  clearBtn: {
    background: 'var(--color-red-bg)',
    border: '1px solid var(--color-red-border)',
    color: 'var(--color-red)',
    fontSize: '10px',
    padding: '4px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    marginLeft: 'auto',
    transition: 'all var(--transition-fast)'
  },
  notifList: {
    maxHeight: '240px',
    overflowY: 'auto',
    padding: '8px 12px'
  },
  notifRow: {
    display: 'flex',
    gap: '12px',
    padding: '12px',
    borderBottom: '1px solid var(--color-border)',
    alignItems: 'center'
  },
  notifText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  notifMsg: {
    fontSize: '11px',
    color: 'var(--color-text-primary)',
    fontWeight: '500'
  },
  notifTime: {
    fontSize: '9px',
    color: 'var(--color-text-muted)'
  },
  noNotifs: {
    padding: '40px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    color: 'var(--color-text-secondary)',
    fontSize: '11px',
    letterSpacing: '0.5px'
  },
  settingsBody: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    fontSize: '12px',
    color: 'var(--color-text-primary)'
  },
  settingsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px dashed var(--color-border)',
    paddingBottom: '12px'
  },
  settingsInfo: {
    fontSize: '10px',
    color: 'var(--color-text-secondary)',
    lineHeight: '1.5',
    marginTop: '10px'
  },
  switchLabel: {
    display: 'inline-block',
    width: '40px',
    height: '20px',
    position: 'relative'
  }
};


