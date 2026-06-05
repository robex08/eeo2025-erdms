import React from 'react';

const EKGBannerV2: React.FC = () => {
  const logoSrc = `${import.meta.env.BASE_URL}logo_zzs_main.png`;

  return (
    <div className="relative w-full bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 overflow-hidden">
      {/* Grid pozadí */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-v2" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-v2)" />
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

            {/* EKG křivka s textem INTRANET - přes celou šířku vedle loga */}
            <div className="w-full h-12 md:h-14 mt-2 relative">
              <svg
                viewBox="0 0 1200 100"
                className="w-full h-full"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Glow efekt */}
                  <filter id="glowV2">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* Hlavní EKG křivka - písmena INTRANET jsou součástí křivky */}
                <path
                  d="M 0,70 L 100,70 L 110,50 L 120,80 L 130,70 L 160,70
                     L 170,70 L 170,35 L 170,70 L 182,70 L 195,70
                     L 205,70 L 205,35 L 227,70 L 227,35 L 227,70 L 239,70 L 252,70
                     L 265,70 L 265,35 L 252,35 L 278,35 L 265,35 L 265,70 L 278,70 L 291,70
                     L 301,70 L 301,35 L 314,35 Q 323,35 323,44 Q 323,51 314,51 L 301,51 L 310,51 L 323,70 L 336,70
                     L 349,70 L 361,35 L 367,52 L 355,52 L 367,52 L 373,70 L 386,70
                     L 399,70 L 399,35 L 421,70 L 421,35 L 421,70 L 433,70
                     L 446,70 L 446,35 L 468,35 L 446,35 L 446,51 L 464,51 L 446,51 L 446,70 L 477,70
                     L 490,70 L 490,35 L 477,35 L 503,35 L 490,35 L 490,70 L 503,70 L 516,70
                     L 560,70 L 570,50 L 580,80 L 590,70 L 720,70 L 730,50 L 740,80 L 750,70 L 880,70 L 890,50 L 900,80 L 910,70 L 1200,70"
                  fill="none"
                  stroke="#FFE600"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glowV2)"
                />

                {/* Animovaná kulička */}
                <circle r="5" fill="#FFE600" filter="url(#glowV2)">
                  <animateMotion
                    dur="12s"
                    repeatCount="indefinite"
                    path="M 0,70 L 100,70 L 110,50 L 120,80 L 130,70 L 160,70
                          L 170,70 L 170,35 L 170,70 L 182,70 L 195,70
                          L 205,70 L 205,35 L 227,70 L 227,35 L 227,70 L 239,70 L 252,70
                          L 265,70 L 265,35 L 252,35 L 278,35 L 265,35 L 265,70 L 278,70 L 291,70
                          L 301,70 L 301,35 L 314,35 Q 323,35 323,44 Q 323,51 314,51 L 301,51 L 310,51 L 323,70 L 336,70
                          L 349,70 L 361,35 L 367,52 L 355,52 L 367,52 L 373,70 L 386,70
                          L 399,70 L 399,35 L 421,70 L 421,35 L 421,70 L 433,70
                          L 446,70 L 446,35 L 468,35 L 446,35 L 446,51 L 464,51 L 446,51 L 446,70 L 477,70
                          L 490,70 L 490,35 L 477,35 L 503,35 L 490,35 L 490,70 L 503,70 L 516,70
                          L 560,70 L 570,50 L 580,80 L 590,70 L 720,70 L 730,50 L 740,80 L 750,70 L 880,70 L 890,50 L 900,80 L 910,70 L 1200,70"
                  />
                </circle>

                {/* Glow efekt pro kuličku */}
                <circle r="8" fill="#FFE600" opacity="0.3">
                  <animateMotion
                    dur="12s"
                    repeatCount="indefinite"
                    path="M 0,70 L 100,70 L 110,50 L 120,80 L 130,70 L 160,70
                          L 170,70 L 170,35 L 170,70 L 182,70 L 195,70
                          L 205,70 L 205,35 L 227,70 L 227,35 L 227,70 L 239,70 L 252,70
                          L 265,70 L 265,35 L 252,35 L 278,35 L 265,35 L 265,70 L 278,70 L 291,70
                          L 301,70 L 301,35 L 314,35 Q 323,35 323,44 Q 323,51 314,51 L 301,51 L 310,51 L 323,70 L 336,70
                          L 349,70 L 361,35 L 367,52 L 355,52 L 367,52 L 373,70 L 386,70
                          L 399,70 L 399,35 L 421,70 L 421,35 L 421,70 L 433,70
                          L 446,70 L 446,35 L 468,35 L 446,35 L 446,51 L 464,51 L 446,51 L 446,70 L 477,70
                          L 490,70 L 490,35 L 477,35 L 503,35 L 490,35 L 490,70 L 503,70 L 516,70
                          L 560,70 L 570,50 L 580,80 L 590,70 L 720,70 L 730,50 L 740,80 L 750,70 L 880,70 L 890,50 L 900,80 L 910,70 L 1200,70"
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

export default EKGBannerV2;
