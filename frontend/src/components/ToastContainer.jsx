import React from 'react';

const ToastContainer = ({ toasts, onRemove }) => {
  return (
    <div style={{
      position: 'fixed',
      top: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxWidth: '360px',
      width: '100%',
      pointerEvents: 'none'
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 20px',
            borderRadius: '16px',
            background: toast.type === 'success' 
              ? 'rgba(16, 185, 129, 0.95)' 
              : toast.type === 'danger' 
                ? 'rgba(239, 68, 68, 0.95)' 
                : 'rgba(245, 158, 11, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25), 0 0 20px rgba(255, 255, 255, 0.05)',
            animation: 'toast-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onClick={() => onRemove(toast.id)}
        >
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            {toast.type === 'success' && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            )}
            {toast.type === 'danger' && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            )}
            {toast.type === 'warning' && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            )}
          </div>
          <div style={{ fontSize: '0.88rem', fontWeight: '600', flexGrow: 1, lineHeight: '1.4' }}>
            {toast.message}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(toast.id); }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              padding: '0 4px',
              marginLeft: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none'
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
