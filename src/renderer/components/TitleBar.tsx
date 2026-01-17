/**
 * TitleBar - Custom frameless window title bar with window controls
 */

import React, { useState, useEffect, useCallback } from 'react';
import './TitleBar.css';

interface TitleBarProps {
  title?: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ title = 'NeoQueue' }) => {
  const [isMaximized, setIsMaximized] = useState(false);

  // Check initial maximized state and listen for changes
  useEffect(() => {
    const checkMaximized = async () => {
      if (window.electronAPI?.windowIsMaximized) {
        const maximized = await window.electronAPI.windowIsMaximized();
        setIsMaximized(maximized);
      }
    };
    
    checkMaximized();

    // Poll for maximize state changes (resize events)
    const handleResize = () => {
      checkMaximized();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMinimize = useCallback(() => {
    window.electronAPI?.windowMinimize?.();
  }, []);

  const handleMaximize = useCallback(() => {
    window.electronAPI?.windowMaximize?.();
    // The resize event listener will update the state
  }, []);

  const handleClose = useCallback(() => {
    window.electronAPI?.windowClose?.();
  }, []);

  return (
    <div className="title-bar">
      <div className="title-bar-drag-region">
        <span className="title-bar-title">{title}</span>
      </div>
      <div className="title-bar-controls">
        <button
          className="title-bar-btn minimize"
          onClick={handleMinimize}
          aria-label="Minimize"
          title="Minimize"
        >
          <span>—</span>
        </button>
        <button
          className="title-bar-btn maximize"
          onClick={handleMaximize}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          <span>{isMaximized ? '❐' : '□'}</span>
        </button>
        <button
          className="title-bar-btn close"
          onClick={handleClose}
          aria-label="Close"
          title="Close"
        >
          <span>✕</span>
        </button>
      </div>
    </div>
  );
};
