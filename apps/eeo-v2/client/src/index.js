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

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
