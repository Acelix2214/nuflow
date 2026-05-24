'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import styles from '@/components/dashboard.module.css'
import { FACILITIES_DATA, formatDate, formatTime, makeRequest } from '@/lib/api'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const emptyEventForm = {
  title: '',
  description: '',
  date: '',
  time: '',
  endTime: '',
  facilityId: '',
}

const emptyAnnouncementForm = {
  title: '',
  content: '',
  priority: 'Medium',
}

function formatEventTime(event) {
  if (!event?.time) return 'Not specified'
  return event.endTime ? `${formatTime(event.time)} - ${formatTime(event.endTime)}` : formatTime(event.time)
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [events, setEvents] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [facilityQuery, setFacilityQuery] = useState('')
  const [expandedFacility, setExpandedFacility] = useState(null)
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false)
  const [eventForm, setEventForm] = useState(emptyEventForm)
  const [announcementForm, setAnnouncementForm] = useState(emptyAnnouncementForm)
  const [editingEventId, setEditingEventId] = useState(null)
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null)
  const [formMessage, setFormMessage] = useState('')

  useEffect(() => {
    initializeDashboard()
  }, [])

  const initializeDashboard = async () => {
    const userResult = await makeRequest('php/check_session.php', { action: 'check_session' }, 'POST')

    if (!userResult.success) {
      router.push('/')
      return
    }

    setUser({
      id: userResult.user_id || userResult.id,
      username: userResult.username,
      role: userResult.role,
    })

    await Promise.all([loadEvents(), loadFacilities(), loadAnnouncements()])
    setLoading(false)
  }

  const loadEvents = async () => {
    const result = await makeRequest('php/events.php', { action: 'get_all' }, 'GET')
    if (result.success) {
      setEvents(result.data || [])
    }
  }

  const loadAnnouncements = async () => {
    const result = await makeRequest('php/announcements.php', { action: 'get_all' }, 'GET')
    if (result.success) {
      setAnnouncements(result.data || [])
    }
  }

  const loadFacilities = async () => {
    const result = await makeRequest('php/fetch_facilities.php', {}, 'GET')
    const databaseFacilities = result.success ? result.data || [] : []
    setFacilities(databaseFacilities.length ? databaseFacilities : FACILITIES_DATA)
  }

  const handleLogout = async () => {
    await makeRequest('php/auth.php', { action: 'logout' })
    localStorage.removeItem('nuflow_user')
    router.push('/')
  }

  const visibleFacilities = useMemo(() => {
    const query = facilityQuery.trim().toLowerCase()
    if (!query) return facilities
    return facilities.filter(facility => facility.name?.toLowerCase().includes(query))
  }, [facilities, facilityQuery])

  const monthLabel = useMemo(() => {
    return calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }, [calendarDate])

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return [
      ...Array.from({ length: firstDay }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ]
  }, [calendarDate])

  const eventDates = useMemo(() => {
    return new Set(events.map(event => event.date).filter(Boolean))
  }, [events])

  const getFacilityEvents = (facility) => {
    const selectedId = String(facility.id || facility.name)
    const selectedName = facility.name?.toLowerCase()

    return events.filter(event => {
      const eventFacilityId = event.facilityId ? String(event.facilityId) : ''
      const eventLocation = event.location?.toLowerCase()
      return eventFacilityId === selectedId || eventLocation === selectedName
    })
  }

  const canCreate = user?.role === 'SDAO Office' || user?.role === 'Student Organizations'

  const canModifyItem = (item) => {
    return user?.role === 'SDAO Office'
      || (user?.role === 'Student Organizations' && item.createdBy === user.id && item.status === 'pending')
  }

  const openCreateEvent = () => {
    setFormMessage('')
    setEditingEventId(null)
    setEventForm(emptyEventForm)
    setEventModalOpen(true)
  }

  const openEditEvent = (event) => {
    setFormMessage('')
    setEditingEventId(event.id)
    setEventForm({
      title: event.title || '',
      description: event.description || '',
      date: event.date || '',
      time: event.time || '',
      endTime: event.endTime || '',
      facilityId: event.facilityId || event.location || '',
    })
    setEventModalOpen(true)
  }

  const openCreateAnnouncement = () => {
    setFormMessage('')
    setEditingAnnouncementId(null)
    setAnnouncementForm(emptyAnnouncementForm)
    setAnnouncementModalOpen(true)
  }

  const openEditAnnouncement = (announcement) => {
    setFormMessage('')
    setEditingAnnouncementId(announcement.id)
    setAnnouncementForm({
      title: announcement.title || '',
      content: announcement.content || '',
      priority: announcement.priority || 'Medium',
    })
    setAnnouncementModalOpen(true)
  }

  const submitEvent = async (event) => {
    event.preventDefault()
    setFormMessage('')

    const facility = facilities.find(item => String(item.id || item.name) === eventForm.facilityId)
    const result = await makeRequest('php/events.php', {
      action: editingEventId ? 'update' : 'create',
      id: editingEventId,
      title: eventForm.title,
      description: eventForm.description,
      date: eventForm.date,
      time: eventForm.time,
      endTime: eventForm.endTime,
      location: facility?.name || eventForm.facilityId,
      facilityId: eventForm.facilityId,
    })

    if (!result.success) {
      setFormMessage(result.message || 'Unable to create event')
      return
    }

    setEventModalOpen(false)
    setEditingEventId(null)
    setEventForm(emptyEventForm)
    await loadEvents()
  }

  const submitAnnouncement = async (event) => {
    event.preventDefault()
    setFormMessage('')

    const result = await makeRequest('php/announcements.php', {
      action: editingAnnouncementId ? 'update' : 'create',
      id: editingAnnouncementId,
      title: announcementForm.title,
      content: announcementForm.content,
      priority: announcementForm.priority,
    })

    if (!result.success) {
      setFormMessage(result.message || 'Unable to create announcement')
      return
    }

    setAnnouncementModalOpen(false)
    setEditingAnnouncementId(null)
    setAnnouncementForm(emptyAnnouncementForm)
    await loadAnnouncements()
  }

  const removeEvent = async (event) => {
    if (!window.confirm(`Remove "${event.title}"?`)) return

    const result = await makeRequest('php/events.php', {
      action: 'delete',
      id: event.id,
    })

    if (!result.success) {
      window.alert(result.message || 'Unable to remove event')
      return
    }

    await loadEvents()
  }

  const removeAnnouncement = async (announcement) => {
    if (!window.confirm(`Remove "${announcement.title}"?`)) return

    const result = await makeRequest('php/announcements.php', {
      action: 'delete',
      id: announcement.id,
    })

    if (!result.success) {
      window.alert(result.message || 'Unable to remove announcement')
      return
    }

    await loadAnnouncements()
  }

  const changeMonth = (amount) => {
    setCalendarDate(current => new Date(current.getFullYear(), current.getMonth() + amount, 1))
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Loading dashboard...</p>
      </div>
    )
  }

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <main className={styles.main}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Upcoming Events</h2>
            {canCreate && (
              <button
                className={`${styles.primaryButton} ${styles.smallButton}`}
                onClick={openCreateEvent}
              >
                {user.role === 'SDAO Office' ? 'Create Event' : 'Request Event'}
              </button>
            )}
          </div>
          <div className={styles.list}>
            {events.length === 0 ? (
              <p className={styles.empty}>No events found</p>
            ) : (
              events.map(event => (
                <article className={styles.eventItem} key={event.id}>
                  <h3>{event.title}</h3>
                  <p>{event.description || 'No description provided.'}</p>
                  <div className={styles.meta}>
                    <div>Date: {formatDate(event.date)}</div>
                    <div>Time: {formatEventTime(event)}</div>
                    <div>Location: {event.location || 'Not specified'}</div>
                  </div>
                  <span className={`${styles.status} ${event.status === 'approved' ? styles.approved : ''}`}>
                    {event.status || 'pending'}
                  </span>
                  {canModifyItem(event) && (
                    <div className={styles.itemActions}>
                      <button className={styles.editButton} onClick={() => openEditEvent(event)}>
                        Edit
                      </button>
                      <button className={styles.removeButton} onClick={() => removeEvent(event)}>
                        Remove
                      </button>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Calendar</h2>
            <div className={styles.calendarNav}>
              <button className={styles.navButton} onClick={() => changeMonth(-1)} aria-label="Previous month">
                &lt;
              </button>
              <span>{monthLabel}</span>
              <button className={styles.navButton} onClick={() => changeMonth(1)} aria-label="Next month">
                &gt;
              </button>
            </div>
          </div>
          <div className={styles.calendar}>
            <div className={styles.calendarGrid}>
              {weekdays.map(day => (
                <div className={styles.weekday} key={day}>{day}</div>
              ))}
              {calendarDays.map((day, index) => {
                if (!day) return <div className={styles.blankDay} key={`blank-${index}`} />

                const dateKey = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const today = new Date()
                const isToday = today.getFullYear() === calendarDate.getFullYear()
                  && today.getMonth() === calendarDate.getMonth()
                  && today.getDate() === day

                return (
                  <div
                    className={`${styles.day} ${isToday ? styles.today : ''} ${eventDates.has(dateKey) ? styles.hasEvent : ''}`}
                    key={dateKey}
                  >
                    {day}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Facility Management</h2>
          </div>
          <div className={styles.facilitySearch}>
            <input
              type="text"
              placeholder="Search facilities..."
              value={facilityQuery}
              onChange={event => setFacilityQuery(event.target.value)}
            />
          </div>
          <div className={styles.list}>
            {visibleFacilities.length === 0 ? (
              <p className={styles.empty}>No facilities found</p>
            ) : (
              visibleFacilities.map(facility => {
                const facilityKey = String(facility.id || facility.name)
                const isExpanded = expandedFacility === facilityKey
                const facilityEvents = getFacilityEvents(facility)

                return (
                  <article
                    className={`${styles.facilityItem} ${isExpanded ? styles.selectedFacility : ''}`}
                    key={facilityKey}
                  >
                    <button
                      className={styles.facilityButton}
                      onClick={() => setExpandedFacility(isExpanded ? null : facilityKey)}
                      aria-expanded={isExpanded}
                    >
                      {facility.image && <img src={facility.image} alt={facility.name} />}
                      <span>
                        <strong>{facility.name}</strong>
                        <small>{facility.description || 'Available for event scheduling.'}</small>
                      </span>
                      <b>{isExpanded ? '-' : '+'}</b>
                    </button>

                    {isExpanded && (
                      <div className={styles.facilityDropdown}>
                        {facilityEvents.length === 0 ? (
                          <p className={styles.emptyCompact}>No events scheduled for this facility</p>
                        ) : (
                          facilityEvents.map(event => (
                            <div className={styles.facilityEvent} key={event.id}>
                              <h4>{event.title}</h4>
                              <p>{event.description || 'No description provided.'}</p>
                              <div className={styles.meta}>
                                <div>Date: {formatDate(event.date)}</div>
                                <div>Time: {formatEventTime(event)}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </article>
                )
              })
            )}
          </div>
        </section>
      </main>

      <section className={styles.announcements}>
        <div className={styles.panelHeader}>
          <h2>Announcements</h2>
          {canCreate && (
            <button
              className={`${styles.primaryButton} ${styles.smallButton}`}
              onClick={openCreateAnnouncement}
            >
              {user.role === 'SDAO Office' ? 'Create Announcement' : 'Request Announcement'}
            </button>
          )}
        </div>
        <div className={styles.announcementList}>
          {announcements.length === 0 ? (
            <p className={styles.empty}>No announcements found</p>
          ) : (
            announcements.map(announcement => (
              <article className={styles.announcementItem} key={announcement.id}>
                <h3>{announcement.title}</h3>
                <p>{announcement.content}</p>
                <p className={styles.meta}>
                  Posted by: {announcement.createdByUsername || announcement.created_by || 'NU Flow'}
                </p>
                {canModifyItem(announcement) && (
                  <div className={styles.itemActions}>
                    <button className={styles.editButton} onClick={() => openEditAnnouncement(announcement)}>
                      Edit
                    </button>
                    <button className={styles.removeButton} onClick={() => removeAnnouncement(announcement)}>
                      Remove
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </section>

      {eventModalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editingEventId ? 'Edit Event' : user.role === 'SDAO Office' ? 'Create New Event' : 'Request Event'}</h2>
              <button className={styles.modalClose} onClick={() => {
                setEventModalOpen(false)
                setEditingEventId(null)
              }} aria-label="Close">
                &times;
              </button>
            </div>
            <form className={styles.form} onSubmit={submitEvent}>
              {formMessage && <p className={styles.message}>{formMessage}</p>}
              <div className={styles.field}>
                <label htmlFor="eventTitle">Event Title</label>
                <input id="eventTitle" required value={eventForm.title} onChange={event => setEventForm({ ...eventForm, title: event.target.value })} />
              </div>
              <div className={styles.field}>
                <label htmlFor="eventDescription">Description</label>
                <textarea id="eventDescription" rows="3" value={eventForm.description} onChange={event => setEventForm({ ...eventForm, description: event.target.value })} />
              </div>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label htmlFor="eventDate">Date</label>
                  <input id="eventDate" type="date" required value={eventForm.date} onChange={event => setEventForm({ ...eventForm, date: event.target.value })} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="eventTime">Start Time</label>
                  <input id="eventTime" type="time" required value={eventForm.time} onChange={event => setEventForm({ ...eventForm, time: event.target.value })} />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label htmlFor="eventEndTime">End Time</label>
                  <input id="eventEndTime" type="time" required value={eventForm.endTime} onChange={event => setEventForm({ ...eventForm, endTime: event.target.value })} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="eventFacilityId">Facility</label>
                  <select id="eventFacilityId" required value={eventForm.facilityId} onChange={event => setEventForm({ ...eventForm, facilityId: event.target.value })}>
                    <option value="">Select a facility</option>
                    {facilities.map(facility => (
                      <option key={facility.id || facility.name} value={facility.id || facility.name}>
                        {facility.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={`${styles.primaryButton} ${styles.lightButton}`} onClick={() => {
                  setEventModalOpen(false)
                  setEditingEventId(null)
                }}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton}>{editingEventId ? 'Save Changes' : 'Create Event'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {announcementModalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editingAnnouncementId ? 'Edit Announcement' : user.role === 'SDAO Office' ? 'Create Announcement' : 'Request Announcement'}</h2>
              <button className={styles.modalClose} onClick={() => {
                setAnnouncementModalOpen(false)
                setEditingAnnouncementId(null)
              }} aria-label="Close">
                &times;
              </button>
            </div>
            <form className={styles.form} onSubmit={submitAnnouncement}>
              {formMessage && <p className={styles.message}>{formMessage}</p>}
              <div className={styles.field}>
                <label htmlFor="announcementTitle">Title</label>
                <input id="announcementTitle" required value={announcementForm.title} onChange={event => setAnnouncementForm({ ...announcementForm, title: event.target.value })} />
              </div>
              <div className={styles.field}>
                <label htmlFor="announcementContent">Content</label>
                <textarea id="announcementContent" rows="4" required value={announcementForm.content} onChange={event => setAnnouncementForm({ ...announcementForm, content: event.target.value })} />
              </div>
              <div className={styles.field}>
                <label htmlFor="announcementPriority">Priority</label>
                <select id="announcementPriority" value={announcementForm.priority} onChange={event => setAnnouncementForm({ ...announcementForm, priority: event.target.value })}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={`${styles.primaryButton} ${styles.lightButton}`} onClick={() => {
                  setAnnouncementModalOpen(false)
                  setEditingAnnouncementId(null)
                }}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton}>{editingAnnouncementId ? 'Save Changes' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
