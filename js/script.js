// Global variables
let currentUser = null
const currentDate = new Date()
let events = []
let facilities = []
let announcements = []
let userPendingEvents = []
let userPendingAnnouncements = []

const facilitiesData = [
  { name: "Library", image: "images/Library.jpg" },
  { name: "Gym", image: "images/Gym.jpg" },
  { name: "Swimming Pool", image: "images/Pool.jpg" },
  { name: "Basketball Court", image: "images/hoops_center.jpg" },
  { name: "Tennis Court", image: "images/Tennis_Court.jpg" },
  { name: "Dormitory", image: "images/Dormitel.jpg" },
  { name: "Multi-Purpose Center", image: "images/Multipurpose_center.jpg" },
  { name: "Auditorium", image: "images/auditorium.jpg" },
  { name: "Chapel", image: "images/chapel.jpg" },
  { name: "Clinic", image: "images/clinic.jpg" },
  { name: "Football Pitch", image: "images/football_pitch.jpg" },
]

// Utility functions
function showMessage(elementId, message, type = "error") {
  const messageElement = document.getElementById(elementId)
  if (messageElement) {
    messageElement.textContent = message
    messageElement.className = `message ${type}`
    messageElement.style.display = "block"
    setTimeout(() => (messageElement.style.display = "none"), 5000)
  }
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

function formatTime(timeString) {
  const time = new Date(`2000-01-01 ${timeString}`)
  return time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

// API utility
async function makeRequest(url, data = null, method = "POST") {
  try {
    const options = { method, headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    if (method === "GET" && data) {
      // For GET requests, append data as query parameters
      const params = new URLSearchParams(data)
      url += (url.includes('?') ? '&' : '?') + params.toString()
    } else if (data) {
      options.body = new URLSearchParams(data)
    }

    console.log("[v0] Making request to:", url, "with data:", data)

    const response = await fetch(url, options)

    console.log("[v0] Response status:", response.status, response.statusText)

    let responseText = ""
    try {
      responseText = await response.text()
    } catch (readError) {
      console.error("[v0] Error reading response:", readError)
      return { success: false, message: `Network error: Failed to read response` }
    }

    if (!response.ok) {
      console.error("[v0] Response error:", responseText)
      return { success: false, message: `Server error: ${response.status} - ${responseText.substring(0, 100)}` }
    }

    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error("[v0] JSON parse error. Response text:", responseText)
      return {
        success: false,
        message: `Server returned invalid JSON. This usually means there's a database connection issue. Check the server logs for details.`,
      }
    }

    console.log("[v0] Response data:", result)
    return result
  } catch (error) {
    console.error("[v0] Request error:", error)
    return { success: false, message: `Network error: ${error.message}` }
  }
}

// Authentication
async function login(username, password) {
  const result = await makeRequest("php/auth.php", { action: "login", username, password })
  if (result.success) {
    currentUser = result.user
    localStorage.setItem("nuflow_user", JSON.stringify(currentUser))
    setTimeout(() => {
      window.location.href = "dashboard.html"
    }, 100)
  } else {
    showMessage("loginMessage", result.message, "error")
  }
}

async function register(username, email, password, confirmPassword, organization) {
  // Validate passwords match
  if (password !== confirmPassword) {
    showMessage("registerMessage", "Passwords do not match", "error")
    return
  }

  // Validate password strength
  if (password.length < 6) {
    showMessage("registerMessage", "Password must be at least 6 characters long", "error")
    return
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    showMessage("registerMessage", "Please enter a valid email address", "error")
    return
  }

  // Validate username
  if (username.length < 3) {
    showMessage("registerMessage", "Username must be at least 3 characters long", "error")
    return
  }

  const result = await makeRequest("php/auth.php", { action: "register", username, email, password, organization })
  if (result.success) {
    showMessage("registerMessage", "Registration successful! You can now login.", "success")
    setTimeout(() => (window.location.href = "index.html"), 2000)
  } else {
    showMessage("registerMessage", result.message, "error")
  }
}

async function logout() {
  await makeRequest("php/auth.php", { action: "logout" })
  localStorage.removeItem("nuflow_user")
  window.location.href = "index.html"
}

// Dashboard initialization
async function initializeDashboard() {
  const userResult = await makeRequest("php/auth.php", { action: "check_session" })

  if (!userResult.success) {
    window.location.href = "index.html"
    return
  }

  currentUser = {
    id: Number.parseInt(userResult.user_id || userResult.id),
    username: userResult.username,
    role: userResult.role,
  }

  console.log("[v0] Current user set:", currentUser)

  document.getElementById("userRole").textContent = currentUser.role
  document.getElementById("userName").textContent = currentUser.username

  // Show/hide elements based on user role
  if (currentUser.role === "SDAO Office") {
    document.getElementById("createEventBtn").style.display = "inline-block"
    document.getElementById("createEventBtn").textContent = "Create Event"
    document.getElementById("createAnnouncementBtn").style.display = "inline-block"
    document.getElementById("createAnnouncementBtn").textContent = "Create Announcement"
    document.getElementById("approvalDashboardLink").style.display = "inline-block"
    document.getElementById("pendingApprovalsSection").style.display = "block"
    console.log("[v0] User is SDAO Office - can create events directly")
  } else if (currentUser.role === "Student Organizations") {
    document.getElementById("createEventBtn").style.display = "inline-block"
    document.getElementById("createEventBtn").textContent = "Request Event"
    document.getElementById("createAnnouncementBtn").style.display = "inline-block"
    document.getElementById("createAnnouncementBtn").textContent = "Request Announcement"
    document.getElementById("userPendingSection").style.display = "block"
    document.getElementById("userPendingAnnouncementsSection").style.display = "block"
    console.log("[v0] User is Student Organization - can request events")
  } else if (currentUser.role === "Facilities Office") {
    console.log("[v0] User is Facilities Office - can manage facility bookings")
  }

  loadEvents()
  await loadFacilities()
  loadAnnouncements()

  // Load user's pending items if student organization
  if (currentUser.role === "Student Organizations") {
    loadUserPendingEvents()
    loadUserPendingAnnouncements()
  }

  // Load pending items for approval if SDAO
  if (currentUser.role === "SDAO Office") {
    loadPendingEvents()
  }

  setupEventListeners()
  generateCalendar()

  // Initialize inbox
  initializeInbox()
}

// Inbox/Notifications functionality
async function initializeInbox() {
  await loadNotifications()
  await updateNotificationCount()

  // Set up periodic refresh
  setInterval(async () => {
    await updateNotificationCount()
  }, 30000) // Check every 30 seconds
}

async function loadNotifications() {
  const result = await makeRequest("php/notifications.php", { action: "get" }, "GET")

  if (result.success) {
    displayNotifications(result.notifications)
  }
}

async function updateNotificationCount() {
  const result = await makeRequest("php/notifications.php", { action: "getUnreadCount" }, "GET")

  if (result.success) {
    const countElement = document.getElementById("notificationCount")
    if (result.count > 0) {
      countElement.textContent = result.count
      countElement.style.display = "inline-block"
    } else {
      countElement.style.display = "none"
    }
  }
}

function displayNotifications(notifications) {
  const notificationsList = document.getElementById("notificationsList")
  notificationsList.innerHTML = ""

  if (!notifications.length) {
    notificationsList.innerHTML = "<p class='no-notifications'>No notifications</p>"
    return
  }

  notifications.forEach((notification) => {
    const div = document.createElement("div")
    div.className = `notification-item ${notification.is_read ? "read" : "unread"}`

    div.innerHTML = `
      <div class="notification-header">
        <span class="notification-title">${notification.title}</span>
        <div class="notification-controls">
          <button class="btn-delete-notification" onclick="deleteNotification(${notification.id})" title="Delete notification">×</button>
          <span class="notification-time">${formatDate(notification.created_at)}</span>
        </div>
      </div>
      <div class="notification-message">${notification.message}</div>
      ${!notification.is_read ? `<button class="btn-small mark-read-btn" onclick="markAsRead(${notification.id})">Mark as Read</button>` : ""}
    `

    notificationsList.appendChild(div)
  })
}

async function markAsRead(notificationId) {
  const result = await makeRequest("php/notifications.php", {
    action: "markAsRead",
    id: notificationId,
  })

  if (result.success) {
    await loadNotifications()
    await updateNotificationCount()
  }
}

async function deleteNotification(notificationId) {
  const result = await makeRequest("php/notifications.php", {
    action: "delete",
    id: notificationId,
  })

  if (result.success) {
    await loadNotifications()
    await updateNotificationCount()
  } else {
    alert("Failed to delete notification: " + (result.message || "Unknown error"))
  }
}

async function markAllAsRead() {
  const result = await makeRequest("php/notifications.php", {
    action: "markAllAsRead"
  })

  if (result.success) {
    await loadNotifications()
    await updateNotificationCount()
  }
}

// Event listeners
function setupEventListeners() {
  document.getElementById("logoutBtn").addEventListener("click", logout)

  document.getElementById("prevMonth").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1)
    generateCalendar()
  })
  document.getElementById("nextMonth").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1)
    generateCalendar()
  })

  const createEventBtn = document.getElementById("createEventBtn")
  if (createEventBtn) {
    createEventBtn.addEventListener("click", () => openModal("createEventModal"))
  }

  const createEventForm = document.getElementById("createEventForm")
  if (createEventForm) {
    createEventForm.addEventListener("submit", handleCreateEvent)
  }

  const createAnnouncementBtn = document.getElementById("createAnnouncementBtn")
  if (createAnnouncementBtn) {
    createAnnouncementBtn.addEventListener("click", (e) => {
      e.preventDefault()
      e.stopPropagation()
      console.log("Create Announcement button clicked!")
      openModal("createAnnouncementModal")
    })
  }

  const createAnnouncementForm = document.getElementById("createAnnouncementForm")
  if (createAnnouncementForm) {
    createAnnouncementForm.addEventListener("submit", handleCreateAnnouncement)
  }

  // Inbox event listeners
  const inboxBtn = document.getElementById("inboxBtn")
  const inboxDropdown = document.getElementById("inboxDropdown")

  if (inboxBtn && inboxDropdown) {
    inboxBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      inboxDropdown.style.display = inboxDropdown.style.display === "none" ? "block" : "none"
    })

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!inboxBtn.contains(e.target) && !inboxDropdown.contains(e.target)) {
        inboxDropdown.style.display = "none"
      }
    })
  }

  const markAllReadBtn = document.getElementById("markAllReadBtn")
  if (markAllReadBtn) {
    markAllReadBtn.addEventListener("click", markAllAsRead)
  }

  document.querySelectorAll(".modal .close").forEach((closeBtn) => {
    closeBtn.addEventListener("click", function () {
      const modal = this.closest(".modal")
      if (modal) {
        closeModal(modal.id)
      }
    })
  })

  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", function (e) {
      if (e.target === this) {
        closeModal(this.id)
      }
    })
  })
}

