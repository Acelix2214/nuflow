// Global variables
let currentUser = null;
let pendingEvents = [];
let pendingAnnouncements = [];
let currentRejectItem = null;

// Utility functions
function showMessage(message, type = "error") {
    alert(message); // Simple alert for now, can be enhanced later
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function formatTime(timeString) {
    const time = new Date(`2000-01-01 ${timeString}`);
    return time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

// API utility
async function makeRequest(url, data = null, method = "POST") {
    try {
        const options = { method, headers: { "Content-Type": "application/x-www-form-urlencoded" } };
        if (data) options.body = new URLSearchParams(data);

        console.log("[Approvals] Making request to:", url, "with data:", data);

        const response = await fetch(url, options);
        console.log("[Approvals] Response status:", response.status, response.statusText);

        let responseText = "";
        try {
            responseText = await response.text();
        } catch (readError) {
            console.error("[Approvals] Error reading response:", readError);
            return { success: false, message: `Network error: Failed to read response` };
        }

        if (!response.ok) {
            console.error("[Approvals] Response error:", responseText);
            return { success: false, message: `Server error: ${response.status} - ${responseText.substring(0, 100)}` };
        }

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error("[Approvals] JSON parse error. Response text:", responseText);
            return {
                success: false,
                message: `Server returned invalid JSON. This usually means there's a database connection issue.`,
            };
        }

        console.log("[Approvals] Response data:", result);
        return result;
    } catch (error) {
        console.error("[Approvals] Request error:", error);
        return { success: false, message: `Network error: ${error.message}` };
    }
}

// Authentication check
async function checkAuthentication() {
    const userResult = await makeRequest("php/auth.php", { action: "check_session" });

    if (!userResult.success) {
        window.location.href = "index.html";
        return false;
    }

    currentUser = {
        id: parseInt(userResult.user_id || userResult.id),
        username: userResult.username,
        role: userResult.role,
    };

    // Check if user is SDAO Office
    if (currentUser.role !== "SDAO Office") {
        alert("Access denied. Only SDAO Office can access this page.");
        window.location.href = "dashboard.html";
        return false;
    }

    document.getElementById("userRole").textContent = currentUser.role;
    document.getElementById("userName").textContent = currentUser.username;

    return true;
}

// Load pending events
async function loadPendingEvents() {
    console.log("[Approvals] Loading pending events...");
    const result = await makeRequest("php/events.php", { action: "getPending" });

    if (result.success) {
        pendingEvents = result.events;
        console.log("[Approvals] Loaded pending events:", pendingEvents);
    } else {
        console.warn("[Approvals] Failed to load pending events:", result.message);
        pendingEvents = [];
    }
    displayPendingEvents();
}

// Display pending events
function displayPendingEvents() {
    const eventsList = document.getElementById("pendingEventsList");
    eventsList.innerHTML = "";

    if (!pendingEvents.length) {
        eventsList.innerHTML = "<p>No pending event requests</p>";
        return;
    }

    pendingEvents.forEach((event) => {
        const div = document.createElement("div");
        div.className = "pending-request-item";

        div.innerHTML = `
            <div class="request-header">
                <div class="request-title">${event.title}</div>
                <div class="request-meta">
                    <span class="request-org">By: ${event.organization_name || event.creator}</span>
                    <span class="request-date">📅 ${formatDate(event.event_date)} at ${formatTime(event.event_time)}</span>
                </div>
            </div>
            <div class="request-details">
                <p><strong>Description:</strong> ${event.description || "No description provided"}</p>
                <p><strong>Venue:</strong> ${event.venue || "TBD"}</p>
                <p><strong>Duration:</strong> ${formatTime(event.event_time)} - ${formatTime(event.end_time)}</p>
                <p><strong>Submitted:</strong> ${formatDate(event.created_at)}</p>
            </div>
            <div class="request-actions">
                <button class="btn-approve" onclick="approveEvent(${event.id})">Approve</button>
                <button class="btn-reject" onclick="showRejectModal('event', ${event.id})">Reject</button>
            </div>
        `;
        eventsList.appendChild(div);
    });
}

// Load pending announcements
async function loadPendingAnnouncements() {
    console.log("[Approvals] Loading pending announcements...");
    const result = await makeRequest("php/announcements.php", { action: "getPending" });

    if (result.success) {
        pendingAnnouncements = result.announcements;
        console.log("[Approvals] Loaded pending announcements:", pendingAnnouncements);
    } else {
        console.warn("[Approvals] Failed to load pending announcements:", result.message);
        pendingAnnouncements = [];
    }
    displayPendingAnnouncements();
}

// Display pending announcements
function displayPendingAnnouncements() {
    const announcementsList = document.getElementById("pendingAnnouncementsList");
    announcementsList.innerHTML = "";

    if (!pendingAnnouncements.length) {
        announcementsList.innerHTML = "<p>No pending announcement requests</p>";
        return;
    }

    pendingAnnouncements.forEach((announcement) => {
        const div = document.createElement("div");
        div.className = "pending-request-item";

        div.innerHTML = `
            <div class="request-header">
                <div class="request-title">${announcement.title}</div>
                <div class="request-meta">
                    <span class="request-org">By: ${announcement.organization_name || announcement.creator}</span>
                    <span class="priority-badge ${announcement.priority.toLowerCase()}">${announcement.priority}</span>
                </div>
            </div>
            <div class="request-details">
                <p><strong>Content:</strong> ${announcement.content}</p>
                <p><strong>Submitted:</strong> ${formatDate(announcement.created_at)}</p>
            </div>
            <div class="request-actions">
                <button class="btn-approve" onclick="approveAnnouncement(${announcement.id})">Approve</button>
                <button class="btn-reject" onclick="showRejectModal('announcement', ${announcement.id})">Reject</button>
            </div>
        `;
        announcementsList.appendChild(div);
    });
}

// Approve event
async function approveEvent(id) {
    if (!confirm("Are you sure you want to approve this event?")) {
        return;
    }

    const result = await makeRequest("php/events.php", {
        action: "approve",
        id: id,
    });

    if (result.success) {
        showMessage("Event approved successfully!", "success");
        loadPendingEvents();
    } else {
        showMessage("Failed to approve event: " + (result.message || "Unknown error"), "error");
    }
}

// Approve announcement
async function approveAnnouncement(id) {
    if (!confirm("Are you sure you want to approve this announcement?")) {
        return;
    }

    const result = await makeRequest("php/announcements.php", {
        action: "approve",
        id: id,
    });

    if (result.success) {
        showMessage("Announcement approved successfully!", "success");
        loadPendingAnnouncements();
    } else {
        showMessage("Failed to approve announcement: " + (result.message || "Unknown error"), "error");
    }
}

// Show reject modal
function showRejectModal(type, id) {
    currentRejectItem = { type, id };
    document.getElementById("rejectionReason").value = "";
    openModal("rejectionReasonModal");
}

// Handle rejection with reason
async function handleRejection(e) {
    e.preventDefault();

    if (!currentRejectItem) {
        return;
    }

    const reason = document.getElementById("rejectionReason").value.trim();
    if (!reason) {
        showMessage("Please provide a reason for rejection", "error");
        return;
    }

    const endpoint = currentRejectItem.type === "event" ? "php/events.php" : "php/announcements.php";
    const result = await makeRequest(endpoint, {
        action: "reject",
        id: currentRejectItem.id,
        reason: reason,
    });

    if (result.success) {
        showMessage(`${currentRejectItem.type === "event" ? "Event" : "Announcement"} rejected successfully!`, "success");
        closeModal("rejectionReasonModal");
        
        if (currentRejectItem.type === "event") {
            loadPendingEvents();
        } else {
            loadPendingAnnouncements();
        }
    } else {
        showMessage(`Failed to reject ${currentRejectItem.type}: ` + (result.message || "Unknown error"), "error");
    }

    currentRejectItem = null;
}

// Modal helpers
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = "block";
        document.body.style.overflow = "hidden";
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
        
        const form = modal.querySelector("form");
        if (form) {
            form.reset();
        }
    }
}

// Event listeners
function setupEventListeners() {
    document.getElementById("logoutBtn").addEventListener("click", async () => {
        await makeRequest("php/auth.php", { action: "logout" });
        localStorage.removeItem("nuflow_user");
        window.location.href = "index.html";
    });

    document.getElementById("refreshEventsBtn").addEventListener("click", loadPendingEvents);
    document.getElementById("refreshAnnouncementsBtn").addEventListener("click", loadPendingAnnouncements);

    // Modal event listeners
    document.querySelectorAll(".modal .close").forEach((closeBtn) => {
        closeBtn.addEventListener("click", function () {
            const modal = this.closest(".modal");
            if (modal) {
                closeModal(modal.id);
            }
        });
    });

    document.querySelectorAll(".modal").forEach((modal) => {
        modal.addEventListener("click", function (e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });

    // Rejection form
    document.getElementById("rejectionReasonForm").addEventListener("submit", handleRejection);
}

// Initialize dashboard
async function initializeApprovalsDashboard() {
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
        return;
    }

    setupEventListeners();
    await loadPendingEvents();
    await loadPendingAnnouncements();
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", initializeApprovalsDashboard);