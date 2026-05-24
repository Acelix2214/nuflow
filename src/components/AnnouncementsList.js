'use client'

export default function AnnouncementsList({ announcements }) {
  return (
    <div>
      <h3>Announcements</h3>
      {announcements.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center', padding: '40px 20px' }}>No announcements found</p>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {announcements.map(announcement => (
            <div 
              key={announcement.id} 
              style={{
                background: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                borderLeft: '4px solid #667eea'
              }}
            >
              <h4 style={{ marginTop: 0, color: '#667eea' }}>{announcement.title}</h4>
              <p>{announcement.content}</p>
              <p style={{ fontSize: '12px', color: '#999', marginTop: '12px' }}>
                Posted by: {announcement.created_by}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