// Calendar generation
function generateCalendar() {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  document.getElementById("currentMonth").textContent = new Date(year, month).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  })

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const calendarGrid = document.getElementById("calendarGrid")
  calendarGrid.innerHTML = ""
  ;["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((day) => {
    const el = document.createElement("div")
    el.className = "calendar-day calendar-header"
    el.textContent = day
    calendarGrid.appendChild(el)
  })

  for (let i = 0; i < firstDay; i++) calendarGrid.appendChild(document.createElement("div"))

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const el = document.createElement("div")
    el.className = "calendar-day"
    el.textContent = day

    if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) el.classList.add("today")
    if (events.some((e) => e.event_date === dateStr)) el.classList.add("has-event")

    el.addEventListener("click", () => {
      document.querySelectorAll(".calendar-day").forEach((d) => d.classList.remove("selected"))
      el.classList.add("selected")
      highlightEventsForDate(dateStr)
    })

    calendarGrid.appendChild(el)
  }
}

function highlightEventsForDate(dateStr) {
  document.querySelectorAll(".event-item").forEach((item) => {
    item.classList.toggle("selected", item.dataset.date === dateStr)
  })
}

// Load events from PHP
async function loadEvents() {
  console.log("[v0] loadEvents() called")
  const result = await makeRequest("php/events.php", { action: "get" })
  console.log("[v0] loadEvents result:", result)

  if (result.success) {
    events = result.events
    console.log("[v0] Loaded events:", events)
    console.log("[v0] Total events from backend:", events.length)
  } else {
    console.warn("[v0] Failed to load events:", result.message)
    events = []
  }
  displayEvents()
  generateCalendar()
}

