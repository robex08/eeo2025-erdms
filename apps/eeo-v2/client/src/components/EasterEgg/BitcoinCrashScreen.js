/**
 * Bitcoin Chart Easter Egg - Fullscreen Bitcoin Price Chart
 * 
 * Graf vývoje ceny Bitcoinu od ledna 2021 do současnosti přes celou obrazovku
 */

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes,
  faSpinner,
  faCoins
} from '@fortawesome/free-solid-svg-icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

// Registrace Chart.js komponent + Filler pro fill efekt
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

// Animace pro fade-in efekt
const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

// Animace pro price glow efekt
const priceGlow = keyframes`
  0%, 100% { 
    text-shadow: 0 0 10px #f59e0b, 0 0 20px #f59e0b, 0 0 30px #f59e0b;
  }
  50% { 
    text-shadow: 0 0 15px #fbbf24, 0 0 25px #fbbf24, 0 0 35px #fbbf24;
  }
`;

// Hlavní overlay kontejner - fullscreen Bitcoin graf
const ChartOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  pointer-events: auto;
  bottom: 0;
  background: rgba(20, 0, 0, 0.90);
  backdrop-filter: blur(12px) brightness(0.7);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  animation: ${fadeIn} 0.5s ease-out;
  padding: 1rem;
  overflow: hidden;
`;

// Zavírací tlačítko
const CloseButton = styled.button`
  position: fixed;
  top: 30px;
  right: 30px;
  background: transparent;
  border: none;
  color: #f59e0b;
  pointer-events: auto;
  font-size: 48px;
  font-weight: bold;
  cursor: pointer;
  padding: 0;
  width: 50px;
  height: 50px;
  transition: all 0.3s ease;
  z-index: 10001;
  text-shadow: 0 0 15px rgba(245, 158, 11, 0.8), 0 0 25px rgba(245, 158, 11, 0.5);
  line-height: 1;
  
  &:hover {
    color: #fbbf24;
    transform: scale(1.2) rotate(90deg);
    text-shadow: 0 0 25px rgba(245, 158, 11, 1), 0 0 40px rgba(245, 158, 11, 0.8);
  }
`;

// Aktuální cena v pravém horním rohu
const CurrentPrice = styled.div`
  position: fixed;
  top: 30px;
  left: 30px;
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid #f59e0b;
  color: #f59e0b;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  z-index: 10001;
  font-size: 2rem;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  animation: ${priceGlow} 3s ease-in-out infinite;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  .bitcoin-icon {
    color: #f59e0b;
    font-size: 2rem;
  }
`;

// Loading container
const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #ffffff;
  
  .spinner {
    font-size: 3rem;
    margin-bottom: 1rem;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

// Graf container
const ChartContainer = styled.div`
  flex: 1;
  width: 100%;
  height: 100%;
  margin-top: 120px;
  margin-bottom: 2rem;
  padding: 0 2rem;
  position: relative;
  
  canvas {
    background: rgba(0, 0, 0, 0.3) !important;
    border-radius: 12px;
  }
`;

// Title nad grafem
const ChartTitle = styled.h1`
  text-align: center;
  color: #ffffff;
  font-size: 2.5rem;
  margin: 1rem 0;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(245, 158, 11, 0.8);
`;

// Credits scrollování
const CreditsOverlay = styled.div`
  position: fixed;
  left: 15%;
  bottom: 20%;
  transform: translateX(0);
  width: 600px;
  height: 60vh;
  overflow: hidden;
  pointer-events: none;
  z-index: 10000;
  opacity: 0.85;
