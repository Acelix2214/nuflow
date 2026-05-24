'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import styles from '@/components/dashboard.module.css'
import { formatDate, formatTime, makeRequest } from '@/lib/api'

function formatEventTime(event) {
  if (!event?.time) return 'Not specified'
  return event.endTime ? `${formatTime(event.time)} - ${formatTime(event.endTime)}` : formatTime(event.time)
}

export default function ApprovalsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [events, setEvents] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    initializeApprovals()
  }, [])

  const initializeApprovals = async () => {
    const userResult = await makeRequest('php/check_session.php', { action: 'check_session' }, 'POST')

    if (!userResult.success) {
      router.push('/')
      return
    }

    if (userResult.role !== 'SDAO Office') {
      router.push('/dashboard')
      return
    }

    setUser({
      id: userResult.user_id || userResult.id,
      username: userResult.username,
      role: userResult.role,
    })

    await loadPending()
    setLoading(false)
  }

  const loadPending = async () => {
    const [eventsResult, announcementsResult] = await Promise.all([
      makeRequest('php/events.php', { action: 'get_all' }, 'GET'),
      makeRequest('php/announcements.php', { action: 'get_all' }, 'GET'),
    ])

    if (eventsResult.success) {
      setEvents((eventsResult.data || []).filter(event => event.status === 'pending'))
    }

    if (announcementsResult.success) {
      setAnnouncements((announcementsResult.data || []).filter(announcement => announcement.status === 'pending'))
    }
  }

  const pendingCount = useMemo(() => events.length + announcements.length, [events, announcements])

  const handleLogout = async () => {
    await makeRequest('php/auth.php', { action: 'logout' })
    localStorage.removeItem('nuflow_user')
    router.push('/')
  }

  const decide = async (type, id, action) => {
    const reason = action === 'reject' ? window.prompt('Reason for rejection:', '') || '' : ''
    const result = await makeRequest(type === 'event' ? 'php/events.php' : 'php/announcements.php', {
      action,
      id,
      reason,
    })

    setMessage(result.message || (result.success ? 'Updated successfully' : 'Unable to update request'))
    await loadPending()
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Loading approvals...</p>
      </div>
    )
  }

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <main className={styles.approvalsMain}>
        <div className={styles.approvalsTitle}>
          <div>
            <h2>Pending Approvals</h2>
            <p>{pendingCount} request{pendingCount === 1 ? '' : 's'} waiting for SDAO review</p>
          </div>
          <button className={styles.primaryButton} onClick={() => router.push('/dashboard')}>
            Dashboard
          </button>
        </div>

        {message && <p className={styles.successMessage}>{message}</p>}

        <section className={styles.approvalSection}>
          <div className={styles.panelHeader}>
            <h2>Event Requests</h2>
          </div>
          <div className={styles.list}>
            {events.length === 0 ? (
              <p className={styles.empty}>No pending event requests</p>
            ) : (
              events.map(event => (
                <article className={styles.eventItem} key={event.id}>
                  <h3>{event.title}</h3>
                  <p>{event.description || 'No description provided.'}</p>
                  <div className={styles.meta}>
                    <div>Date: {formatDate(event.date)}</div>
                    <div>Time: {formatEventTime(event)}</div>
                    <div>Location: {event.location || 'Not specified'}</div>
                    <div>Requested by: {event.createdByUsername || 'Student Organization'}</div>
                  </div>
                  <div className={styles.approvalActions}>
                    <button className={styles.approveButton} onClick={() => decide('event', event.id, 'approve')}>
                      Approve
                    </button>
                    <button className={styles.rejectButton} onClick={() => decide('event', event.id, 'reject')}>
                      Reject
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className={styles.approvalSection}>
          <div className={styles.panelHeader}>
            <h2>Announcement Requests</h2>
          </div>
          <div className={styles.list}>
            {announcements.length === 0 ? (
              <p className={styles.empty}>No pending announcement requests</p>
            ) : (
              announcements.map(announcement => (
                <article className={styles.announcementItem} key={announcement.id}>
                  <h3>{announcement.title}</h3>
                  <p>{announcement.content}</p>
                  <p className={styles.meta}>
                    Requested by: {announcement.createdByUsername || 'Student Organization'}
                  </p>
                  <div className={styles.approvalActions}>
                    <button className={styles.approveButton} onClick={() => decide('announcement', announcement.id, 'approve')}>
                      Approve
                    </button>
                    <button className={styles.rejectButton} onClick={() => decide('announcement', announcement.id, 'reject')}>
                      Reject
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </DashboardLayout>
  )
}
