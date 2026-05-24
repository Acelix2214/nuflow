'use client'

import styles from './dashboard.module.css'

export default function DashboardLayout({ user, onLogout, children }) {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <img src="/images/Logo.png" alt="NU Flow Logo" className={styles.logo} />
          <div className={styles.titleWrap}>
            <h1>Dashboard</h1>
            <span className={styles.role}>{user?.role}</span>
          </div>
        </div>

        <div className={styles.headerRight}>
          <button className={styles.inboxButton} title="Notifications" aria-label="Notifications">
            &#9993;
          </button>
          <span className={styles.userName}>{user?.username}</span>
          {user?.role === 'SDAO Office' && (
            <a href="/approvals" className={styles.secondaryButton}>
              Approvals
            </a>
          )}
          <button onClick={onLogout} className={styles.secondaryButton}>
            Logout
          </button>
        </div>
      </header>

      {children}
    </div>
  )
}
