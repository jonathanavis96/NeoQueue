/**
 * RainControl - Toggle button with slider for Matrix rain
 * Umbrella icon toggles rain, slider appears below when active
 * Click outside to dismiss slider
 */

import React, { useState, useEffect, useRef } from 'react';
import './RainControl.css';

interface RainControlProps {
  enabled: boolean;
  intensity: number;
  onToggle: (enabled: boolean) => void;
  onChangeIntensity: (intensity: number) => void;
}

export const RainControl: React.FC<RainControlProps> = ({
  enabled,
  intensity,
  onToggle,
  onChangeIntensity,
}) => {
  const [showSlider, setShowSlider] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Show slider when rain is enabled
  useEffect(() => {
    if (enabled) {
      setShowSlider(true);
    }
  }, [enabled]);

  // Close slider when clicking outside
  useEffect(() => {
    if (!showSlider) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSlider(false);
      }
    };

    // Delay adding listener to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSlider]);

  const handleButtonClick = () => {
    if (enabled) {
      // If already on, toggle slider visibility or turn off
      if (showSlider) {
        onToggle(false);
        setShowSlider(false);
      } else {
        setShowSlider(true);
      }
    } else {
      // Turn on and show slider
      onToggle(true);
      setShowSlider(true);
    }
  };

  // Calculate percentage position for the label (0-100 maps to slider width)
  const sliderWidth = 100; // px
  const thumbOffset = ((intensity - 1) / 99) * sliderWidth;

  return (
    <div className="rain-control" ref={containerRef}>
      <button
        type="button"
        className={`rain-control-button ${enabled ? 'is-active' : ''}`}
        onClick={handleButtonClick}
        aria-label={enabled ? 'Matrix rain settings' : 'Turn on Matrix rain'}
        aria-pressed={enabled}
        title={enabled ? 'Matrix rain ON' : 'Matrix rain OFF'}
      >
        ☔
      </button>
      
      {showSlider && enabled && (
        <div className="rain-control-slider-bar">
          <div className="rain-control-slider-track">
            <input
              type="range"
              className="rain-control-slider"
              min={1}
              max={100}
              value={intensity}
              onChange={(e) => onChangeIntensity(Number(e.target.value))}
              aria-label={`Rain intensity: ${intensity}%`}
            />
            <span 
              className="rain-control-percent"
              style={{ left: `${thumbOffset}px` }}
            >
              {intensity}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

RainControl.displayName = 'RainControl';
