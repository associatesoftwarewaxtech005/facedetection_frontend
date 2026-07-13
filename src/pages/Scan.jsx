import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../config/api';
import { Camera, AlertCircle, RefreshCw, CheckCircle2, ShieldCheck, ShieldAlert, ArrowRightLeft, ScanFace } from 'lucide-react';

export default function ScanTab({ onScanComplete, soundEnabled, initialMode = 'check-in', verificationTarget, onCancelVerification }) {
  const [mode, setMode] = useState(initialMode); // 'check-in', 'check-out', 'verify'
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState(false);

  // Scanning state machine
  const [scanning, setScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [flashActive, setFlashActive] = useState(false);
  const [scanStatus, setScanStatus] = useState('READY TO SCAN');
  const [progress, setProgress] = useState(0);

  // Biometric selector values
  const [employees, setEmployees] = useState([]);
  const [activeSubjectId, setActiveSubjectId] = useState(() => {
    return localStorage.getItem('simulated_face_employee_id') ? 'SAVED' : 'UNKNOWN';
  });
  const [spoofMode, setSpoofMode] = useState(false); // simulates a photo spoof attack
  const [simulateBlur, setSimulateBlur] = useState(false); // simulates blurry image quality
  const [showConsole, setShowConsole] = useState(false);

  // Liveness challenge states
  const [livenessChallenge, setLivenessChallenge] = useState('');
  const [livenessStep, setLivenessStep] = useState(0); // 0 = idle, 1 = look straight, 2 = blink challenge, 3 = head turn, 4 = finished

  // Final verification result overlay
  const [verificationResult, setVerificationResult] = useState(null); // 'success', 'error', or null
  const [resultMessage, setResultMessage] = useState('');
  const [resultDetails, setResultDetails] = useState('');
  const [padlockState, setPadlockState] = useState('locked'); // 'locked', 'unlocking', 'unlocked', 'error'
  const [calibrating, setCalibrating] = useState(false);
  const [calibProgress, setCalibProgress] = useState(0);
  const [calibLogs, setCalibLogs] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [emailSubbed, setEmailSubbed] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const recognitionInProgressRef = useRef(false);

  useEffect(() => {
    if (!scanning) {
      recognitionInProgressRef.current = false;
    }
  }, [scanning]);


  // Fetch active employees to populate biometric selector dropdown
  const fetchEmployees = async () => {
    try {
      const res = await apiFetch('/api/admin/employees');
      if (res.ok) {
        const data = await res.json();
        // filter only active ones for realistic scans
        setEmployees(data.filter(e => e.status === 'ACTIVE'));
      }
    } catch (err) {
      console.warn("Unable to fetch employee directory:", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    startCamera();
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Synchronize activeSubjectId state with loaded employees list to prevent state mismatch
  useEffect(() => {
    if (employees.length > 0) {
      const hasSaved = localStorage.getItem('simulated_face_employee_id');
      if (activeSubjectId === 'SAVED' && !hasSaved) {
        setActiveSubjectId(employees[0].employeeId);
      } else if (activeSubjectId !== 'SAVED' && activeSubjectId !== 'UNKNOWN') {
        const exists = employees.some(e => e.employeeId === activeSubjectId);
        if (!exists) {
          setActiveSubjectId(hasSaved ? 'SAVED' : employees[0].employeeId);
        }
      }
    }
  }, [employees, activeSubjectId]);

  // Auto-start scanning when camera stream is ready in verify mode
  useEffect(() => {
    if (stream && mode === 'verify' && !scanning && !verificationResult) {
      const warmupTimer = setTimeout(() => {
        handleStartScan();
      }, 800);
      return () => clearTimeout(warmupTimer);
    }
  }, [stream, mode, scanning, verificationResult]);

  // Audio synths
  const playSound = (freq, duration, type = 'sine', gain = 0.05) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const volume = audioCtx.createGain();

      osc.type = type;
      osc.frequency.value = freq;

      volume.gain.setValueAtTime(gain, audioCtx.currentTime);
      volume.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(volume);
      volume.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio Context failed to play', e);
    }
  };

  const playScanTick = () => playSound(800, 0.05, 'sine', 0.02);
  const playSuccessChime = () => {
    playSound(587.33, 0.15, 'triangle', 0.08); // D5
    setTimeout(() => playSound(880, 0.3, 'triangle', 0.08), 120); // A5
  };
  const playErrorTone = () => {
    playSound(180, 0.4, 'sawtooth', 0.12);
  };
  const playChallengeBeep = () => {
    playSound(1200, 0.15, 'sine', 0.05);
  };

  const startCamera = async () => {
    setCameraError(false);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 480 }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      setCameraError(true);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Generates embedding array values based on employee identity
  const getMockEmbedding = (employeeId) => {
    // 1. Try to find registered face embedding in fetched employees
    const emp = employees.find(e => e.employeeId === employeeId);
    if (emp && emp.faces && emp.faces.length > 0 && emp.faces[0].embedding) {
      const dbEmb = emp.faces[0].embedding;
      // Strip any brackets from the stored embedding to return a clean comma-separated list
      return dbEmb.replace('[', '').replace(']', '').trim();
    }

    // 2. If the employee is unrecognized or has no registered face in the database,
    // generate a flat zero embedding to simulate an unrecognized stranger's face.
    // This guarantees it will fail Euclidean distance checks (threshold: 0.55) against all registered profiles.
    return Array(128).fill(0.0).toString();
  };

  const checkImageSharpness = (imgBase64) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = imgBase64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 64, 64);

        const imgData = ctx.getImageData(0, 0, 64, 64);
        const data = imgData.data;

        let sum = 0;
        let sumSq = 0;
        const length = 64 * 64;
        const grayscale = new Float32Array(length);

        for (let i = 0; i < length; i++) {
          const r = data[i * 4];
          const g = data[i * 4 + 1];
          const b = data[i * 4 + 2];
          grayscale[i] = 0.299 * r + 0.587 * g + 0.114 * b;
        }

        let laplacianSum = 0;
        let laplacianSumSq = 0;
        let count = 0;

        for (let y = 1; y < 63; y++) {
          for (let x = 1; x < 63; x++) {
            const center = grayscale[y * 64 + x];
            const left = grayscale[y * 64 + (x - 1)];
            const right = grayscale[y * 64 + (x + 1)];
            const top = grayscale[(y - 1) * 64 + x];
            const bottom = grayscale[(y + 1) * 64 + x];

            const laplacian = -4 * center + left + right + top + bottom;
            laplacianSum += laplacian;
            laplacianSumSq += laplacian * laplacian;
            count++;
          }
        }

        const mean = laplacianSum / count;
        const variance = (laplacianSumSq / count) - (mean * mean);
        resolve(variance);
      };
      img.onerror = () => {
        resolve(0);
      };
    });
  };

  const handleStartScan = async () => {
    if (scanning || recognitionInProgressRef.current) return;
    recognitionInProgressRef.current = true;


    // Fetch latest employees first to ensure we have any newly registered face embeddings
    try {
      const res = await apiFetch('/api/admin/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.warn("Unable to refresh employee list before scan:", err);
    }

    setScanning(true);
    setVerificationResult(null);
    setResultMessage('');
    setResultDetails('');
    setPadlockState('locked');
    setProgress(0);
    setLivenessStep(1);
    setScanStatus('BIOMETRIC CAPTURE ACTIVE');
    setLivenessChallenge('CAPTURING FACE IMAGE...');

    // Play camera shutter sound
    playSound(600, 0.1, 'sine', 0.05);

    // Trigger white flash overlay
    setFlashActive(true);
    setTimeout(() => {
      setFlashActive(false);
    }, 150);

    // Capture image frame from the video stream
    let base64 = '';
    if (videoRef.current) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, 480, 480);
        base64 = canvas.toDataURL('image/jpeg');
        setCapturedImage(base64);
      } catch (err) {
        console.warn("Unable to freeze webcam stream:", err);
      }
    }

    // Run a quick analysis progress bar (1.2 seconds) to look high-tech
    let stepProgress = 0;
    timerRef.current = setInterval(() => {
      stepProgress += 10;
      setProgress(stepProgress);
      playScanTick();

      if (stepProgress === 30) {
        setLivenessStep(2);
        setLivenessChallenge('PROCESSING FACE MESH LANDMARKS');
        playChallengeBeep();
      }
      if (stepProgress === 60) {
        setLivenessStep(3);
        setLivenessChallenge('COMPUTING 128-D VECTOR EMBEDDING');
        playChallengeBeep();
      }
      if (stepProgress === 90) {
        setLivenessStep(4);
        setLivenessChallenge('VERIFYING BIOMETRICS WITH SECURE CLOUD');
      }

      if (stepProgress >= 100) {
        clearInterval(timerRef.current);
        submitBiometrics(base64);
      }
    }, 120);
  };

  const submitBiometrics = async (imgParam) => {
    recognitionInProgressRef.current = true;
    const activeImage = imgParam || capturedImage;

    setScanStatus('VERIFYING IDENTITY WITH SECURE DATABASE');
    setLivenessChallenge('CONTACTING SECURITY ENGINE...');

    // Image quality and blurriness verification
    if (activeImage) {
      const score = await checkImageSharpness(activeImage);
      const effectiveScore = simulateBlur ? 10.0 : score;
      if (effectiveScore < 35.0) {
        setVerificationResult('error');
        setResultMessage('IMAGE TOO BLURRY');
        setResultDetails('Biometric verification failed: Image resolution or focus is too low. Please adjust lighting/position and try again.');
        setPadlockState('error');
        playErrorTone();

        setTimeout(() => {
          setScanning(false);
          setVerificationResult(null);
          setLivenessStep(0);
          setCapturedImage(null);
          setScanStatus('READY TO SCAN');
          setPadlockState('locked');
        }, 3500);
        return;
      }
    }

    // Resolve the active simulated employee ID in the camera field
    const resolvedEmpId = activeSubjectId === 'SAVED'
      ? (localStorage.getItem('simulated_face_employee_id') || 'UNKNOWN')
      : activeSubjectId;

    // Generate biometrics payloads
    let embedding = '';
    if (activeSubjectId === 'SAVED' && localStorage.getItem('simulated_face_embedding')) {
      embedding = localStorage.getItem('simulated_face_embedding').replace('[', '').replace(']', '').trim();
    } else {
      embedding = getMockEmbedding(resolvedEmpId);
    }

    const livenessVerified = !spoofMode;

    const payload = {
      embedding: `[${embedding}]`,
      livenessVerified: String(livenessVerified),
      expectedEmployeeId: verificationTarget || '',
      capturedImage: activeImage || '',
      deviceInfo: navigator.userAgent,
      ipAddress: '127.0.0.1' // Simulated IP address
    };

    let apiPath = '/api/attendance/check-in';
    if (mode === 'check-out') {
      apiPath = '/api/attendance/check-out';
    } else if (mode === 'verify') {
      apiPath = '/api/attendance/verify-biometrics';
    }

    try {
      const res = await apiFetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });


      const data = await res.json();

      if (res.ok) {
        // Enforce strict identity verification checks for portal logins
        if (mode === 'verify' && verificationTarget && data.employee.employeeId.toUpperCase() !== verificationTarget.toUpperCase()) {
          setVerificationResult('error');
          setResultMessage('IDENTITY MISMATCH');
          setResultDetails(`Scanned face matches ${data.employee.name} (${data.employee.employeeId}), but login target is ${verificationTarget}. Access denied.`);
          setPadlockState('error');
          playErrorTone();

          setTimeout(() => {
            setScanning(false);
            setVerificationResult(null);
            setLivenessStep(0);
            setCapturedImage(null);
            setScanStatus('READY TO SCAN');
            setPadlockState('locked');
          }, 3500);
          return;
        }

        setVerificationResult('success');
        setResultMessage(data.message);
        let details = `Employee Profile: ${data.employee.name} (${data.employee.employeeId}) // Department: ${data.employee.department}`;
        if (data.warning) {
          details += ` // ⚠️ WARNING: ${data.warning}`;
        }
        setResultDetails(details);
        setPadlockState('unlocking');
        playSuccessChime();

        setTimeout(() => {
          setPadlockState('unlocked');
        }, 500);

        // callback to refresh logs or notifications
        setTimeout(() => {
          setScanning(false);
          setVerificationResult(null);
          setLivenessStep(0);
          setCapturedImage(null);
          setScanStatus('READY TO SCAN');
          setPadlockState('locked');
          setMode(prev => prev === 'check-in' ? 'check-out' : 'check-in');
          onScanComplete && onScanComplete(data);
        }, 3000);
      } else {
        setVerificationResult('error');
        setResultMessage(data.message || 'UNAUTHORIZED USER');
        setResultDetails('Biometric access verification denied. Log added to system security audits.');
        setPadlockState('error');
        playErrorTone();

        setTimeout(() => {
          setScanning(false);
          setVerificationResult(null);
          setLivenessStep(0);
          setCapturedImage(null);
          setScanStatus('READY TO SCAN');
          setPadlockState('locked');
        }, 3500);
      }
    } catch (err) {
      console.error(err);
      setVerificationResult('error');
      setResultMessage('CONNECTION FAULT: DATABASE OFFLINE');
      setResultDetails('Server not responding. Please check backend connection.');
      setPadlockState('error');
      playErrorTone();

      setTimeout(() => {
        setScanning(false);
        setVerificationResult(null);
        setLivenessStep(0);
        setCapturedImage(null);
        setScanStatus('READY TO SCAN');
        setPadlockState('locked');
      }, 3500);
    }
  };

  const resolvedEmpId = activeSubjectId === 'SAVED'
    ? (localStorage.getItem('simulated_face_employee_id') || 'UNKNOWN')
    : activeSubjectId;
  const activeSubjectName = activeSubjectId === 'SAVED'
    ? (localStorage.getItem('simulated_face_name') || 'Saved Biometrics')
    : (employees.find(e => e.employeeId === activeSubjectId)?.name || 'Stranger');

  const getHudClass = () => {
    if (verificationResult === 'success') return 'success';
    if (verificationResult === 'error') return 'error';
    if (scanning) return 'scanning';
    if (mode === 'check-out') return 'checkout';
    return 'idle';
  };

  const handleInitiateCalibration = () => {
    if (calibrating) return;
    setCalibrating(true);
    setCalibProgress(0);
    setCalibLogs(['[SYSTEM]: INITIATING BIO-SENSOR DIAGNOSTIC...']);
    playSound(440, 0.1, 'sine', 0.05);

    let progressVal = 0;
    const interval = setInterval(() => {
      progressVal += Math.floor(Math.random() * 12) + 6;
      if (progressVal >= 100) {
        progressVal = 100;
        clearInterval(interval);
        setCalibProgress(100);
        setCalibLogs([
          '[SYSTEM]: INITIATING BIO-SENSOR DIAGNOSTIC...',
          '[SYSTEM]: TESTING IMAGE SHARPNESS SENSOR... OK',
          '[SYSTEM]: SYNCHRONIZING 128-D MESH NETWORK... OK',
          '[SYSTEM]: CALIBRATING ANTI-SPOOF CHALLENGE ENGINE... OK',
          '[SYSTEM]: RUNNING SECURE SQL LEDGER CONNECTION TEST... OK',
          '[SYSTEM]: BIO-PORTAL DIAGNOSTICS COMPLETED SUCCESSFULLY.'
        ]);
        playSuccessChime();
        setTimeout(() => {
          setCalibrating(false);
        }, 3500);
      } else {
        setCalibProgress(progressVal);
        playSound(600 + progressVal * 2, 0.04, 'sine', 0.02);

        setCalibLogs(prev => {
          const newLogs = ['[SYSTEM]: INITIATING BIO-SENSOR DIAGNOSTIC...'];
          if (progressVal > 15) newLogs.push('[SYSTEM]: TESTING IMAGE SHARPNESS SENSOR... OK');
          if (progressVal > 40) newLogs.push('[SYSTEM]: SYNCHRONIZING 128-D MESH NETWORK... OK');
          if (progressVal > 65) newLogs.push('[SYSTEM]: CALIBRATING ANTI-SPOOF CHALLENGE ENGINE... OK');
          if (progressVal > 85) newLogs.push('[SYSTEM]: RUNNING SECURE SQL LEDGER CONNECTION TEST... OK');
          newLogs.push(`[SYSTEM]: CALIBRATING OPTICAL HARDWARE... ${progressVal}%`);
          return newLogs;
        });
      }
    }, 180);
  };

  return (
    <div style={styles.container}>
      {/* 1. Mode selection tab bar (only show if verificationTarget is not present, i.e., not in portal-verify mode) */}
      {!verificationTarget && (
        <div style={styles.tabToggleWrapper}>
          {mode === 'check-in' ? (
            <button
              style={{
                ...styles.toggleBtn,
                background: 'var(--color-gold)',
                color: '#ffffff',
                borderColor: 'var(--color-gold)',
                cursor: 'default',
                width: '100%',
                fontWeight: 'bold',
                letterSpacing: '1px'
              }}
            >
              Check-In Mode
            </button>
          ) : (
            <button
              style={{
                ...styles.toggleBtn,
                background: 'var(--color-gold)',
                color: '#ffffff',
                borderColor: 'var(--color-gold)',
                cursor: 'default',
                width: '100%',
                fontWeight: 'bold',
                letterSpacing: '1px'
              }}
            >
              Check-Out Mode
            </button>
          )}
        </div>
      )}

      {/* If verify target is present, show verification header */}
      {verificationTarget && (
        <div style={styles.verifyHeader} className="cyber-panel">
          <ShieldCheck size={18} />
          <span>VERIFYING TARGET IDENTITY: {verificationTarget.toUpperCase()}</span>
          <button onClick={onCancelVerification} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--color-gold)', cursor: 'pointer', fontSize: '10px' }}>CANCEL</button>
        </div>
      )}

      {/* 2. Camera Frame */}
      <div style={styles.cameraFrame} className="cyber-panel">
        {/* Flash Overlay */}
        {flashActive && <div style={styles.flashOverlay} />}

        {/* Video feed or fallback */}
        {stream ? (
          <div style={styles.feedWrapper}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={styles.videoFeed}
            />
            {/* Draw HUD SVG overlay for face detection scanner styling */}
            <div style={styles.hudOverlay}>
              <svg style={styles.hudSvg} viewBox="0 0 100 100">
                {/* Scanner corners */}
                <path d="M 10 20 L 10 10 L 20 10" fill="none" stroke="var(--color-gold)" strokeWidth="1" />
                <path d="M 80 10 L 90 10 L 90 20" fill="none" stroke="var(--color-gold)" strokeWidth="1" />
                <path d="M 10 80 L 10 90 L 20 90" fill="none" stroke="var(--color-gold)" strokeWidth="1" />
                <path d="M 80 90 L 90 90 L 90 80" fill="none" stroke="var(--color-gold)" strokeWidth="1" />

                {/* Scanning reticle / grid line */}
                {scanning && (
                  <line
                    x1="10"
                    y1={progress}
                    x2="90"
                    y2={progress}
                    stroke="var(--color-gold)"
                    strokeWidth="0.8"
                    opacity="0.8"
                    style={{ transition: 'y 0.1s linear' }}
                  />
                )}
              </svg>
            </div>
          </div>
        ) : (
          <div style={styles.fallbackWrapper}>
            <Camera size={48} style={{ color: 'var(--color-text-secondary)', opacity: 0.6 }} />
            <div style={styles.fallbackText} className="hud-font">
              {cameraError ? 'CAMERA CONNECTION ERROR' : 'CAMERA OFFLINE'}
            </div>
            <div style={styles.fallbackSubtext} className="mono-font">
              {cameraError ? 'Please check your permissions and device connection.' : 'Biometric capture stream is inactive. Click below to start.'}
            </div>
            <button
              onClick={startCamera}
              style={{ ...styles.scanBtn, background: 'var(--color-gold)', width: 'auto', marginTop: '16px', padding: '10px 20px' }}
              className="mono-font"
            >
              START WEBCAM
            </button>
          </div>
        )}

        {/* Verification Result Overlay */}
        {verificationResult && (
          <div
            style={{
              ...styles.resultOverlay,
              backgroundColor: verificationResult === 'success' ? 'rgba(6, 78, 59, 0.95)' : 'rgba(153, 27, 27, 0.95)',
              borderColor: verificationResult === 'success' ? 'var(--color-green)' : 'var(--color-red)'
            }}
          >
            {verificationResult === 'success' ? (
              <ShieldCheck size={54} style={{ color: '#ffffff', marginBottom: '12px' }} className="anim-pulse" />
            ) : (
              <ShieldAlert size={54} style={{ color: '#ffffff', marginBottom: '12px' }} className="anim-shake" />
            )}
            <h3 style={styles.resultTitle} className="hud-font">
              {verificationResult === 'success' ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
            </h3>
            <p style={styles.resultMsg} className="mono-font">
              {resultMessage}
            </p>
            <p style={styles.resultSub} className="mono-font">
              {resultDetails}
            </p>
          </div>
        )}
      </div>

      {/* 3. Control & Progress Panel */}
      <div style={styles.controlBox} className="cyber-panel">
        <div style={styles.statusLine} className="mono-font">
          <span
            style={{
              ...styles.dotIndicator,
              background: scanning ? 'var(--color-gold)' : (stream ? 'var(--color-green)' : 'var(--color-text-muted)')
            }}
          />
          <span>{scanStatus}</span>
        </div>

        {/* Liveness Challenge Box */}
        {scanning && (
          <div style={styles.challengeBox} className="cyber-panel">
            <span style={styles.challengeStep} className="mono-font">
              STAGE {livenessStep} OF 4:
            </span>
            <span style={styles.challengeText} className="hud-font">
              {livenessChallenge}
            </span>
          </div>
        )}

        {/* Progress Bar */}
        {scanning && (
          <div style={styles.progressBarWrapper}>
            <div
              style={{
                ...styles.progressBar,
                width: `${progress}%`,
                background: 'var(--color-gold)'
              }}
            />
            <span style={styles.progressText} className="mono-font">
              {progress}% ANALYZING
            </span>
          </div>
        )}

        {/* Action Button */}
        {stream && !scanning && (
          <button
            onClick={handleStartScan}
            style={{
              ...styles.scanBtn,
              background: 'var(--color-gold)'
            }}
            className="hud-font"
          >
            START BIOMETRIC SCAN
          </button>
        )}

        {/* Console / Simulation Settings */}
        <div style={styles.consolePanel} className="cyber-panel">
          <div
            style={styles.consoleHeader}
            onClick={() => setShowConsole(!showConsole)}
          >
            <span className="mono-font" style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
              {showConsole ? '▼ HIDE SCANNER SIMULATOR CONTROLS' : '▶ SHOW SCANNER SIMULATOR CONTROLS'}
            </span>
          </div>

          {showConsole && (
            <div style={styles.consoleBody}>
              <div style={styles.simulatorHint} className="mono-font">
                Use these settings to simulate scanning different employees, spoofing attacks, or low-quality/blurry webcam conditions.
              </div>

              <div style={styles.controlRow}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.inputLabel} className="mono-font">Subject Profile</label>
                  <select
                    style={styles.selectField}
                    value={activeSubjectId}
                    onChange={(e) => setActiveSubjectId(e.target.value)}
                  >
                    <option value="UNKNOWN">Unregistered Stranger</option>
                    {localStorage.getItem('simulated_face_employee_id') && (
                      <option value="SAVED">
                        {localStorage.getItem('simulated_face_name') || 'Saved Biometrics'} (Registered)
                      </option>
                    )}
                    {employees.map(emp => (
                      <option key={emp.employeeId} value={emp.employeeId}>
                        {emp.name} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.controlRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  <input
                    type="checkbox"
                    id="spoof_toggle"
                    checked={spoofMode}
                    onChange={(e) => setSpoofMode(e.target.checked)}
                  />
                  <label htmlFor="spoof_toggle" style={{ ...styles.inputLabel, cursor: 'pointer' }} className="mono-font">
                    Simulate Photo Spoof (Liveness Fail)
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  <input
                    type="checkbox"
                    id="blur_toggle"
                    checked={simulateBlur}
                    onChange={(e) => setSimulateBlur(e.target.checked)}
                  />
                  <label htmlFor="blur_toggle" style={{ ...styles.inputLabel, cursor: 'pointer' }} className="mono-font">
                    Simulate Blurry Lens (Resolution Fail)
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  comingSoonPanel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '60px 40px',
    background: 'var(--color-bg-card)',
    maxWidth: '500px',
    borderRadius: '24px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.04)',
    margin: '40px auto'
  },
  comingSoonReticle: {
    width: '120px',
    height: '120px',
    border: '1px solid var(--color-gold-border)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: '24px',
    background: 'transparent',
    borderRadius: '20px'
  },
  comingSoonTitle: {
    fontSize: '20px',
    color: 'var(--color-text-primary)',
    letterSpacing: '2px',
    margin: '0 0 6px 0',
    fontWeight: '800'
  },
  comingSoonStatus: {
    fontSize: '11px',
    color: 'var(--color-gold)',
    letterSpacing: '1px',
    margin: '0'
  },
  comingSoonDivider: {
    width: '60px',
    height: '1px',
    background: 'var(--color-border-bright)',
    margin: '24px 0'
  },
  comingSoonMainText: {
    fontSize: '32px',
    color: 'var(--color-text-primary)',
    letterSpacing: '4px',
    margin: '0 0 16px 0',
    fontWeight: '900'
  },
  comingSoonSubText: {
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
    lineHeight: '1.6',
    maxWidth: '380px',
    margin: '0 0 30px 0'
  },
  calibStatusList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    textAlign: 'left',
    fontSize: '10px',
    color: 'var(--color-text-secondary)',
    background: 'var(--color-bg-deep)',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    width: '100%'
  },
  calibItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  calibDotActive: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--color-green)'
  },
  calibDotPending: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--color-gold)',
    animation: 'pulse 1.5s infinite'
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
  container: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    flex: 1,
    overflowY: 'auto'
  },
  tabToggleWrapper: {
    display: 'flex',
    gap: '12px'
  },
  toggleBtn: {
    flex: 1,
    padding: '12px',
    border: '1px solid',
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '11px',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    transition: 'all var(--transition-fast)'
  },
  cameraFrame: {
    aspectRatio: '1',
    width: '100%',
    padding: '0',
    background: 'var(--color-bg-card)',
    borderColor: 'var(--color-border)',
    borderRadius: '24px',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.03)'
  },
  feedWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%'
  },
  videoFeed: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    zIndex: 9,
    opacity: 0.8,
    pointerEvents: 'none'
  },
  hudOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none'
  },
  hudSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%'
  },
  fallbackWrapper: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
    textAlign: 'center',
    width: '100%',
    height: '100%',
    background: 'var(--color-bg-card)'
  },
  fallbackText: {
    fontSize: '12px',
    color: 'var(--color-text-primary)',
    marginTop: '16px',
    letterSpacing: '1.5px',
    fontWeight: 'bold'
  },
  fallbackSubtext: {
    fontSize: '11px',
    color: 'var(--color-text-secondary)',
    marginTop: '6px',
    maxWidth: '240px',
    lineHeight: '1.4'
  },
  controlBox: {
    background: 'var(--color-bg-card)',
    borderColor: 'var(--color-border)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  controlRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: '180px',
    flex: 1
  },
  inputLabel: {
    fontSize: '9px',
    color: 'var(--color-text-secondary)',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    fontWeight: '600'
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
  switchLabel: {
    display: 'inline-block',
    width: '46px',
    height: '22px',
    position: 'relative'
  },
  challengeBox: {
    background: 'var(--color-bg-deep)',
    border: '1px solid var(--color-border)',
    borderRadius: '10px',
    padding: '12px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  challengeStep: {
    fontSize: '9px',
    color: 'var(--color-text-secondary)',
    letterSpacing: '1px'
  },
  challengeText: {
    fontSize: '13px',
    color: 'var(--color-text-primary)',
    fontWeight: '700',
    letterSpacing: '0.5px'
  },
  statusLine: {
    fontSize: '10px',
    color: 'var(--color-text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '600'
  },
  dotIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  progressBarWrapper: {
    width: '100%',
    height: '26px',
    background: 'var(--color-bg-deep)',
    border: '1px solid var(--color-border)',
    position: 'relative',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    borderRadius: '12px',
    transition: 'width 0.25s ease-out'
  },
  progressText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '9px',
    color: '#ffffff',
    fontWeight: 'bold',
    mixBlendMode: 'difference',
    letterSpacing: '1px'
  },
  scanBtn: {
    width: '100%',
    padding: '14px',
    border: 'none',
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '13px',
    letterSpacing: '1px',
    borderRadius: '12px',
    cursor: 'pointer',
    textTransform: 'uppercase',
    transition: 'all var(--transition-fast)'
  },
  resultOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backdropFilter: 'blur(12px)',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
    textAlign: 'center',
    border: '1px solid',
    borderRadius: '24px',
    transition: 'all var(--transition-fast)'
  },
  resultTitle: {
    fontSize: '22px',
    fontWeight: '900',
    letterSpacing: '1.5px',
    marginBottom: '6px'
  },
  resultMsg: {
    fontSize: '14px',
    color: 'var(--color-text-primary)',
    fontWeight: 'bold',
    marginBottom: '8px',
    maxWidth: '260px'
  },
  resultSub: {
    fontSize: '10px',
    color: 'var(--color-text-secondary)',
    lineHeight: '1.4',
    maxWidth: '240px'
  },
  verifyHeader: {
    width: '100%',
    background: 'var(--color-gold-bg)',
    border: '1px solid var(--color-gold-border)',
    color: 'var(--color-gold)',
    borderRadius: '12px',
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.5px'
  },
  autoDetectBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--color-bg-deep)',
    border: '1px solid var(--color-border)',
    borderRadius: '10px',
    padding: '12px',
    fontSize: '10px',
    color: 'var(--color-text-primary)',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    width: '100%'
  },
  cancelBtn: {
    width: '100%',
    padding: '12px',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-secondary)',
    fontWeight: '600',
    fontSize: '11px',
    letterSpacing: '1px',
    borderRadius: '12px',
    cursor: 'pointer',
    textTransform: 'uppercase',
    transition: 'all var(--transition-fast)'
  },
  consolePanel: {
    background: 'var(--color-bg-card)',
    borderColor: 'var(--color-border)',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '4px'
  },
  consoleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none'
  },
  consoleBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    borderTop: '1px dashed var(--color-border)',
    paddingTop: '14px'
  },
  consoleRow: {
    display: 'flex',
    gap: '16px'
  },
  simulatorHint: {
    fontSize: '9px',
    color: 'var(--color-text-muted)',
    lineHeight: '1.4',
    background: 'var(--color-bg-deep)',
    border: '1px dashed var(--color-border)',
    borderRadius: '8px',
    padding: '8px 10px',
    marginTop: '-4px',
    letterSpacing: '0.2px'
  },
  consoleInfoBox: {
    background: 'var(--color-bg-deep)',
    border: '1px dashed var(--color-border)',
    borderRadius: '8px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '10px',
    color: 'var(--color-text-secondary)'
  },
  calibLogBox: {
    width: '100%',
    background: 'var(--color-bg-deep)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    height: '110px',
    overflowY: 'auto'
  },
  calibLogLine: {
    fontSize: '9px',
    color: 'var(--color-gold)',
    lineHeight: '1.4'
  },
  notifyForm: {
    width: '100%',
    marginTop: '6px'
  },
  notifyInput: {
    flex: 1,
    background: 'var(--color-bg-deep)',
    border: '1px solid var(--color-border)',
    padding: '10px 12px',
    color: 'var(--color-text-primary)',
    outline: 'none',
    fontSize: '11px',
    borderRadius: '8px'
  },
  notifyBtn: {
    padding: '10px 16px',
    background: 'transparent',
    border: '1px solid var(--color-gold)',
    color: 'var(--color-gold)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: 'bold',
    letterSpacing: '0.5px'
  },
  subbedMessage: {
    fontSize: '11px',
    color: 'var(--color-green)',
    background: 'var(--color-green-bg)',
    border: '1px solid var(--color-green-border)',
    borderRadius: '8px',
    padding: '10px',
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: '0.5px'
  }
};