// Load user's pending events (for Student Organizations)
async function loadUserPendingEvents() {
  console.log("[v0] loadUserPendingEvents() called")
  const result = await makeRequest("php/events.php", { action: "getUserEvents" })
  console.log("[v0] loadUserPendingEvents result:", result)

  if (result.success) {
    userPendingEvents = result.events.filter((event) => event.approval_status === "Pending")
    console.log("[v0] Loaded user pending events:", userPendingEvents)
  } else {
    console.warn("[v0] Failed to load user pending events:", result.message)
    userPendingEvents = []
  }
  displayUserPendingEvents()
}

// Load pending events for SDAO approval
async function loadPendingEvents() {
  console.log("[v0] loadPendingEvents() called")
  const result = await makeRequest("php/events.php", { action: "getPending" })
  console.log("[v0] loadPendingEvents result:", result)

  if (result.success) {
    const pendingEvents = result.events
    console.log("[v0] Loaded pending events for approval:", pendingEvents)
    displayPendingEventsForApproval(pendingEvents)
  } else {
    console.warn("[v0] Failed to load pending events:", result.message)
  }
}

function displayUserPendingEvents() {
  const userPendingEventsList = document.getElementById("userPendingEventsList")
  if (!userPendingEventsList) return

  userPendingEventsList.innerHTML = ""

  if (!userPendingEvents.length) {
    userPendingEventsList.innerHTML = "<p>No pending event requests</p>"
    return
  }

  userPendingEvents.forEach((event) => {
    const div = document.createElement("div")
    div.className = "pending-request-item"
    div.dataset.date = event.event_date

    div.innerHTML = `
      <div class="pending-card-header">
        <div class="pending-card-title">${event.title}</div>
      </div>
      <div class="pending-card-meta">
        <div class="meta-item">
          <span class="meta-icon">📅</span>
          <span class="meta-date">${formatDate(event.event_date)} at ${formatTime(event.event_time)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Requested by:</span>
          <span class="meta-value">${event.organization_name || event.creator || "Unknown"}</span>
        </div>
        <div class="meta-item venue-item">
          <span class="venue-icon">📍</span>
          <span class="venue-name">${event.venue || "TBD"}</span>
        </div>
      </div>
    `
    userPendingEventsList.appendChild(div)
  })
}

