/**
 * MatrixRainBackground - Full-screen Matrix rain effect
 * 
 * Classic Matrix digital rain with:
 * - Full width coverage below title bar
 * - Renders BEHIND all UI elements (z-index: 0)
 * - Continuous character streams (~12 chars) falling smoothly
 * - Bright head (almost white-green), progressively fading trail
 * - 1-2 characters in each stream randomly mutate as they fall
 */

import React, { useEffect, useRef, memo } from 'react';
import './MatrixRainBackground.css';

// Classic Matrix half-width katakana + numbers
const MATRIX_CHARS = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789';

// A single falling stream of characters
interface RainStream {
  x: number;           // x position in pixels
  y: number;           // y position of HEAD character in pixels
  speed: number;       // pixels per frame
  chars: string[];     // the stream of characters (index 0 = head)
  active: boolean;     // whether this column is currently raining
}

const randomChar = () => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];

interface MatrixRainBackgroundProps {
  /** Intensity from 0 (off) to 100 (dense). Default 15 */
  intensity: number;
}

export const MatrixRainBackground = memo(({ intensity }: MatrixRainBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamsRef = useRef<RainStream[]>([]);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (intensity <= 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Character sizing
    const CHAR_SIZE = 18; // Font size in pixels
    const CHAR_HEIGHT = CHAR_SIZE * 1.2; // Line height
    const STREAM_LENGTH = 12; // Characters per stream

    // Set canvas size to fill container
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      
      // Reinitialize streams on resize
      initStreams(rect.width, rect.height);
    };

    const initStreams = (width: number, height: number) => {
      const columnWidth = CHAR_SIZE; // One character width per column
      const numColumns = Math.floor(width / columnWidth);
      
      // Active columns based on intensity (0-100 maps to 5%-60% of columns active)
      const activeRatio = 0.05 + (intensity / 100) * 0.55;
      const numActive = Math.max(1, Math.floor(numColumns * activeRatio));

      streamsRef.current = [];
      
      // Randomly select which columns are active
      const activeIndices = new Set<number>();
      while (activeIndices.size < numActive) {
        activeIndices.add(Math.floor(Math.random() * numColumns));
      }

      for (let i = 0; i < numColumns; i++) {
        // Each stream starts at a random Y position (some already on screen, some above)
        const startY = Math.random() * (height + STREAM_LENGTH * CHAR_HEIGHT) - STREAM_LENGTH * CHAR_HEIGHT;
        
        streamsRef.current.push({
          x: i * columnWidth + columnWidth / 2,
          y: startY,
          speed: 1.5 + Math.random() * 2.5, // Varied speeds for organic feel
          chars: Array.from({ length: STREAM_LENGTH }, randomChar),
          active: activeIndices.has(i),
        });
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = (timestamp: number) => {
      // Calculate delta time for smooth animation
      const deltaTime = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 16.67 : 1;
      lastTimeRef.current = timestamp;

      // Use canvas dimensions divided by dpr for logical coordinates
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      
      // Clear the canvas with transparency (body provides black background)
      ctx.clearRect(0, 0, width, height);

      ctx.font = `${CHAR_SIZE}px monospace`;
      ctx.textAlign = 'center';

      streamsRef.current.forEach((stream) => {
        if (!stream.active) return;

        // Move stream down smoothly
        stream.y += stream.speed * deltaTime;

        // Check if stream has completely fallen off screen
        const streamBottom = stream.y - (STREAM_LENGTH - 1) * CHAR_HEIGHT;
        if (streamBottom > height) {
          // Reset to top
          stream.y = -CHAR_HEIGHT;
          stream.speed = 1.5 + Math.random() * 2.5;
          stream.chars = Array.from({ length: STREAM_LENGTH }, randomChar);
          
          // Chance to swap with another inactive column for organic feel
          if (Math.random() < 0.2) {
            stream.active = false;
            const inactiveStreams = streamsRef.current.filter((s) => !s.active);
            if (inactiveStreams.length > 0) {
              const toActivate = inactiveStreams[Math.floor(Math.random() * inactiveStreams.length)];
              toActivate.active = true;
              toActivate.y = -CHAR_HEIGHT;
              toActivate.chars = Array.from({ length: STREAM_LENGTH }, randomChar);
            }
          }
        }

        // Randomly mutate 1-2 characters in the stream (not the head)
        // This creates the classic "glitching" effect
        if (Math.random() < 0.08) {
          const mutateIdx = 1 + Math.floor(Math.random() * (stream.chars.length - 1));
          stream.chars[mutateIdx] = randomChar();
        }
        if (Math.random() < 0.03) {
          const mutateIdx = 1 + Math.floor(Math.random() * (stream.chars.length - 1));
          stream.chars[mutateIdx] = randomChar();
        }

        // Draw each character in the stream
        stream.chars.forEach((char, i) => {
          const charY = stream.y - i * CHAR_HEIGHT;
          
          // Skip if off screen
          if (charY < -CHAR_HEIGHT || charY > height + CHAR_HEIGHT) return;

          // Calculate color: head is bright white-green, trail fades progressively
          let r: number, g: number, b: number, alpha: number;
          
          if (i === 0) {
            // Head character - almost white with green tint
            r = 180;
            g = 255;
            b = 180;
            alpha = 1.0;
          } else {
            // Trail characters - progressively fade to dark green
            const fadeRatio = i / (STREAM_LENGTH - 1);
            const brightness = Math.max(0.1, 1 - fadeRatio * 0.9);
            r = Math.floor(30 * brightness);
            g = Math.floor(255 * brightness);
            b = Math.floor(30 * brightness);
            alpha = Math.max(0.15, 1 - fadeRatio * 0.85);
          }

          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx.fillText(char, stream.x, charY);
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, [intensity]);

  if (intensity <= 0) return null;

  return (
    <canvas
      ref={canvasRef}
      className="matrix-rain-background"
      aria-hidden="true"
    />
  );
});

MatrixRainBackground.displayName = 'MatrixRainBackground';
