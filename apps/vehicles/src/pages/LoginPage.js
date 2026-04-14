import React, { useState } from 'react';
import '../styles/pages/LoginPage.css';

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Pevně daný uživatel: spravce / auto
    if (!username || !password) {
      setError('Vyplňte prosím všechny údaje.');
      return;
    }
    if (username !== 'spravce' || password !== 'auto') {
      setError('Neplatné uživatelské jméno nebo heslo.');
      return;
    }
    setError('');
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('username', username);
    if (onLogin) onLogin(username);
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Přihlášení</h2>
        {error && <div className="error-message">{error}</div>}
        <input
          type="text"
          placeholder="Uživatelské jméno"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />
        <input
          type="password"
          placeholder="Heslo"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Přihlásit se</button>
      </form>
    </div>
  );
};

export default LoginPage;
