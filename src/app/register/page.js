'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { makeRequest } from '@/lib/api'
import styles from './register.module.css'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization: '',
  })
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setMessageType('error')
      setMessage('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setMessageType('error')
      setMessage('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setMessageType('error')
      setMessage('Please enter a valid email address')
      setLoading(false)
      return
    }

    if (formData.username.length < 3) {
      setMessageType('error')
      setMessage('Username must be at least 3 characters long')
      setLoading(false)
      return
    }

    const result = await makeRequest('php/auth.php', { 
      action: 'register', 
      username: formData.username,
      email: formData.email,
      password: formData.password,
      organization: formData.organization
    })

    if (result.success) {
      setMessageType('success')
      setMessage('Registration successful! Redirecting to login...')
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } else {
      setMessageType('error')
      setMessage(result.message || 'Registration failed')
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

      <div className={styles.registerContainer}>
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
            <h1>Create Account</h1>
            <p>Join NU Flow</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="organization">Organization</label>
              <input
                type="text"
                id="organization"
                name="organization"
                value={formData.organization}
                onChange={handleChange}
                placeholder="Your organization"
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className={styles.btnPrimary}
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Register'}
            </button>

            <div className={styles.links}>
              <p>Already have an account? <Link href="/">Login</Link></p>
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