function displayPendingEventsForApproval(pendingEvents) {
  const pendingEventsList = document.getElementById("pendingEventsList")
  if (!pendingEventsList) return

  pendingEventsList.innerHTML = ""

  if (!pendingEvents.length) {
    pendingEventsList.innerHTML = "<p>No pending events for approval</p>"
    return
  }

  pendingEvents.forEach((event) => {
    const div = document.createElement("div")
    div.className = "pending-request-item"
    div.dataset.date = event.event_date

    div.innerHTML = `
      <div class="pending-card-header">
        <div class="pending-card-title">${event.title}</div>
      </div>
      <div class="pending-card-meta">
        <div class="meta-item">
          <span class="meta-icon">📅</span>
          <span class="meta-date">${formatDate(event.event_date)} at ${formatTime(event.event_time)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Requested by:</span>
          <span class="meta-value">${event.organization_name || event.creator || "Unknown"}</span>
        </div>
        <div class="meta-item venue-item">
          <span class="venue-icon">📍</span>
          <span class="venue-name">${event.venue || "TBD"}</span>
        </div>
      </div>
      <div class="pending-card-actions">
        <button class="btn-approve" onclick="approveEventHandler(${event.id})">Approve</button>
        <button class="btn-reject" onclick="rejectEventHandler(${event.id})">Reject</button>
      </div>
    `
    pendingEventsList.appendChild(div)
  })
}

function displayEvents() {
  console.log("[v0] displayEvents() called with", events.length, "total events")
  console.log("[v0] Current user:", currentUser)
  const eventList = document.getElementById("eventList")
  eventList.innerHTML = ""

  const displayEventsList = events

  console.log("[v0] Events to display:", displayEventsList.length)

  if (!displayEventsList.length) {
    eventList.innerHTML = "<p>No upcoming events</p>"
    console.log("[v0] No events to display")
    return
  }

  displayEventsList.forEach((event) => {
    const div = document.createElement("div")
    div.className = "event-item"
    div.dataset.date = event.event_date

    const canDelete =
      currentUser &&
      (currentUser.role === "SDAO Office" || Number.parseInt(event.created_by) === Number.parseInt(currentUser.id))

    console.log(
      "[v0] Event:",
      event.title,
      "- Can delete:",
      canDelete,
      "- User role:",
      currentUser?.role,
      "- Event creator:",
      event.created_by,
      "- Current user ID:",
      currentUser?.id,
    )

    let actionsHTML = ""

    if (canDelete) {
      actionsHTML = `<div class="event-actions">`
      actionsHTML += `<button class="btn-delete" onclick="deleteEvent(${event.id})">Delete</button>`
      actionsHTML += `</div>`
      console.log("[v0] Generated actions HTML:", actionsHTML)
    }

    // Get facility color indicator (using a pink dot as in reference image)
    const facilityIndicator = event.venue ? `<span class="facility-indicator">●</span>` : ""

    div.innerHTML = `
            <div class="event-header">
              <div class="event-title-section">
                <div class="event-title">${event.title}</div>
                <div class="event-date">📅 ${formatDate(event.event_date)} at ${formatTime(event.event_time)}</div>
              </div>
            </div>
            <div class="event-venue-section">
              ${facilityIndicator}
              <span class="event-venue">${event.venue || "TBD"}</span>
            </div>
            ${actionsHTML}`
    eventList.appendChild(div)
  })
}

