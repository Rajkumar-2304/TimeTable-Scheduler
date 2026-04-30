import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { API_URL } from '../api';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();
  const { toast, updateUsername, updateInstitution } = useApp();

  async function handleSubmit(e) {
    e.preventDefault();
    if (isLogin) {
      if (!username || !password) return toast('Please fill all fields', 'error');
    } else {
      if (!username || !institutionName || !password) return toast('Please fill all fields', 'error');
    }

    setLoading(true);
    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    const payload = isLogin
      ? { username, password }
      : { username, institutionName, password };

    try {
      const res = await fetch(API_URL + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      localStorage.setItem('crt_token', data.token);
      localStorage.setItem('crt_username', data.username);
      localStorage.setItem('crt_institution', data.institutionName);
      updateUsername(data.username);
      updateInstitution(data.institutionName);

      toast(`Welcome, ${data.username}!`, 'success');
      window.location.href = '/';
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-mark">T</div>
          <div>
            <h1 className="auth-title">
              {isLogin ? <>Welcome <em>back</em></> : <>Create an <em>account</em></>}
            </h1>
            <p className="auth-subtitle">
              {isLogin
                ? 'Sign in to your scheduler workspace'
                : 'Register your institution to get started'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <div className="form-group">
            <label htmlFor="auth-username">Username</label>
            <input
              id="auth-username"
              className="form-control"
              type="text"
              placeholder="Enter your username"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="auth-institution">Institution name</label>
              <input
                id="auth-institution"
                className="form-control"
                type="text"
                placeholder="e.g. ABC Engineering College"
                value={institutionName}
                onChange={e => setInstitutionName(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              className="form-control"
              type="password"
              placeholder="••••••••"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg full-width"
            style={{ marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Signing in…' : isLogin ? 'Continue' : 'Create account'}
          </button>
        </form>

        <div className="auth-divider">
          <span>{isLogin ? 'No account yet?' : 'Have an account?'}</span>
        </div>

        <p className="auth-switch">
          <span className="auth-switch-link" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Create a new account' : 'Sign in instead'}
          </span>
        </p>
      </div>
    </div>
  );
}
