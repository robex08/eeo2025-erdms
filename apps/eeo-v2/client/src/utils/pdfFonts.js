/**
 * ALTERNATIVNÍ KONFIGURACE FONTŮ PRO POKLADNÍ KNIHU PDF
 *
 * Tento soubor obsahuje různé způsoby, jak nastavit fonty pro @react-pdf/renderer
 * s plnou podporou české diakritiky.
 */

import { Font } from '@react-pdf/renderer';

// 🔥 SINGLETON - fonty se registrují jen jednou
let fontsRegistered = false;

/**
 * VARIANTA 1: CDN - Roboto (doporučeno pro začátek)
 * Výhody: Jednoduché, bez stahování souborů
 * Nevýhody: Vyžaduje internetové připojení
 */
export const registerRobotoFromCDN = () => {
  if (fontsRegistered) {
    return;
  }

  try {
    Font.register({
      family: 'Roboto',
      fonts: [
        // Light
        {
          src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf',
          fontWeight: 300,
          fontStyle: 'normal',
        },
        // Regular
        {
          src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
          fontWeight: 400,
          fontStyle: 'normal',
        },
        // Regular Italic
        {
          src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-italic-webfont.ttf',
          fontWeight: 400,
          fontStyle: 'italic',
        },
        // Medium
        {
          src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf',
          fontWeight: 500,
          fontStyle: 'normal',
        },
        // Bold
        {
          src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
          fontWeight: 700,
          fontStyle: 'normal',
        },
      ],
    });
    fontsRegistered = true;
  } catch (error) {
    console.error('❌ Chyba při registraci Roboto fontů:', error);
  }
};

// 🚀 Automatická registrace při importu modulu
registerRobotoFromCDN();

/**
 * VARIANTA 2: Google Fonts API
 * Výhody: Spolehlivější než CDN, vždy aktuální verze
 * Nevýhody: Vyžaduje internetové připojení
 */
export const registerRobotoFromGoogle = () => {
  Font.register({
    family: 'Roboto',
    fonts: [
      {
        src: 'https://fonts.gstatic.com/s/roboto/v30/KFOkCnqEu92Fr1MmgVxIIzI.ttf',
        fontWeight: 300,
      },
      {
        src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.ttf',
        fontWeight: 400,
      },
      {
        src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmEU9fBBc4.ttf',
        fontWeight: 500,
      },
      {
        src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4.ttf',
        fontWeight: 700,
      },
    ],
  });
};

/**
 * VARIANTA 3: Lokální soubory (nejspolehlivější)
 *
 * KROK 1: Stáhni Roboto fonty z Google Fonts
 * https://fonts.google.com/specimen/Roboto
 *
 * KROK 2: Umísti TTF soubory do složky:
 * /public/fonts/Roboto/
 * - Roboto-Light.ttf
 * - Roboto-Regular.ttf
 * - Roboto-Medium.ttf
 * - Roboto-Bold.ttf
 *
 * KROK 3: Použij tuto funkci
 */
export const registerRobotoLocal = () => {
  Font.register({
    family: 'Roboto',
    fonts: [
      {
        src: '/fonts/Roboto/Roboto-Light.ttf',
        fontWeight: 300,
      },
      {
        src: '/fonts/Roboto/Roboto-Regular.ttf',
        fontWeight: 400,
      },
      {
        src: '/fonts/Roboto/Roboto-Medium.ttf',
        fontWeight: 500,
      },
      {
        src: '/fonts/Roboto/Roboto-Bold.ttf',
        fontWeight: 700,
      },
    ],
  });
};

/**
 * VARIANTA 4: Noto Sans (alternativa k Roboto)
 * Dobrá volba pro ještě lepší podporu Unicode znaků
 */
export const registerNotoSansFromGoogle = () => {
  Font.register({
    family: 'Noto Sans',
    fonts: [
      {
        src: 'https://fonts.gstatic.com/s/notosans/v30/o-0IIpQlx3QUlC5A4PNb4j5Ba_2c7A.ttf',
        fontWeight: 300,
      },
      {
        src: 'https://fonts.gstatic.com/s/notosans/v30/o-0IIpQlx3QUlC5A4PNr4DRFSfiM7HBj.ttf',
        fontWeight: 400,
      },
      {
        src: 'https://fonts.gstatic.com/s/notosans/v30/o-0IIpQlx3QUlC5A4PNb4kZBa_2c7A.ttf',
        fontWeight: 500,
      },
      {
        src: 'https://fonts.gstatic.com/s/notosans/v30/o-0IIpQlx3QUlC5A4PNb4gBDa_2c7A.ttf',
        fontWeight: 700,
      },
    ],
  });
};