// Create event (send to backend)
async function handleCreateEvent(e) {
  e.preventDefault()

  const titleInput = document.getElementById("eventTitle")
  const dateInput = document.getElementById("eventDate")
  const timeInput = document.getElementById("eventTime")
  const endTimeInput = document.getElementById("eventEndTime")
  const facilitySelect = document.getElementById("eventFacilityId")
  const descriptionInput = document.getElementById("eventDescription")

  if (!titleInput.value.trim()) {
    showMessage("eventMessage", "Event title is required", "error")
    return
  }
  if (!dateInput.value) {
    showMessage("eventMessage", "Event date is required", "error")
    return
  }
  if (!timeInput.value) {
    showMessage("eventMessage", "Start time is required", "error")
    return
  }
  if (!endTimeInput.value) {
    showMessage("eventMessage", "End time is required", "error")
    return
  }
  if (!facilitySelect.value) {
    showMessage("eventMessage", "Please select a facility", "error")
    return
  }

  const selectedFacility = document.querySelector("#eventFacilityId option:checked")
  const facilityName = selectedFacility ? selectedFacility.textContent : ""

  const data = {
    action: "create",
    title: titleInput.value,
    description: descriptionInput.value || "",
    event_date: dateInput.value,
    event_time: timeInput.value,
    end_time: endTimeInput.value,
    venue: facilityName,
    facility_id: facilitySelect.value,
    user_id: currentUser.id,
  }

  console.log("[v0] Creating event with data:", data)

  const result = await makeRequest("php/events.php", data)

  console.log("[v0] Create event result:", result)

  if (result.success) {
    let messageType = "success"
    let displayMessage = result.message
    
    // Enhanced feedback for reapproval workflow
    if (result.needs_reapproval) {
      messageType = "warning"
      displayMessage += " The event will be hidden from public view until approved."
    }
    
    showMessage("eventMessage", displayMessage, messageType)

    closeModal("createEventModal")
    e.target.reset()
    await loadEvents()

    // Reload user's pending events if student organization
    if (currentUser.role === "Student Organizations") {
      await loadUserPendingEvents()
    }

    // Reload pending events if SDAO
    if (currentUser.role === "SDAO Office") {
      await loadPendingEvents()
    }
  } else {
    showMessage("eventMessage", "Failed to create event: " + (result.message || "Unknown error"), "error")
  }
}

// Load facilities and announcements functions
async function loadFacilities() {
  try {
    console.log("[v0] Starting to load facilities...")
    const result = await makeRequest("php/fetch_facilities.php", null, "GET")

    console.log("[v0] Facilities data received:", result)

    if (result.success && Array.isArray(result.facilities) && result.facilities.length > 0) {
      facilities = result.facilities
      console.log("[v0] Loaded", facilities.length, "facilities from database")
    } else {
      console.log("[v0] No facilities from database, using hardcoded data")
      facilities = facilitiesData.map((f, index) => ({
        id: index + 1,
        name: f.name,
        image: f.image,
      }))
    }

    console.log("[v0] Final facilities array:", facilities)
    displayFacilities()
    populateFacilityDropdowns()
  } catch (error) {
    console.error("[v0] Error loading facilities:", error)
    facilities = facilitiesData.map((f, index) => ({
      id: index + 1,
      name: f.name,
      image: f.image,
    }))
    console.log("[v0] Using fallback facilities:", facilities)
    displayFacilities()
    populateFacilityDropdowns()
  }
}

