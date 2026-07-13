import React from 'react';
import adminAvatar from '../assets/avatar_admin.png';
import aliceAvatar from '../assets/avatar_alice.png';

// Dynamic background gradients for a high-tech corporate look
const gradients = [
  'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', // Blue
  'linear-gradient(135deg, #10B981 0%, #047857 100%)', // Emerald
  'linear-gradient(135deg, #F59E0B 0%, #B45309 100%)', // Amber
  'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)', // Pink
  'linear-gradient(135deg, #8B5CF6 0%, #5B21B6 100%)', // Violet
  'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)', // Cyan
];

const getGradientForString = (str) => {
  if (!str) return gradients[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

export const getEmployeeAvatar = (emp) => {
  if (!emp) return adminAvatar;

  // 1. Resolve registered base64 image if present
  if (emp.faces && emp.faces.length > 0) {
    const firstFace = emp.faces[0].faceImage;
    if (firstFace && firstFace.startsWith('data:image')) {
      return firstFace;
    }
  }

  // 2. Map standard profile IDs/mocks to generated headshots
  const empId = (emp.employeeId || '').toUpperCase();
  if (empId === 'EMP001') return aliceAvatar;
  
  // Return null so the UI can render a beautiful inline gradient SVG/initials avatar
  return null;
};

// React component to render a premium styled avatar
export function ProfileAvatar({ employee, size = 40, style = {} }) {
  const avatarUrl = getEmployeeAvatar(employee);
  const name = employee?.name || 'Administrator';
  
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const containerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    border: '1.5px solid var(--color-border)',
    fontSize: `${Math.max(10, size * 0.35)}px`,
    fontWeight: 'bold',
    fontFamily: 'var(--font-mono)',
    color: '#ffffff',
    background: avatarUrl ? 'transparent' : getGradientForString(name),
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    ...style
  };

  if (avatarUrl) {
    return (
      <div style={containerStyle}>
        <img 
          src={avatarUrl} 
          alt={name} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      </div>
    );
  }

  return (
    <div style={containerStyle} title={name}>
      {initials}
    </div>
  );
}
