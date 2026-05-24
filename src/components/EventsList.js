'use client'

import { formatDate, formatTime } from '@/lib/api'

export default function EventsList({ events, user }) {
  const getEventEndTime = (event) => {
    return event?.endTime || event?.end_time || ''
  }

  return (
    <div>
      <h3>Events</h3>
      {events.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center', padding: '40px 20px' }}>No events found</p>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {events.map(event => (
            <div 
              key={event.id} 
              style={{
                background: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
            >
              <h4 style={{ marginTop: 0, color: '#667eea' }}>{event.title}</h4>
              <p>{event.description}</p>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '12px' }}>
                <p><strong>Date:</strong> {formatDate(event.date)}</p>
                <p><strong>Start Time:</strong> {event.time ? formatTime(event.time) : 'Not specified'}</p>
                <p><strong>End Time:</strong> {getEventEndTime(event) ? formatTime(getEventEndTime(event)) : 'Not specified'}</p>
                <p><strong>Location:</strong> {event.location}</p>
              </div>
              <p style={{ fontSize: '12px', color: '#999', marginTop: '12px' }}>
                Status: <span style={{ color: event.status === 'approved' ? '#3c3' : '#f60' }}>
                  {event.status}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