function displayFacilities() {
  const facilityList = document.getElementById("facilityList")
  if (!facilityList) return

  facilityList.innerHTML = ""

  facilities.forEach((facility) => {
    const facilityData = facilitiesData.find((f) => f.name === facility.name)
    const imagePath = facilityData ? facilityData.image : "assets/placeholder.jpg"

    const div = document.createElement("div")
    div.className = "facility-item"
    div.innerHTML = `
      <img src="${imagePath}" alt="${facility.name}" class="facility-image">
      <span class="facility-name">${facility.name}</span>
    `
    facilityList.appendChild(div)
  })

  setupFacilityClickHandlers()
}

function populateFacilityDropdowns() {
  console.log("[v0] populateFacilityDropdowns called with", facilities.length, "facilities")

  const eventFacilitySelect = document.getElementById("eventFacilityId")

  if (eventFacilitySelect) {
    eventFacilitySelect.innerHTML = '<option value="">Select a facility</option>'

    const facilitiesToUse =
      facilities.length > 0
        ? facilities
        : facilitiesData.map((f, index) => ({
            id: index + 1,
            name: f.name,
            image: f.image,
          }))

    facilitiesToUse.forEach((facility) => {
      const option = document.createElement("option")
      option.value = facility.id
      option.textContent = facility.name
      option.dataset.image = facility.image || ""
      eventFacilitySelect.appendChild(option)
      console.log("[v0] Added option:", facility.name)
    })

    console.log("[v0] Successfully populated eventFacilityId with", facilitiesToUse.length, "facilities")
  } else {
    console.error("[v0] eventFacilityId dropdown not found in DOM")
  }
}

async function loadAnnouncements() {
  const result = await makeRequest("php/announcements.php", { action: "get" })
  if (result.success) {
    announcements = result.announcements
  } else {
    console.warn("Failed to load announcements, using empty list")
    announcements = []
  }
  displayAnnouncements()
}

// Load user's pending announcements (for Student Organizations)
async function loadUserPendingAnnouncements() {
  console.log("[v0] loadUserPendingAnnouncements() called")
  const result = await makeRequest("php/announcements.php", { action: "getUserAnnouncements" })
  console.log("[v0] loadUserPendingAnnouncements result:", result)

  if (result.success) {
    userPendingAnnouncements = result.announcements.filter((announcement) => announcement.approval_status === "Pending")
    console.log("[v0] Loaded user pending announcements:", userPendingAnnouncements)
  } else {
    console.warn("[v0] Failed to load user pending announcements:", result.message)
    userPendingAnnouncements = []
  }
  displayUserPendingAnnouncements()
}

function displayUserPendingAnnouncements() {
  const userPendingAnnouncementsList = document.getElementById("userPendingAnnouncementsList")
  if (!userPendingAnnouncementsList) return

  userPendingAnnouncementsList.innerHTML = ""

  if (!userPendingAnnouncements.length) {
    userPendingAnnouncementsList.innerHTML = "<p>No pending announcement requests</p>"
    return
  }

  userPendingAnnouncements.forEach((announcement) => {
    const div = document.createElement("div")
    div.className = `announcement-item pending priority-${announcement.priority.toLowerCase()}`

    div.innerHTML = `
      <div class="announcement-title">${announcement.title}</div>
      <div class="announcement-content">${announcement.content}</div>
      <div class="announcement-meta">
        <span class="priority-badge ${announcement.priority.toLowerCase()}">${announcement.priority}</span>
        <span class="status-pending">Status: Pending Approval</span>
        <span>${formatDate(announcement.created_at)}</span>
      </div>
    `
    userPendingAnnouncementsList.appendChild(div)
  })
}

