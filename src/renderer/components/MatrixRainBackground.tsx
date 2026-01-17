/**
 * MatrixRainBackground - Full-screen Matrix rain effect
 * 
 * Classic Matrix digital rain with:
 * - Full width coverage below title bar
 * - Renders BEHIND all UI elements (z-index: 0)
 * - Continuous character streams (~12 chars) falling smoothly
 * - Bright head (almost white-green), progressively fading trail
 * - 1-2 characters in each stream randomly mutate as they fall
 * 
 * Intensity behavior:
 * - 1%: 1 drop every ~10 minutes (very rare)
 * - 10%: 1 drop every ~30 seconds
 * - 15%: 1 drop always active
 * - 50%+: multiple drops, increasingly dense
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
  const lastSpawnTimeRef = useRef<number>(0);
  const intensityRef = useRef<number>(intensity);

  // Keep intensity ref updated
  intensityRef.current = intensity;

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

    // Calculate spawn interval based on intensity
    // At 1%: ~600000ms (10 minutes)
    // At 10%: ~30000ms (30 seconds)
    // At 15%: ~0ms (always active)
    // Higher values: multiple streams active
    const getSpawnInterval = (int: number): number => {
      if (int >= 15) return 0; // Always have drops
      // Exponential curve from 10 minutes at 1% to 0 at 15%
      // Using formula: interval = baseInterval * e^(-k * intensity)
      const maxInterval = 600000; // 10 minutes in ms
      const k = 0.35; // Decay rate
      return maxInterval * Math.exp(-k * int);
    };

    // Calculate number of concurrent active streams for higher intensities
    const getTargetActiveCount = (int: number, numColumns: number): number => {
      if (int < 15) return 1; // Sparse mode - max 1 at a time (spawned by timer)
      // From 15% onwards, scale up
      // 15%: 1 drop, 50%: ~15% of columns, 100%: ~50% of columns
      const normalizedInt = (int - 15) / 85; // 0 to 1 for 15-100%
      const ratio = 0.01 + Math.pow(normalizedInt, 2) * 0.49;
      return Math.max(1, Math.floor(numColumns * ratio));
    };

    let canvasWidth = 0;
    let canvasHeight = 0;

    // Set canvas size to fill container
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      canvasWidth = rect.width;
      canvasHeight = rect.height;
      
      // Reinitialize streams on resize
      initStreams(rect.width, rect.height);
    };

    const initStreams = (width: number, height: number) => {
      const columnWidth = CHAR_SIZE;
      const numColumns = Math.floor(width / columnWidth);
      const currentIntensity = intensityRef.current;
      const targetActive = getTargetActiveCount(currentIntensity, numColumns);
      
      streamsRef.current = [];
      
      // For sparse mode (< 15%), start with no active streams
      // They will be spawned by the timer
      const startActive = currentIntensity >= 15 ? targetActive : 0;
      
      // Randomly select initial active columns
      const activeIndices = new Set<number>();
      while (activeIndices.size < startActive) {
        activeIndices.add(Math.floor(Math.random() * numColumns));
      }

      for (let i = 0; i < numColumns; i++) {
        const startY = activeIndices.has(i) 
          ? Math.random() * (height + STREAM_LENGTH * CHAR_HEIGHT) - STREAM_LENGTH * CHAR_HEIGHT
          : -STREAM_LENGTH * CHAR_HEIGHT * 2; // Off screen
        
        streamsRef.current.push({
          x: i * columnWidth + columnWidth / 2,
          y: startY,
          speed: 1.5 + Math.random() * 2.5,
          chars: Array.from({ length: STREAM_LENGTH }, randomChar),
          active: activeIndices.has(i),
        });
      }
      
      // Reset spawn timer
      lastSpawnTimeRef.current = performance.now();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = (timestamp: number) => {
      // Calculate delta time for smooth animation
      const deltaTime = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 16.67 : 1;
      lastTimeRef.current = timestamp;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      
      ctx.clearRect(0, 0, width, height);
      ctx.font = `${CHAR_SIZE}px monospace`;
      ctx.textAlign = 'center';

      const currentIntensity = intensityRef.current;
      const spawnInterval = getSpawnInterval(currentIntensity);
      const numColumns = streamsRef.current.length;
      const targetActive = getTargetActiveCount(currentIntensity, numColumns);

      // Sparse mode: spawn drops based on timer
      if (currentIntensity < 15 && spawnInterval > 0) {
        const timeSinceLastSpawn = timestamp - lastSpawnTimeRef.current;
        const activeCount = streamsRef.current.filter(s => s.active).length;
        
        // Spawn a new drop if enough time has passed and no drop is currently active
        if (timeSinceLastSpawn >= spawnInterval && activeCount === 0) {
          const inactiveStreams = streamsRef.current.filter(s => !s.active);
          if (inactiveStreams.length > 0) {
            const toActivate = inactiveStreams[Math.floor(Math.random() * inactiveStreams.length)];
            toActivate.active = true;
            toActivate.y = -CHAR_HEIGHT;
            toActivate.chars = Array.from({ length: STREAM_LENGTH }, randomChar);
            toActivate.speed = 1.5 + Math.random() * 2.5;
            lastSpawnTimeRef.current = timestamp;
          }
        }
      }

      // Process each stream
      streamsRef.current.forEach((stream) => {
        if (!stream.active) return;

        // Move stream down
        stream.y += stream.speed * deltaTime;

        // Check if stream has fallen off screen
        const streamTop = stream.y - (STREAM_LENGTH - 1) * CHAR_HEIGHT;
        if (streamTop > height) {
          // Deactivate this stream
          stream.active = false;
          
          // For higher intensities (>= 15%), immediately activate another
          if (currentIntensity >= 15) {
            const activeCount = streamsRef.current.filter(s => s.active).length;
            if (activeCount < targetActive) {
              // Activate a random inactive column
              const inactiveStreams = streamsRef.current.filter(s => !s.active);
              if (inactiveStreams.length > 0) {
                const toActivate = inactiveStreams[Math.floor(Math.random() * inactiveStreams.length)];
                toActivate.active = true;
                toActivate.y = -CHAR_HEIGHT;
                toActivate.chars = Array.from({ length: STREAM_LENGTH }, randomChar);
                toActivate.speed = 1.5 + Math.random() * 2.5;
              }
            }
          }
          // For sparse mode, the timer will handle respawning
          return;
        }

        // Randomly mutate 1-2 characters (classic glitch effect)
        if (Math.random() < 0.08) {
          const mutateIdx = 1 + Math.floor(Math.random() * (stream.chars.length - 1));
          stream.chars[mutateIdx] = randomChar();
        }
        if (Math.random() < 0.03) {
          const mutateIdx = 1 + Math.floor(Math.random() * (stream.chars.length - 1));
          stream.chars[mutateIdx] = randomChar();
        }

        // Draw each character
        stream.chars.forEach((char, i) => {
          const charY = stream.y - i * CHAR_HEIGHT;
          if (charY < -CHAR_HEIGHT || charY > height + CHAR_HEIGHT) return;

          let r: number, g: number, b: number, alpha: number;
          
          if (i === 0) {
            // Head - bright white-green
            r = 180; g = 255; b = 180; alpha = 1.0;
          } else {
            // Trail - progressive fade
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
