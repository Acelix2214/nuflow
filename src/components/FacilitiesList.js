'use client'

export default function FacilitiesList({ facilities }) {
  return (
    <div>
      <h3>Available Facilities</h3>
      {facilities.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center', padding: '40px 20px' }}>No facilities found</p>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '20px' 
        }}>
          {facilities.map(facility => (
            <div 
              key={facility.id} 
              style={{
                background: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {facility.image && (
                <img 
                  src={facility.image} 
                  alt={facility.name}
                  style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}
              <div style={{ padding: '16px' }}>
                <h4 style={{ marginTop: 0, color: '#667eea' }}>{facility.name}</h4>
                <p style={{ fontSize: '14px', color: '#666', margin: '8px 0' }}>
                  {facility.description || 'No description available'}
                </p>
                {facility.capacity && (
                  <p style={{ fontSize: '12px', color: '#999' }}>
                    Capacity: {facility.capacity}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
