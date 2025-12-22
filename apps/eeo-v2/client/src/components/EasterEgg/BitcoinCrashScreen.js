/**
 * Bitcoin Chart Easter Egg - Fullscreen Bitcoin Price Chart
 * 
 * Graf vývoje ceny Bitcoinu od ledna 2021 do současnosti přes celou obrazovku
 */

import React, { useEffect, useState } from 'react';
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
  animation: scrollUp 35s linear 2.5s infinite;
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
      
    } catch (err) {
      console.error('Bitcoin API error:', err);
      setError(`Failed to load data: ${err.message}`);
      
      // Fallback na mock data
      const mockData = generateMockBitcoinData();
      setBitcoinData(mockData);
      setCurrentPrice(mockData[mockData.length - 1].y);
    } finally {
      setLoading(false);
    }
  };

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

  // Chart configuration
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      x: {
        type: 'number',
        easing: 'linear',
        duration: 2000,
        from: NaN,
        delay(ctx) {
          if (ctx.type !== 'data' || ctx.xStarted) {
            return 0;
          }
          ctx.xStarted = true;
          return ctx.index * 8;
        }
      },
      y: {
        type: 'number',
        easing: 'easeInOutQuart',
        duration: 2000,
        from: (ctx) => {
          if (ctx.type === 'data') {
            return ctx.chart.scales.y.getPixelForValue(0);
          }
        },
        delay(ctx) {
          if (ctx.type !== 'data' || ctx.yStarted) {
            return 0;
          }
          ctx.yStarted = true;
          return ctx.index * 8;
        }
      }
    },
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

  const chartData = {
    datasets: [
      {
        label: 'Bitcoin Price (USD)',
        data: bitcoinData || [],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true
      }
    ]
  };

  // Mount efekt
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

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'auto';
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
    <ChartOverlay onClick={onClose}>
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
      {!loading && (
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
      
      {loading ? (
        <LoadingContainer onClick={(e) => e.stopPropagation()}>
          <FontAwesomeIcon icon={faSpinner} className="spinner" />
          <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Načítám data Bitcoinu...
          </div>
          <div style={{ fontSize: '1.2rem', opacity: 0.8 }}>
            Stahování z Yahoo Finance API
          </div>
          <div style={{ fontSize: '1rem', marginTop: '1rem', opacity: 0.6 }}>
            Prosím počkejte, může to trvat několik sekund...
          </div>
        </LoadingContainer>
      ) : error ? (
        <LoadingContainer onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: '1.5rem', color: '#ef4444' }}>
            Chyba API: {error}
          </div>
          <div style={{ fontSize: '1rem', marginTop: '1rem' }}>
            Používám záložní demo data
          </div>
        </LoadingContainer>
      ) : (
        <ChartContainer onClick={(e) => e.stopPropagation()} key={bitcoinData?.length || 'empty'}>
          <Line data={chartData} options={chartOptions} />
        </ChartContainer>
      )}
    </ChartOverlay>,
    document.body
  );
};

export default BitcoinCrashScreen;