/**
 * VARIANTA 5: Fallback s error handlingem
 * Pro produkční prostředí - pokusí se načíst fonty, při chybě použije výchozí
 */
export const registerFontsWithFallback = async () => {
  try {
    // Pokus o načtení z Google Fonts
    registerRobotoFromGoogle();
    console.log('✅ Fonty úspěšně načteny z Google Fonts');
  } catch (error) {
    console.error('❌ Nepodařilo se načíst fonty. PDF bude používat výchozí font.', error);
    // V tomto případě @react-pdf/renderer použije výchozí Helvetica
    // ale bez podpory diakritiky
  }
};

/**
 * VARIANTA 6: Registrace více fontů pro různé účely
 */
export const registerMultipleFonts = () => {
  // Roboto pro běžný text
  Font.register({
    family: 'Roboto',
    fonts: [
      {
        src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.ttf',
        fontWeight: 400,
      },
      {
        src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4.ttf',
        fontWeight: 700,
      },
    ],
  });

  // Roboto Mono pro čísla a kódy (lepší čitelnost)
  Font.register({
    family: 'Roboto Mono',
    fonts: [
      {
        src: 'https://fonts.gstatic.com/s/robotomono/v22/L0xuDF4xlVMF-BfR8bXMIhJHg45mwgGEFl0_3vq_ROW4.ttf',
        fontWeight: 400,
      },
      {
        src: 'https://fonts.gstatic.com/s/robotomono/v22/L0xuDF4xlVMF-BfR8bXMIhJHg45mwgGEFl0_gPu_ROW4.ttf',
        fontWeight: 700,
      },
    ],
  });
};

/**
 * DOPORUČENÉ NASTAVENÍ PRO PRODUKCI
 */
export const registerProductionFonts = () => {
  // Pro produkci doporučuji použít lokální fonty
  // protože zaručují:
  // 1. Offline funkčnost
  // 2. Rychlejší načítání
  // 3. Bez závislosti na třetích stranách

  const isLocal = process.env.NODE_ENV === 'production';

  if (isLocal) {
    registerRobotoLocal();
  } else {
    registerRobotoFromGoogle();
  }
};

/**
 * NÁVOD NA STAŽENÍ ROBOTO FONTŮ
 *
 * Metoda 1: Přes Google Fonts
 * 1. Jdi na: https://fonts.google.com/specimen/Roboto
 * 2. Klikni na "Download family"
 * 3. Rozbal ZIP a zkopíruj potřebné TTF soubory
 * 4. Umísti je do /public/fonts/Roboto/
 *
 * Metoda 2: Přes terminál (Linux/Mac)
 *
 * mkdir -p public/fonts/Roboto
 * cd public/fonts/Roboto
 *
 * # Stažení přímo z Google Fonts CDN
 * wget -O Roboto-Light.ttf "https://fonts.gstatic.com/s/roboto/v30/KFOkCnqEu92Fr1MmgVxIIzI.ttf"
 * wget -O Roboto-Regular.ttf "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.ttf"
 * wget -O Roboto-Medium.ttf "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmEU9fBBc4.ttf"
 * wget -O Roboto-Bold.ttf "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4.ttf"
 *
 * Metoda 3: Pomocí npm balíčku
 *
 * npm install @fontsource/roboto
 *
 * Poté importuj v komponente:
 * import '@fontsource/roboto/300.css';
 * import '@fontsource/roboto/400.css';
 * import '@fontsource/roboto/500.css';
 * import '@fontsource/roboto/700.css';
 */

export default {
  registerRobotoFromCDN,
  registerRobotoFromGoogle,
  registerRobotoLocal,
  registerNotoSansFromGoogle,
  registerFontsWithFallback,
  registerMultipleFonts,
  registerProductionFonts,
};
