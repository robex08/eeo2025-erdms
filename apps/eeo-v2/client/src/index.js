import React from 'react';
import ReactDOM from 'react-dom/client';
// Global stylesheet migrated to emotion GlobalStyles
import GlobalStyles from './theme/GlobalStyles';
import { ThemeProvider } from '@emotion/react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { theme } from './theme/theme';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './context/AuthContext'; // Import AuthProvider
import { DebugProvider } from './context/DebugContext'; // Import DebugProvider
import { ProgressProvider } from './context/ProgressContext';

// Suppress ResizeObserver errors (benign browser timing issue)
window.addEventListener('error', e => {
  if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
    e.stopImmediatePropagation();
  }
});

// Suppress React DevTools console message in development
if (process.env.NODE_ENV === 'development') {
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    const message = args[0];
    if (typeof message === 'string' && message.includes('Download the React DevTools')) {
      return; // Skip React DevTools message
    }
    originalConsoleLog.apply(console, args);
  };
}

// Create MUI theme
const muiTheme = createTheme({
  palette: {
    primary: {
      main: '#1f2a57',
    },
    secondary: {
      main: '#2563eb',
    },
  },
});

// Export API functions to global scope for testing (development only)
if (process.env.NODE_ENV === 'development') {
  import('./services/api2auth').then(apiAuth => {
    window.apiAuth = apiAuth;
  }).catch(() => {});

  import('./services/NotesAPI').then(notesAPI => {
    window.NotesAPI = notesAPI.NotesAPI;
    window.createNotesAPI = notesAPI.createNotesAPI;
  }).catch(() => {});
}



// Aktualizuj verzi na splash screen z .env
const versionText = document.getElementById('splash-version');
if (versionText && process.env.REACT_APP_VERSION) {
  versionText.textContent = `verze ${process.env.REACT_APP_VERSION}`;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <>
    <GlobalStyles />
    <MuiThemeProvider theme={muiTheme}>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <DebugProvider>
            <ProgressProvider>
              <App />
            </ProgressProvider>
          </DebugProvider>
        </AuthProvider>
      </ThemeProvider>
    </MuiThemeProvider>
  </>
);

// Skryje HTML splash screen po načtení React aplikace
// 🎯 OPTIMALIZACE: Zobrazí se pouze při prvním spuštění (cold start = nový tab/okno)
// Při F5/reload se skryje OKAMŽITĚ bez prodlevy
const isFirstLoad = !sessionStorage.getItem('app_initialized');

const hideSplashScreen = () => {
  document.body.classList.add('app-loaded');
  
  const splashScreen = document.getElementById('splash-screen');
  if (splashScreen) {
    // Fade-out animace
    setTimeout(() => {
      splashScreen.classList.add('hidden');
      splashScreen.style.display = 'none';
      // Uvolnění z DOM pro jistotu
      splashScreen.remove();
    }, 300); // Zkráceno z 500ms na 300ms
  }
};

if (isFirstLoad) {
  // ✅ První načtení (cold start) - zobrazit splash minimálně 2 sekundy
  sessionStorage.setItem('app_initialized', 'true');
  
  const startTime = window.splashStartTime || Date.now();
  const minDisplayTime = 2000; // Zkráceno z 5s na 2s - stačí pro načtení
  const elapsedTime = Date.now() - startTime;
  const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

  // Nastav timeout a ulož ID pro možnost zrušení
  const splashTimeout = setTimeout(() => {
    hideSplashScreen();
  }, remainingTime);

  // Záložní mechanismus - force skrytí po max 8 sekundách
  setTimeout(() => {
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen && splashScreen.style.display !== 'none') {
      console.warn('⚠️ Force hiding splash screen after 8s timeout');
      clearTimeout(splashTimeout);
      hideSplashScreen();
    }
  }, 8000);
} else {
  // ⚡ Reload/refresh - skrýt splash OKAMŽITĚ bez jakékoliv prodlevy
  const splashScreen = document.getElementById('splash-screen');
  if (splashScreen) {
    splashScreen.style.display = 'none';
    splashScreen.remove();
  }
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
