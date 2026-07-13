import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Terminal } from 'lucide-react';

export default function TerminalOverlay({ isOpen, onClose, soundEnabled }) {
  const [history, setHistory] = useState([
    'AXON SECURE SHELL v4.8.2-OMEGA',
    'ESTABLISHING ENCRYPTED LINK...',
    'SECURE CONNECTION ESTABLISHED.',
    'Type "help" for a list of available commands.'
  ]);
  const [input, setInput] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const terminalEndRef = useRef(null);
  const inputRef = useRef(null);

  // Sound Synth Helpers
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

  const playKeyPress = () => playSound(600, 0.05, 'triangle', 0.02);
  const playEnter = () => playSound(450, 0.1, 'sine', 0.04);
  const playDecryptTick = () => playSound(900, 0.05, 'sine', 0.015);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 300);
    }
  }, [isOpen]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  const handleCommand = (cmdStr) => {
    playEnter();
    const cmd = cmdStr.trim().toLowerCase();
    const newHistory = [...history, `> ${cmdStr}`];

    if (cmd === '') {
      setHistory(newHistory);
      return;
    }

    switch (cmd) {
      case 'help':
        setHistory([
          ...newHistory,
          'Available commands:',
          '  help      - Show this documentation screen.',
          '  status    - Retrieve system health and clearance metrics.',
          '  clearance - Print OMEGA clearance guidelines.',
          '  decrypt   - Decrypt database cryptographic signature.',
          '  bypass    - Attempt firewall warning bypass override.',
          '  logs      - Output raw system kernel logs.',
          '  clear     - Wipe terminal screen logs.',
          '  exit      - Terminate connection.'
        ]);
        break;
        
      case 'status':
        setHistory([
          ...newHistory,
          '--- SYSTEM METRICS ---',
          'NODE: AXON-MAIN-012',
          'SECURITY SUB-LEVEL: 5',
          'ACCESS KEY STATUS: COMPATIBLE',
          'IP ADDRESS: 10.244.12.89',
          'VPN INTEGRATION: SHA-256 SECURED',
          'MAINTENANCE STATUS: FULLY DEPLOYED'
        ]);
        break;
        
      case 'clearance':
        setHistory([
          ...newHistory,
          '--- SECURITY CLEARANCE REPORT ---',
          'CLEARANCE CLASS: OMEGA [LEVEL 5]',
          'SUBJECT VERIFIED: AGENT 012',
          'ACCESS SCOPE: RESTRICTED TO SECTOR 9 CORE FLUIDICS',
          'WARNING: All actions are recorded under Protocol 12-B.'
        ]);
        break;
        
      case 'decrypt':
        runMockDecryption(newHistory);
        break;
        
      case 'bypass':
        setHistory([
          ...newHistory,
          'INITIATING BYPASS SEQUENCE...',
          'WARNING: OVERRIDING FIREWALL RULES...',
          'SUCCESS: FIREWALL SYSTEM BYPASSED.',
          'ENCRYPTED ENVELOPE OPENED.'
        ]);
        break;
        
      case 'logs':
        setHistory([
          ...newHistory,
          '[14:02:44] [KERNEL] Credential validation: SUCCESS',
          '[14:02:41] [BIOMETRIC] Face match result: 99.8%',
          '[14:02:39] [CONN] Encrypted SSH channel established',
          '[13:58:12] [SYS] Auto backup daemon cycle completed',
          '[13:42:01] [NET] Core handshake request from 10.0.0.8'
        ]);
        break;
        
      case 'clear':
        setHistory([]);
        break;
        
      case 'exit':
        setHistory([...newHistory, 'TERMINATING CONNECTION...']);
        setTimeout(() => {
          onClose();
        }, 500);
        break;
        
      default:
        setHistory([
          ...newHistory,
          `axon: command not found: ${cmd}`,
          'Type "help" for a list of valid controls.'
        ]);
    }
  };

  const runMockDecryption = (currentHistory) => {
    if (isDecrypting) return;
    setIsDecrypting(true);
    
    let tempHistory = [...currentHistory, 'STARTING CRYPTO MATRIX RESOLUTION...'];
    setHistory(tempHistory);
    
    let step = 0;
    const interval = setInterval(() => {
      playDecryptTick();
      const randomHex = Array.from({ length: 4 }, () => 
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()
      ).join(' ');
      
      step++;
      setHistory(prev => [
        ...prev.slice(0, -1),
        `DECRYPTING: [${step * 10}%] DATA MESH: ${randomHex}`
      ]);

      if (step >= 10) {
        clearInterval(interval);
        setHistory(prev => [
          ...prev,
          'DECRYPTION INTRUSION COMPLETE.',
          'DECRYPTED VAL: "PROJECT_BEE_MAGIC_V4_SECURE_KEY"'
        ]);
        setIsDecrypting(false);
      }
    }, 250);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCommand(input);
      setInput('');
    } else {
      playKeyPress();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      {/* Header bar */}
      <div style={styles.header}>
        <div style={styles.headerTitle} className="mono-font">
          <Terminal size={14} style={{ color: 'var(--color-gold)' }} />
          <span>AXON IDENTITY // SECURE COMMAND CONSOLE</span>
        </div>
        <button style={styles.closeBtn} onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {/* Terminal log history */}
      <div style={styles.historyBox} className="mono-font">
        {history.map((line, idx) => (
          <div key={idx} style={styles.line}>
            {line}
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>

      {/* Terminal input prompt */}
      <div style={styles.inputWrapper} className="mono-font">
        <span style={styles.prompt}>axon_usr@agent012:~$</span>
        <input 
          ref={inputRef}
          type="text" 
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          disabled={isDecrypting}
        />
        <Play size={10} style={styles.inputIcon} />
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(9, 13, 26, 0.88)',
    backdropFilter: 'blur(16px)',
    zIndex: 90,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '0'
  },
  header: {
    height: '48px',
    background: 'rgba(21, 31, 50, 0.95)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 16px',
    borderRadius: '0',
    flexShrink: 0
  },
  headerTitle: {
    fontSize: '11px',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    letterSpacing: '1px',
    textTransform: 'uppercase'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.5)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
    borderRadius: '0',
    transition: 'all var(--transition-fast)'
  },
  historyBox: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '11px',
    color: '#22d3ee', /* Translucent cyan glowing text */
    lineHeight: '1.5',
    backgroundColor: 'transparent'
  },
  line: {
    wordBreak: 'break-all',
    whiteSpace: 'pre-wrap'
  },
  inputWrapper: {
    height: '44px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(21, 31, 50, 0.95)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    gap: '6px',
    borderRadius: '0',
    flexShrink: 0
  },
  prompt: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.5)'
  },
  input: {
    flex: 1,
    background: 'none',
    border: 'none',
    outline: 'none',
    color: '#ffffff',
    fontSize: '11px',
    fontFamily: 'inherit',
    caretColor: '#22d3ee'
  },
  inputIcon: {
    color: 'rgba(255, 255, 255, 0.3)'
  }
};
