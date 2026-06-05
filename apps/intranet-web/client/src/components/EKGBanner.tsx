import React from 'react';

const EKGBanner: React.FC = () => {
  const logoSrc = `${import.meta.env.BASE_URL}logo_zzs_main.png`;

  return (
    <div className="relative w-full bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 overflow-hidden">
      {/* Grid pozadí */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Obsah banneru */}
      <div className="relative z-10 w-full py-3 px-4">
        <div className="flex items-start gap-6">
          {/* Logo vlevo */}
          <div className="flex-shrink-0">
            <img 
              src={logoSrc}
              alt="ZZS SK Logo" 
              className="h-20 w-20 md:h-24 md:w-24 object-contain"
            />
          </div>

          {/* Text a křivka vedle loga */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-white tracking-wide leading-tight">
              Zdravotnická záchranná služba Středočeského kraje, p.o.
            </h1>

            {/* EKG křivka - přes celou šířku vedle loga */}
            <div className="w-full h-12 md:h-14 mt-2">
              <svg
                viewBox="0 0 1200 150"
                className="w-full h-full"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Gradient pro křivku */}
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>

                  {/* Glow efekt */}
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* EKG křivka - path definuje přesnou cestu */}
                <path
                  id="ekgPath"
                  d="M 0,75 L 150,75 L 180,75 L 190,30 L 200,120 L 210,75 L 220,70 L 240,80 L 260,75 
                     L 400,75 L 430,75 L 440,30 L 450,120 L 460,75 L 470,70 L 490,80 L 510,75 
                     L 650,75 L 680,75 L 690,30 L 700,120 L 710,75 L 720,70 L 740,80 L 760,75 
                     L 900,75 L 930,75 L 940,30 L 950,120 L 960,75 L 970,70 L 990,80 L 1010,75 L 1200,75"
                  fill="none"
                  stroke="url(#lineGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glow)"
                />

                {/* Animovaná kulička - sleduje přesně path */}
                <circle r="6" fill="#fbbf24" filter="url(#glow)">
                  <animateMotion
                    dur="6s"
                    repeatCount="indefinite"
                    path="M 0,75 L 150,75 L 180,75 L 190,30 L 200,120 L 210,75 L 220,70 L 240,80 L 260,75 
                          L 400,75 L 430,75 L 440,30 L 450,120 L 460,75 L 470,70 L 490,80 L 510,75 
                          L 650,75 L 680,75 L 690,30 L 700,120 L 710,75 L 720,70 L 740,80 L 760,75 
                          L 900,75 L 930,75 L 940,30 L 950,120 L 960,75 L 970,70 L 990,80 L 1010,75 L 1200,75"
                  />
                </circle>

                {/* Dodatečný glow efekt pro kuličku */}
                <circle r="10" fill="#fbbf24" opacity="0.3">
                  <animateMotion
                    dur="6s"
                    repeatCount="indefinite"
                    path="M 0,75 L 150,75 L 180,75 L 190,30 L 200,120 L 210,75 L 220,70 L 240,80 L 260,75 
                          L 400,75 L 430,75 L 440,30 L 450,120 L 460,75 L 470,70 L 490,80 L 510,75 
                          L 650,75 L 680,75 L 690,30 L 700,120 L 710,75 L 720,70 L 740,80 L 760,75 
                          L 900,75 L 930,75 L 940,30 L 950,120 L 960,75 L 970,70 L 990,80 L 1010,75 L 1200,75"
                  />
                </circle>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EKGBanner;