`;

const CreditsScroll = styled.div`
  animation: scrollUp 35s linear 0s infinite;
  color: #f59e0b;
  font-size: 1.25rem;
  text-align: center;
  text-shadow: 0 0 10px rgba(245, 158, 11, 0.8), 0 0 20px rgba(245, 158, 11, 0.4);
  transform: translateY(150vh);
  opacity: 0;
  
  @keyframes scrollUp {
    0% {
      transform: translateY(60vh);
      opacity: 0;
    }
    2% {
      opacity: 1;
    }
    92% {
      opacity: 1;
    }
    100% {
      transform: translateY(-100%);
      opacity: 0;
    }
  }
  
  div {
    margin: 1.2rem 0;
    line-height: 1.7;
  }
  
  .title {
    font-weight: bold;
    font-size: 1.875rem;
    margin-bottom: 2rem;
    color: #fbbf24;
    text-shadow: 0 0 15px rgba(251, 191, 36, 0.9);
  }
  
  .name {
    font-size: 1.5rem;
    color: #f59e0b;
    font-weight: 600;
  }
  
  .role {
    font-size: 1.25rem;
    color: #fcd34d;
    opacity: 0.9;
    margin-top: 0.3rem;
  }
`;

/**
 * Bitcoin Chart Component
 */
const BitcoinCrashScreen = ({ isVisible, onClose }) => {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bitcoinData, setBitcoinData] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [error, setError] = useState(null);
  const [animationPhase, setAnimationPhase] = useState(0); // State pro re-render
  const chartRef = useRef(null);
  const fireworksRef = useRef([]);
  const animationPhaseRef = useRef(0); // 0=načtení, 1=kreslení grafu, 2=kulička+text, 3=psaní PF, 4=ohňostroj
  const phaseStartTimeRef = useRef(Date.now());
  const animationFrameRef = useRef(null);

  // Fetch Bitcoin historical data
  const fetchBitcoinData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${process.env.REACT_APP_API2_BASE_URL}api.php?action=bitcoin/price`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`PHP API error: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Invalid PHP API response format');
      }
      
      // Zpracuj data pro Chart.js
      const chartData = data.data.map(point => ({
        x: new Date(point.date),
        y: Math.round(point.price)
      }));
      
      setBitcoinData(chartData);
      
      // Aktuální cena z API response
      setCurrentPrice(data.currentPrice || chartData[chartData.length - 1].y);
      
      // Počkej 2.5s před startem animace
      setTimeout(() => {
        animationPhaseRef.current = 1;
        setAnimationPhase(1);
        phaseStartTimeRef.current = Date.now();
      }, 2500);
      
    } catch (err) {
      console.error('Bitcoin API error:', err);
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Chart.js plugin pro scanning ball + animace
  const scanningBallPlugin = {
    id: 'scanningBall',
    afterDatasetsDraw: (chart) => {
      if (!bitcoinData || bitcoinData.length === 0) return;
      
      const ctx = chart.ctx;
      const { x: xScale, y: yScale } = chart.scales;
      
      const now = Date.now();
      const elapsed = (now - phaseStartTimeRef.current) / 1000;
      
      // FÁZE 1: Kreslení grafu (3 sekundy) - nic nekresli
      if (animationPhaseRef.current === 1) {
        const graphProgress = Math.min(elapsed / 3, 1);
        
        if (graphProgress >= 1) {
          animationPhaseRef.current = 2;
          setAnimationPhase(2);
          phaseStartTimeRef.current = now;
        }
        return; // Nekresli nic navíc během kreslení grafu
      }
      
      // FÁZE 2: Kulička animuje (30s cyklus)
      if (animationPhaseRef.current >= 2) {
        const ballElapsed = (now % 30000) / 30000;
        const exactIndex = ballElapsed * (bitcoinData.length - 1);
        const index1 = Math.floor(exactIndex);
        const index2 = Math.min(index1 + 1, bitcoinData.length - 1);
        const fraction = exactIndex - index1;
        
        const point1 = bitcoinData[index1];
        const point2 = bitcoinData[index2];
        
        if (point1 && point2) {
          const interpolatedX = point1.x.getTime() + (point2.x.getTime() - point1.x.getTime()) * fraction;
          const interpolatedY = point1.y + (point2.y - point1.y) * fraction;
          
          const xPixel = xScale.getPixelForValue(new Date(interpolatedX));
          const yPixel = yScale.getPixelForValue(interpolatedY);
          
          ctx.save();
          const gradient = ctx.createRadialGradient(xPixel - 2, yPixel - 2, 0, xPixel, yPixel, 7);
          gradient.addColorStop(0, '#fbbf24');
          gradient.addColorStop(1, '#f59e0b');
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#f59e0b';
          ctx.beginPath();
          ctx.arc(xPixel, yPixel, 7, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
          ctx.restore();
        }
      }
      
      // Najdi vrchol pro text
      let peakIndex = 0;
      let peakPrice = 0;
      bitcoinData.forEach((point, idx) => {
        const year = point.x.getFullYear();
        if (year === 2024 && point.y > peakPrice) {
          peakPrice = point.y;
          peakIndex = idx;
        }
      });
      
      // FÁZE 3: Po 30 sekundách začne psaní textu "PF 2026"
      if (animationPhaseRef.current === 2 && elapsed >= 30) {
        animationPhaseRef.current = 3;
        setAnimationPhase(3);
        phaseStartTimeRef.current = now;
      }
      
      // FÁZE 3 a 4+: Kresli text "PF 2026"
      if (animationPhaseRef.current >= 3 && peakIndex > 0) {
        const textElapsed = (now - phaseStartTimeRef.current) / 1000;
        let drawProgress;
        
        // Fáze 3: Postupné psaní (4 sekundy)
        if (animationPhaseRef.current === 3) {
          drawProgress = Math.min(textElapsed / 4, 1);
          
          if (drawProgress >= 1) {
            animationPhaseRef.current = 4;
            setAnimationPhase(4);
            phaseStartTimeRef.current = now;
          }
        } else {
          // Fáze 4+: Text kompletně viditelný
          drawProgress = 1;
        }
        
        if (drawProgress > 0) {
          ctx.save();
          
          const peakPoint = bitcoinData[peakIndex];
          const textX = xScale.getPixelForValue(peakPoint.x) - 150;
          const textY = yScale.getPixelForValue(peakPoint.y) - 100;
          
          const prevPoint = bitcoinData[Math.max(0, peakIndex - 10)];
          const nextPoint = bitcoinData[Math.min(bitcoinData.length - 1, peakIndex + 10)];
          const prevX = xScale.getPixelForValue(prevPoint.x);
          const prevY = yScale.getPixelForValue(prevPoint.y);
          const nextX = xScale.getPixelForValue(nextPoint.x);
          const nextY = yScale.getPixelForValue(nextPoint.y);
          const originalAngle = Math.atan2(nextY - prevY, nextX - prevX);
          const angle = originalAngle + 0.61;
          
          ctx.translate(textX, textY);
          ctx.rotate(angle);
          
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 8;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#f59e0b';
          
          const strokes = [
            { points: [[0, 90], [0, 0]] },
            { points: [[0, 0], [30, -6], [60, 10], [66, 30], [60, 50], [30, 56], [0, 50]] },
            { points: [[80, 90], [80, 0]] },
            { points: [[80, 0], [140, 0]] },
            { points: [[80, 44], [130, 44]] },
            { points: [[200, 20], [214, 6], [234, 6], [250, 16]] },
            { points: [[250, 16], [240, 36], [220, 60], [200, 90]] },
            { points: [[200, 90], [260, 90]] },
            { points: [[280, 20], [300, 10], [320, 10], [340, 20], [344, 50], [340, 80], [320, 90], [300, 90], [280, 80], [276, 50], [280, 20]] },
            { points: [[354, 20], [368, 6], [388, 6], [404, 16]] },
            { points: [[404, 16], [394, 36], [374, 60], [354, 90]] },
            { points: [[354, 90], [414, 90]] },
            { points: [[470, 10], [456, 6], [442, 10], [434, 20], [428, 35], [428, 50], [432, 62]] },
            { points: [[432, 62], [440, 56], [454, 54], [470, 60], [478, 72], [478, 86], [470, 98], [454, 104], [438, 104], [424, 98], [418, 86], [418, 72], [424, 60], [432, 56]] }
          ];
          
          let totalLength = 0;
          strokes.forEach(stroke => {
            for (let i = 0; i < stroke.points.length - 1; i++) {
              const [x1, y1] = stroke.points[i];
              const [x2, y2] = stroke.points[i + 1];
              totalLength += Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            }
          });
          
          const targetLength = totalLength * drawProgress;
          let drawnLength = 0;
          
          ctx.beginPath();
          let isFirstMove = true;
          
          for (const stroke of strokes) {
            for (let i = 0; i < stroke.points.length - 1; i++) {
              const [x1, y1] = stroke.points[i];
              const [x2, y2] = stroke.points[i + 1];
              const segmentLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
              
              if (drawnLength + segmentLength <= targetLength) {
                if (isFirstMove || i === 0) {
                  ctx.moveTo(x1, y1);
                  isFirstMove = false;
                }
                ctx.lineTo(x2, y2);
                drawnLength += segmentLength;
              } else if (drawnLength < targetLength) {
                const remaining = targetLength - drawnLength;
                const ratio = remaining / segmentLength;
                const px = x1 + (x2 - x1) * ratio;
                const py = y1 + (y2 - y1) * ratio;
                if (isFirstMove || i === 0) {
                  ctx.moveTo(x1, y1);
                  isFirstMove = false;
                }
                ctx.lineTo(px, py);
                drawnLength = targetLength;
                break;
              }
              
              if (drawnLength >= targetLength) break;
            }
            if (drawnLength >= targetLength) break;
          }
          
          ctx.stroke();
          ctx.restore();
        }
      }
      
      // FÁZE 4: Ohňostroj - inicializace a animace
      if (animationPhaseRef.current >= 4) {
        // Inicializace raket pouze jednou
        if (fireworksRef.current.length === 0) {
          for (let i = 0; i < 21; i++) {
            fireworksRef.current.push({
              x: Math.random() * chart.width,
              y: chart.height,
              targetY: 60 + Math.random() * 280,
              speed: 5 + Math.random() * 4,
              color: ['#fbbf24', '#f59e0b', '#ff6b6b', '#4ecdc4', '#95e1d3', '#f38181', '#ffd93d', '#6bcfff', '#ff85a2', '#a8e6cf'][Math.floor(Math.random() * 10)],
              exploded: false,
              explosionTime: 0,
              particles: []
            });
          }
        }
        
        // Animace raket a výbuchů
        fireworksRef.current.forEach((rocket, idx) => {
          if (!rocket.exploded) {
            rocket.y -= rocket.speed;
            
            ctx.save();
            ctx.fillStyle = rocket.color;
            ctx.shadowBlur = 18;
            ctx.shadowColor = rocket.color;
            ctx.beginPath();
            ctx.arc(rocket.x, rocket.y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = rocket.color;
            ctx.lineWidth = 4;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.moveTo(rocket.x, rocket.y);
            ctx.lineTo(rocket.x, rocket.y + 25);
            ctx.stroke();
            ctx.restore();
            
            if (rocket.y <= rocket.targetY) {
              rocket.exploded = true;
              rocket.explosionTime = Date.now();
              
              for (let i = 0; i < 100; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1 + Math.random() * 8;
                const spreadFactor = 0.3 + Math.random() * 1.2;
                
                rocket.particles.push({
                  x: rocket.x,
                  y: rocket.y,
                  vx: Math.cos(angle) * speed * spreadFactor,
                  vy: Math.sin(angle) * speed * spreadFactor,
                  life: 0.8 + Math.random() * 0.4,
                  decay: 0.008 + Math.random() * 0.012,
                  size: 1.5 + Math.random() * 3
                });
              }
            }
          } else {
            const elapsedExplosion = (Date.now() - rocket.explosionTime) / 1000;
            
            if (elapsedExplosion < 3) {
              rocket.particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.18;
                p.vx *= 0.98;
                p.life -= p.decay;
                
                if (p.life > 0) {
                  ctx.save();
                  ctx.globalAlpha = p.life * 0.95;
                  ctx.fillStyle = rocket.color;
                  ctx.shadowBlur = 25;
                  ctx.shadowColor = rocket.color;
                  ctx.beginPath();
                  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.restore();
                }
              });
            } else {
              fireworksRef.current[idx] = {
                x: Math.random() * chart.width,
                y: chart.height,
                targetY: 60 + Math.random() * 280,
                speed: 5 + Math.random() * 4,
                color: ['#fbbf24', '#f59e0b', '#ff6b6b', '#4ecdc4', '#95e1d3', '#f38181', '#ffd93d', '#6bcfff', '#ff85a2', '#a8e6cf'][Math.floor(Math.random() * 10)],
                exploded: false,
                explosionTime: 0,
                particles: []
              };
            }
          }
        });
      }
    }
  };
  
  // Animační loop pro kuličku, text a ohňostroj
  useEffect(() => {
    if (!bitcoinData || !chartRef.current) return;
    
    const animate = () => {
      const currentPhase = animationPhaseRef.current;
      
      // Update vždy kromě fáze 0 (čekání na data)
      if (chartRef.current && currentPhase >= 1) {
        chartRef.current.update('none');
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [bitcoinData, animationPhase]);

  // Mock data s realistickými historickými trendy
  const generateMockBitcoinData = () => {
    const data = [];
    const startDate = new Date('2021-01-01');
    const endDate = new Date();
    
    // Historické klíčové ceny Bitcoin
    const historicalPoints = [
      { date: '2021-01-01', price: 29000 },
      { date: '2021-04-01', price: 58000 }, // Spring rally
      { date: '2021-07-01', price: 35000 }, // Summer dip
      { date: '2021-11-01', price: 67000 }, // All-time high
      { date: '2022-01-01', price: 47000 },
      { date: '2022-06-01', price: 30000 }, // Bear market
      { date: '2022-11-01', price: 20000 }, // FTX crash
      { date: '2023-01-01', price: 16500 },
      { date: '2023-03-01', price: 23000 }, // Recovery start
      { date: '2024-01-01', price: 42000 }, // ETF approval
      { date: '2024-03-01', price: 70000 }, // New ATH
      { date: '2024-12-01', price: 95000 }, // Current area
      { date: '2025-12-22', price: 98500 }  // Today
    ];
    
    // Interpolace mezi klíčovými body
    for (let i = 0; i < historicalPoints.length - 1; i++) {
      const startPoint = historicalPoints[i];
      const endPoint = historicalPoints[i + 1];
      
      const startDate = new Date(startPoint.date);
      const endDate = new Date(endPoint.date);
      const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
      
      const priceDiff = endPoint.price - startPoint.price;
      
      // Generuj denní data mezi klíčovými body
      for (let day = 0; day <= daysDiff; day += 7) { // Weekly data
        const currentDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
        const progress = day / daysDiff;
        
        // Lineární interpolace s volatilitou
        let price = startPoint.price + (priceDiff * progress);
        
        // Přidej volatilitu ±3%
        const volatility = 0.03 * (Math.random() - 0.5) * 2;
        price *= (1 + volatility);
        
        // Weekendový efekt - mírně nižší ceny
        if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
          price *= 0.998;
        }
        
        data.push({
          x: new Date(currentDate),
          y: Math.round(Math.max(price, 10000)) // Min $10k
        });
      }
    }
    
    return data.filter((point, index) => 
      index === 0 || point.x.getTime() !== data[index - 1]?.x.getTime()
    ).sort((a, b) => a.x - b.x);
  };

  // Chart configuration s vlastním pluginem pro scanning ball
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    events: [],
    animation: false,
    plugins: {
      title: {
        display: false
      },
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#f59e0b',
        bodyColor: '#ffffff',
        borderColor: '#f59e0b',
        borderWidth: 1,
        callbacks: {
          label: (context) => `$${context.parsed.y.toLocaleString()}`
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'month',
          displayFormats: {
            month: 'MMM yyyy'
          }
        },
        grid: {
          color: 'rgba(245, 158, 11, 0.3)',
          borderColor: '#f59e0b'
        },
        ticks: {
          color: '#f59e0b',
          font: {
            size: 12
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(245, 158, 11, 0.3)',
          borderColor: '#f59e0b'
        },
        ticks: {
          color: '#f59e0b',
          font: {
            size: 12
          },
          callback: (value) => `$${value.toLocaleString()}`
        }
      }
    },
    elements: {
      line: {
        borderColor: '#f59e0b',
        borderWidth: 3,
        tension: 0.1
      },
      point: {
        backgroundColor: '#f59e0b',
        borderColor: '#ffffff',
        borderWidth: 2,
        radius: 0,
        hoverRadius: 6
      }
    }
  };

  // Dynamicky generuj viditelná data podle fáze animace
  const getVisibleData = () => {
    if (!bitcoinData || bitcoinData.length === 0) return null;
    
    // Fáze 0: Počkej na start - vrať null aby se graf nevykresloval
    if (animationPhaseRef.current === 0) return null;
    
    // Fáze 1+: Všechna data najednou (Chart.js si je vyanimuje sám)
    return bitcoinData;
  };

  const chartData = {
    datasets: [
      {
        label: 'Bitcoin Price (USD)',
        data: getVisibleData() || [],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true
      }
    ]
  };

  // Mount efekt + Visibility API pro auto-refresh
  useEffect(() => {
    if (isVisible) {
      setMounted(true);
      fetchBitcoinData();
      
      // Disable scrolling
      document.body.style.overflow = 'hidden';
      
      // ESC key zavře overlay
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      // Visibility API - refresh grafu každých 5 minut, ale jen pokud je stránka viditelná
      let refreshInterval = null;
      
      const handleVisibilityChange = () => {
        if (document.hidden) {
          // Stránka je skrytá - zastavit interval
          if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
          }
        } else {
          // Stránka je viditelná - spustit interval
          if (!refreshInterval) {
            refreshInterval = setInterval(() => {
              fetchBitcoinData();
            }, 5 * 60 * 1000); // 5 minut
          }
        }
      };

      // Spustit interval, pokud je stránka viditelná
      if (!document.hidden) {
        refreshInterval = setInterval(() => {
          fetchBitcoinData();
        }, 5 * 60 * 1000); // 5 minut
      }

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        document.body.style.overflow = 'auto';
        
        // Vyčisti interval
        if (refreshInterval) {
          clearInterval(refreshInterval);
        }
      };
    } else {
      setMounted(false);
      document.body.style.overflow = 'auto';
    }
  }, [isVisible, onClose]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  if (!isVisible || !mounted) {
    return null;
  }

  // Render portal
  return createPortal(
    <ChartOverlay onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <CloseButton onClick={onClose}>
        <FontAwesomeIcon icon={faTimes} />
      </CloseButton>
      
      {currentPrice && (
        <CurrentPrice>
          <FontAwesomeIcon icon={faCoins} className="bitcoin-icon" />
          ${currentPrice.toLocaleString()}
        </CurrentPrice>
      )}
      
      <ChartTitle>
        Historie ceny Bitcoinu (leden 2021 - současnost)
      </ChartTitle>
      
      {/* Credits scrollování v místě bear marketu */}
      {!loading && animationPhase >= 2 && (
        <CreditsOverlay>
          <CreditsScroll>
            <div className="title" style={{ fontSize: '2.25rem' }}>EEO v2 © 2025</div>
            
            <div style={{ marginBottom: '2.5rem', fontSize: '1.375rem', lineHeight: '1.9' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.8rem' }}>Elektronická evidence objednávek</div>
              <div style={{ fontSize: '1.25rem', opacity: 0.9 }}>
                Komplexní webová platforma pro správu objednávek,
                faktur a pokladní knihy včetně evidování
                faktur ze spisové služby
              </div>
            </div>
            
            <div style={{ marginTop: '2.5rem', fontSize: '1.15rem', opacity: 0.85, lineHeight: '1.8' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Co systém nabízí:</strong>
              </div>
              <div>✓ Kompletní správa objednávek a jejich životního cyklu</div>
              <div>✓ Evidence faktur a vazba na spisovou službu</div>
              <div>✓ Pokladní kniha s kontrolními mechanismy</div>
              <div>✓ Elektronické schvalovací workflow s eskalací</div>
              <div>✓ Real-time notifikace a chat mezi uživateli</div>
              <div>✓ Audit trail všech operací a změn</div>
              <div>✓ Integrace s Microsoft Entra ID (Azure AD)</div>
              <div>✓ Plně responzivní design pro mobil i desktop</div>
              <div>✓ Automatické e-mailové notifikace o změnách</div>
              <div>✓ Pokročilé filtrování a fulltextové vyhledávání</div>
              <div>✓ Export dat do PDF a Excel formátů</div>
            </div>
            
            <div className="title" style={{ marginTop: '4rem', fontSize: '1.625rem' }}>Realizační tým</div>
            
            <div style={{ fontSize: '1.19rem' }}>
              <div className="name" style={{ fontSize: '1.375rem' }}>Tereza Bezoušková</div>
              <div className="role" style={{ fontSize: '1.125rem' }}>Garant projektu</div>
            </div>
            
            <div style={{ fontSize: '1.19rem' }}>
              <div className="name" style={{ fontSize: '1.375rem' }}>Robert Holovský</div>
              <div className="role" style={{ fontSize: '1.125rem' }}>Programátor UIX, frontend a backend developer</div>
            </div>
            
            <div className="title" style={{ marginTop: '2rem', fontSize: '1.5rem' }}>BETA testeři</div>
            
            <div style={{ fontSize: '1.19rem' }}>
              <div className="name" style={{ fontSize: '1.3125rem' }}>Klára Šulgánová</div>
            </div>
            
            <div style={{ fontSize: '1.19rem' }}>
              <div className="name" style={{ fontSize: '1.3125rem' }}>Hana Jonášová</div>
            </div>
            
            <div style={{ fontSize: '1.19rem' }}>
              <div className="name" style={{ fontSize: '1.3125rem' }}>Hana Sochůrková</div>
            </div>
            
            <div className="title" style={{ marginTop: '3rem', fontSize: '1.5rem' }}>Ekonomické oddělení</div>
            
            <div style={{ fontSize: '1.1rem', lineHeight: '1.8' }}>
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '1rem', opacity: 0.7 }}>Účtárna – Pokladna</div>
                <div className="name" style={{ fontSize: '1.25rem' }}>Jaroslava Zahrádková</div>
              </div>
              
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '1rem', opacity: 0.7 }}>Účtárna</div>
                <div className="name" style={{ fontSize: '1.25rem' }}>Martina Slezáčková</div>
              </div>
              
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '1rem', opacity: 0.7 }}>Smlouvy</div>
                <div className="name" style={{ fontSize: '1.25rem' }}>Karolína Wlachová</div>
              </div>
              
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '1rem', opacity: 0.7 }}>Rozpočet</div>
                <div className="name" style={{ fontSize: '1.25rem' }}>Vojtěch Voštinka</div>
              </div>
            </div>
            
            <div style={{ marginTop: '3rem', fontSize: '1rem', opacity: 0.6 }}>
              Vytvořeno s ❤️ pro ZZS Středočeského kraje
            </div>
          </CreditsScroll>
        </CreditsOverlay>
      )}
      
      {/* Graf se vždy zobrazuje - data se načítají na pozadí */}
      <ChartContainer onClick={(e) => e.stopPropagation()}>
        
        {bitcoinData ? (
          <Line 
            ref={chartRef}
            data={chartData} 
            options={chartOptions} 
            plugins={[scanningBallPlugin]} 
          />
        ) : (
          <LoadingContainer onClick={(e) => e.stopPropagation()}>
            <FontAwesomeIcon icon={faSpinner} className="spinner" />
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
              Načítám graf...
            </div>
          </LoadingContainer>
        )}
      </ChartContainer>
    </ChartOverlay>,
    document.body
  );
};

export default BitcoinCrashScreen;