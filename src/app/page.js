'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { makeRequest } from '@/lib/api'
import styles from './login.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const result = await makeRequest('php/auth.php', { 
      action: 'login', 
      username, 
      password 
    })

    if (result.success) {
      localStorage.setItem('nuflow_user', JSON.stringify(result.user))
      setMessageType('success')
      setMessage('Login successful!')
      setTimeout(() => {
        router.push('/dashboard')
      }, 500)
    } else {
      setMessageType('error')
      setMessage(result.message || 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.waves + ' ' + styles.back}>
        <svg viewBox="0 24 150 28">
          <defs>
            <path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"></path>
          </defs>
          <use xlinkHref="#gentle-wave" x="48" y="5"></use>
          <use xlinkHref="#gentle-wave" x="48" y="7"></use>
        </svg>
      </div>

      <div className={styles.loginContainer}>
        <div className={styles.logoSection + ' ' + styles.boat}>
          <img 
            src="/images/Logo.png" 
            alt="NU Flow Logo" 
            className={styles.logo}
            onError={(e) => e.target.style.display = 'none'}
          />
        </div>

        <div className={styles.card}>
          <div className={styles.header}>
            <h1>NU Flow</h1>
            <p>Centralized Events and Facility Management System</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className={styles.btnPrimary}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <div className={styles.links}>
              <p>Don't have an account? <Link href="/register">Register</Link></p>
            </div>
          </form>

          {message && (
            <div className={`${styles.message} ${styles[messageType]}`}>
              {message}
            </div>
          )}
        </div>
      </div>

      <div className={styles.waves + ' ' + styles.front}>
        <svg viewBox="0 24 150 28">
          <defs>
            <path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"></path>
          </defs>
          <use xlinkHref="#gentle-wave" x="48" y="0"></use>
          <use xlinkHref="#gentle-wave" x="48" y="3"></use>
        </svg>
      </div>
    </div>
  )
}
