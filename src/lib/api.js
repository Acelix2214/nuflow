// API utility functions - now uses Next.js API routes
export async function makeRequest(url, data = null, method = "POST") {
  try {
    // Map old PHP paths to new API routes
    const urlMap = {
      'php/auth.php': '/api/auth',
      'php/events.php': '/api/events',
      'php/announcements.php': '/api/announcements',
      'php/fetch_facilities.php': '/api/facilities',
      'php/check_session.php': '/api/auth',
    }

    const apiUrl = urlMap[url] || url

    const options = { 
      method,
      headers: { "Content-Type": "application/json" }
    }
    
    let finalUrl = apiUrl
    if (method === "GET" && data) {
      const params = new URLSearchParams(data)
      finalUrl = apiUrl + (apiUrl.includes('?') ? '&' : '?') + params.toString()
    } else if (data) {
      options.body = JSON.stringify(data)
    }

    console.log("[NU Flow] Making request to:", finalUrl, "with data:", data)

    const response = await fetch(finalUrl, options)
    console.log("[NU Flow] Response status:", response.status, response.statusText)

    let result
    try {
      result = await response.json()
    } catch (parseError) {
      console.error("[NU Flow] JSON parse error")
      return {
        success: false,
        message: `Server error`,
      }
    }

    if (!response.ok) {
      console.error("[NU Flow] Response error:", result)
      return { success: false, message: result.message || `Server error: ${response.status}` }
    }

    console.log("[NU Flow] Response data:", result)
    return result
  } catch (error) {
    console.error("[NU Flow] Request error:", error)
    return { success: false, message: `Network error: ${error.message}` }
  }
}

export const FACILITIES_DATA = [
  { name: "Library", image: "/images/Library.jpg" },
  { name: "Gym", image: "/images/Gym.jpg" },
  { name: "Swimming Pool", image: "/images/Pool.jpg" },
  { name: "Basketball Court", image: "/images/hoops_center.jpg" },
  { name: "Tennis Court", image: "/images/Tennis_Court.jpg" },
  { name: "Dormitory", image: "/images/Dormitel.jpg" },
  { name: "Multi-Purpose Center", image: "/images/Multipurpose_center.jpg" },
  { name: "Auditorium", image: "/images/auditorium.jpg" },
  { name: "Chapel", image: "/images/chapel.jpg" },
  { name: "Clinic", image: "/images/clinic.jpg" },
  { name: "Football Pitch", image: "/images/football_pitch.jpg" },
]

export function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

export function formatTime(timeString) {
  const time = new Date(`2000-01-01 ${timeString}`)
  return time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}