function displayAnnouncements() {
  const announcementsList = document.getElementById("announcementsList")
  announcementsList.innerHTML = ""

  console.log("[v0] displayAnnouncements() - Current user:", currentUser)

  if (!announcements.length) {
    announcementsList.innerHTML = "<p>No announcements</p>"
    return
  }

  announcements.forEach((announcement) => {
    const div = document.createElement("div")
    div.className = `announcement-item priority-${announcement.priority.toLowerCase()}`

    const canDelete = currentUser && currentUser.role === "SDAO Office"

    console.log(
      "[v0] Announcement:",
      announcement.title,
      "- Can delete:",
      canDelete,
      "- User role:",
      currentUser?.role,
    )

    let actionsHTML = ""

    if (canDelete) {
      actionsHTML = `<div class="announcement-actions">`
      actionsHTML += `<button class="btn-delete" onclick="deleteAnnouncement(${announcement.id})">Delete</button>`
      actionsHTML += `</div>`
      console.log("[v0] Generated announcement actions HTML:", actionsHTML)
    }

    div.innerHTML = `
      <div class="announcement-title">${announcement.title}</div>
      <div class="announcement-content">${announcement.content}</div>
      <div class="announcement-meta">
        <span class="priority-badge ${announcement.priority.toLowerCase()}">${announcement.priority}</span>
        <span>By: ${announcement.creator || "Unknown"}</span>
        <span>${formatDate(announcement.created_at)}</span>
      </div>
      ${actionsHTML}
    `
    announcementsList.appendChild(div)
  })
}

async function approveEventHandler(id) {
  if (!confirm("Are you sure you want to approve this event?")) {
    return
  }

  const result = await makeRequest("php/events.php", {
    action: "approve",
    id: id,
  })

  if (result.success) {
    alert("Event approved successfully!")
    loadEvents()
    loadPendingEvents()
  } else {
    alert("Failed to approve event: " + (result.message || "Unknown error"))
  }
}

async function rejectEventHandler(id) {
  const reason = prompt("Enter rejection reason (optional):")
  if (reason === null) {
    return
  }

  const result = await makeRequest("php/events.php", {
    action: "reject",
    id: id,
    reason: reason,
  })

  if (result.success) {
    alert("Event rejected successfully!")
    loadEvents()
    loadPendingEvents()
  } else {
    alert("Failed to reject event: " + (result.message || "Unknown error"))
  }
}

async function deleteAnnouncement(id) {
  if (!confirm("Are you sure you want to delete this announcement?")) {
    return
  }

  const result = await makeRequest("php/announcements.php", {
    action: "delete",
    id: id,
  })

  if (result.success) {
    alert("Announcement deleted successfully!")
    loadAnnouncements()
  } else {
    alert("Failed to delete announcement: " + (result.message || "Unknown error"))
  }
}

async function handleCreateAnnouncement(e) {
  e.preventDefault()

  const titleInput = document.getElementById("announcementTitle")
  const contentInput = document.getElementById("announcementContent")
  const priorityInput = document.getElementById("announcementPriority")

  if (!titleInput.value || !contentInput.value) {
    alert("Please fill in all required fields")
    return
  }

  const data = {
    action: "create",
    title: titleInput.value,
    content: contentInput.value,
    priority: priorityInput.value,
    userId: currentUser.id,
  }

  const result = await makeRequest("php/announcements.php", data)

  if (result.success) {
    alert(result.message)

    closeModal("createAnnouncementModal")
    loadAnnouncements()

    // Reload user's pending announcements if student organization
    if (currentUser.role === "Student Organizations") {
      loadUserPendingAnnouncements()
    }
  } else {
    alert("Failed to create announcement: " + (result.message || "Unknown error"))
  }
}

// Modal helpers
function openModal(id) {
  console.log("Opening modal:", id)
  const modal = document.getElementById(id)
  if (modal) {
    modal.style.display = "block"
    document.body.style.overflow = "hidden"
    console.log("Modal opened successfully:", id)

    if (id === "createEventModal") {
      populateFacilityDropdowns()

      // Update modal title and button text based on user role
      const modalTitle = document.querySelector("#createEventModal .modal-header h3")
      const submitBtn = document.querySelector("#createEventModal button[type='submit']")

      if (currentUser.role === "SDAO Office") {
        modalTitle.textContent = "Create New Event"
        submitBtn.textContent = "Create Event"
      } else {
        modalTitle.textContent = "Request New Event"
        submitBtn.textContent = "Request Event"
      }
    }

    if (id === "createAnnouncementModal") {
      // Update modal title and button text based on user role
      const modalTitle = document.querySelector("#createAnnouncementModal .modal-header h3")
      const submitBtn = document.querySelector("#createAnnouncementModal button[type='submit']")

      if (currentUser.role === "SDAO Office") {
        modalTitle.textContent = "Create Announcement"
        submitBtn.textContent = "Create"
      } else {
        modalTitle.textContent = "Request Announcement"
        submitBtn.textContent = "Request"
      }
    }
  } else {
    console.error("Modal not found:", id)
  }
}

function closeModal(id) {
  console.log("Closing modal:", id)
  const modal = document.getElementById(id)
  if (modal) {
    modal.style.display = "none"
    document.body.style.overflow = "auto"

    const form = modal.querySelector("form")
    if (form) {
      form.reset()
    }
    console.log("Modal closed successfully:", id)
  }
}

// Init
document.addEventListener("DOMContentLoaded", async () => {
  const page = window.location.pathname.split("/").pop()

  await loadFacilities()

  if (page === "dashboard.html") {
    fetch("php/auth.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "action=check_session",
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("[v0] Session check response:", data)

        if (!data.success || !data.loggedIn) {
          window.location.href = "index.html"
        } else {
          currentUser = {
            id: Number.parseInt(data.user_id || data.id),
            username: data.username,
            role: data.role,
          }
          console.log("[v0] Current user initialized:", currentUser)
          localStorage.setItem("nuflow_user", JSON.stringify(currentUser))
          initializeDashboard()
        }
      })
      .catch((error) => {
        console.error("[v0] Session check failed:", error)
        window.location.href = "index.html"
      })
  } else if (page === "index.html" || page === "") {
    const form = document.getElementById("loginForm")
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault()
        const username = document.getElementById("username").value
        const password = document.getElementById("password").value

        if (!username || !password) {
          showMessage("loginMessage", "Please enter both username and password", "error")
          return
        }

        login(username, password)
      })
    }
  } else if (page === "register.html") {
    const form = document.getElementById("registerForm")
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault()

        const username = document.getElementById("username").value
        const email = document.getElementById("email").value
        const password = document.getElementById("password").value
        const confirmPassword = document.getElementById("confirmPassword").value
        const organization = document.getElementById("organization").value

        // Client-side validation
        if (!username || !email || !password || !confirmPassword || !organization) {
          showMessage("registerMessage", "Please fill in all fields", "error")
          return
        }

        register(username, email, password, confirmPassword, organization)
      })
    }
  }
})

// Search functionality
const facilitySearch = document.getElementById("facilitySearch")
if (facilitySearch) {
  facilitySearch.addEventListener("input", () => {
    const query = facilitySearch.value.toLowerCase()
    document.querySelectorAll(".facility-item").forEach((item) => {
      const name = item.querySelector(".facility-name").textContent.toLowerCase()
      item.style.display = name.includes(query) ? "flex" : "none"
    })
  })
}

async function deleteEvent(id) {
  if (!confirm("Are you sure you want to delete this event?")) {
    return
  }

  const result = await makeRequest("php/events.php", {
    action: "delete",
    id: id,
  })

  if (result.success) {
    alert("Event deleted successfully!")
    loadEvents()
  } else {
    alert("Failed to delete event: " + (result.message || "Unknown error"))
  }
}

// Facility filtering
async function filterEventsByFacility(facilityId) {
  if (!facilityId) {
    console.log("[v0] No facility ID provided, loading all events")
    loadEvents()
    return
  }

  console.log("[v0] Filtering events by facility ID:", facilityId)

  const result = await makeRequest("php/events.php", { action: "getByFacility", facilityId: facilityId }, "POST")

  console.log("[v0] Filter result:", result)

  if (result.success && Array.isArray(result.events)) {
    events = result.events
    console.log("[v0] Filtered events count:", events.length)
    console.log("[v0] Filtered events:", events)
    displayEvents()
    generateCalendar()
  } else {
    console.warn("[v0] Failed to filter events by facility:", result.message)
    events = []
    displayEvents()
  }
}

function setupFacilityClickHandlers() {
  document.querySelectorAll(".facility-item").forEach((item) => {
    item.addEventListener("click", async () => {
      const facilityName = item.querySelector(".facility-name").textContent
      const facility = facilities.find((f) => f.name === facilityName)

      console.log("[v0] Facility clicked:", facilityName, "ID:", facility?.id)
      console.log("[v0] All facilities:", facilities)

      if (facility && facility.id) {
        // Remove selected class from all facilities
        document.querySelectorAll(".facility-item").forEach((f) => f.classList.remove("selected"))
        item.classList.add("selected")

        console.log("[v0] Calling filterEventsByFacility with ID:", facility.id)
        await filterEventsByFacility(facility.id)
      } else {
        console.error("[v0] Facility not found or missing ID:", facilityName, facility)
      }
    })
  })
}