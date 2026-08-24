// Main Application Logic for Discover Ganghwa

let currentLang = "en";
let currentCategory = "all";
let searchQuery = "";
let customPlan = [];

// Load custom itinerary from localStorage if available
function loadSavedPlan() {
  try {
    const saved = localStorage.getItem("ganghwa_custom_plan");
    if (saved) {
      customPlan = JSON.parse(saved);
    }
  } catch (e) {
    console.warn("Could not access localStorage", e);
  }
}

function savePlan() {
  try {
    localStorage.setItem("ganghwa_custom_plan", JSON.stringify(customPlan));
  } catch (e) {
    console.warn("Could not save to localStorage", e);
  }
}

// Translate UI static labels
function applyTranslations() {
  const dict = I18N[currentLang] || I18N.en;

  // Text Elements with data-i18n
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });

  // Search input placeholder
  const searchInput = document.getElementById("search-input");
  if (searchInput && dict.searchPlaceholder) {
    searchInput.placeholder = dict.searchPlaceholder;
  }
}

// Render Attraction Cards
function renderAttractions() {
  const container = document.getElementById("attractions-grid");
  if (!container) return;

  const dict = I18N[currentLang] || I18N.en;
  
  const filtered = ATTRACTIONS.filter(spot => {
    const matchesCategory = (currentCategory === "all" || spot.category === currentCategory);
    
    const titleText = (spot.title[currentLang] || spot.title.en).toLowerCase();
    const descText = (spot.desc[currentLang] || spot.desc.en).toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    
    const matchesSearch = !q || titleText.includes(q) || descText.includes(q);
    
    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
        <p style="font-size: 1.2rem;">🔍 No attractions match your search.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(spot => {
    const title = spot.title[currentLang] || spot.title.en;
    const desc = spot.desc[currentLang] || spot.desc.en;
    const isInPlan = customPlan.includes(spot.id);

    return `
      <div class="card" id="card-${spot.id}">
        <div class="card-img-wrapper" onclick="openDetailModal('${spot.id}')" style="cursor:pointer;">
          <img src="${spot.image}" alt="${title}" class="card-img" loading="lazy" />
          <span class="card-badge">${spot.badge}</span>
        </div>
        <div class="card-content">
          <h3 class="card-title" onclick="openDetailModal('${spot.id}')" style="cursor:pointer;">${title}</h3>
          <p class="card-desc">${desc}</p>
          <div class="card-meta">
            <div class="card-meta-item">🕒 <strong>${dict.hours}:</strong> ${spot.hours}</div>
            <div class="card-meta-item">🎟️ <strong>${dict.fee}:</strong> ${spot.fee}</div>
          </div>
          <div class="card-actions">
            <button class="btn btn-outline" onclick="openDetailModal('${spot.id}')">
              ℹ️ ${dict.detailTitle}
            </button>
            <button class="btn ${isInPlan ? 'btn-accent' : 'btn-primary'}" onclick="togglePlanItem('${spot.id}')">
              ${isInPlan ? '✓ ' + dict.removeFromPlan : '➕ ' + dict.addToPlan}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// Render Recommended Courses
function renderCourses() {
  const container = document.getElementById("courses-grid");
  if (!container) return;

  const dict = I18N[currentLang] || I18N.en;

  container.innerHTML = RECOMMENDED_COURSES.map(course => {
    const courseTitle = dict[course.titleKey] || course.id;
    
    const stepsHtml = course.spots.map((spotId, idx) => {
      const spot = ATTRACTIONS.find(a => a.id === spotId);
      if (!spot) return "";
      const spotTitle = spot.title[currentLang] || spot.title.en;
      return `
        <div class="timeline-step">
          <span class="step-num">${idx + 1}</span>
          <span>${spotTitle}</span>
        </div>
      `;
    }).join("");

    const tagsHtml = course.tags.map(t => `<span class="tag">#${t}</span>`).join("");

    return `
      <div class="course-card">
        <div class="course-header">
          <h3 class="course-title">🚩 ${courseTitle}</h3>
        </div>
        <div class="tag-group">${tagsHtml}</div>
        <div class="course-timeline">${stepsHtml}</div>
        <button class="btn btn-outline" style="width:100%; margin-top:0.5rem;" onclick="addCourseToPlan('${course.id}')">
          ✨ Add Entire Course to My Plan
        </button>
      </div>
    `;
  }).join("");
}

// Helper to generate Naver Map URL with Korean search term
function getNaverMapUrl(spot) {
  if (!spot) return "#";
  const query = spot.mapQueryKo || (spot.title && spot.title.ko ? spot.title.ko.replace(/\s*\(.*?\)/g, "").split("&")[0].trim() : (spot.title ? spot.title.en : ""));
  return `https://map.naver.com/v5/search/${encodeURIComponent(query)}`;
}

// Render Custom Travel Itinerary
function renderItinerary() {
  const container = document.getElementById("itinerary-list");
  if (!container) return;

  const dict = I18N[currentLang] || I18N.en;

  if (customPlan.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">${dict.noPlanItems}</p>`;
    return;
  }

  container.innerHTML = customPlan.map((spotId, index) => {
    const spot = ATTRACTIONS.find(a => a.id === spotId);
    if (!spot) return "";
    const title = spot.title[currentLang] || spot.title.en;
    
    const googleMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.mapQuery)}`;
    const naverMapUrl = getNaverMapUrl(spot);

    return `
      <div class="itinerary-item">
        <span class="step-num" style="width:20px;height:20px;font-size:0.75rem;">${index + 1}</span>
        <strong style="cursor:pointer;" onclick="openDetailModal('${spot.id}')">${title}</strong>
        <div style="display:flex; gap:0.5rem; align-items:center;">
          <a href="${naverMapUrl}" target="_blank" rel="noopener" style="color:#34d399; font-size:0.8rem; text-decoration:underline;">네이버지도</a>
          <a href="${googleMapUrl}" target="_blank" rel="noopener" style="color:#60a5fa; font-size:0.8rem; text-decoration:underline;">Google Map</a>
        </div>
        <button class="remove-btn" title="Remove" onclick="togglePlanItem('${spot.id}')">✕</button>
      </div>
    `;
  }).join("");
}

// Add/Remove single item from custom itinerary
function togglePlanItem(spotId) {
  const dict = I18N[currentLang] || I18N.en;
  const idx = customPlan.indexOf(spotId);
  
  if (idx > -1) {
    customPlan.splice(idx, 1);
    showToast(dict.removedFromPlanMsg);
  } else {
    customPlan.push(spotId);
    showToast(dict.addedToPlanMsg);
  }
  
  savePlan();
  renderAttractions();
  renderItinerary();
}

// Add whole course to plan
function addCourseToPlan(courseId) {
  const course = RECOMMENDED_COURSES.find(c => c.id === courseId);
  if (!course) return;

  course.spots.forEach(id => {
    if (!customPlan.includes(id)) {
      customPlan.push(id);
    }
  });

  savePlan();
  renderAttractions();
  renderItinerary();
  showToast("Added course to your itinerary!");
}

function clearAllPlan() {
  customPlan = [];
  savePlan();
  renderAttractions();
  renderItinerary();
}

// Toast Notifications
function showToast(msg) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;

  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Modal Detail Window
function openDetailModal(spotId) {
  const spot = ATTRACTIONS.find(a => a.id === spotId);
  if (!spot) return;

  const dict = I18N[currentLang] || I18N.en;
  const title = spot.title[currentLang] || spot.title.en;
  const desc = spot.desc[currentLang] || spot.desc.en;

  const googleMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.mapQuery)}`;
  const naverMapUrl = getNaverMapUrl(spot);

  const modalBody = document.getElementById("modal-body-content");
  modalBody.innerHTML = `
    <img src="${spot.image}" alt="${title}" class="modal-img" />
    <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem;">${title}</h2>
    <span class="card-badge" style="position:static; display:inline-block; margin-bottom:1rem;">${spot.badge}</span>
    <p style="color: var(--text-muted); margin-bottom: 1.25rem; font-size: 1rem; line-height: 1.6;">${desc}</p>
    
    <div style="background: rgba(15,23,42,0.6); padding: 1rem; border-radius: 10px; margin-bottom: 1.25rem; font-size: 0.9rem;">
      <div style="margin-bottom:0.4rem;">🕒 <strong>${dict.hours}:</strong> ${spot.hours}</div>
      <div>🎟️ <strong>${dict.fee}:</strong> ${spot.fee}</div>
    </div>

    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
      <a href="${googleMapUrl}" target="_blank" rel="noopener" class="btn btn-primary">
        🗺️ ${dict.viewOnMap}
      </a>
      <a href="${naverMapUrl}" target="_blank" rel="noopener" class="btn btn-outline">
        🧭 ${dict.naverMap}
      </a>
    </div>
  `;

  document.getElementById("modal-overlay").classList.add("active");
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("active");
}

// Initial setup & Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  loadSavedPlan();

  // Language Switcher
  const langSelect = document.getElementById("lang-select");
  if (langSelect) {
    langSelect.addEventListener("change", (e) => {
      currentLang = e.target.value;
      applyTranslations();
      renderAttractions();
      renderCourses();
      renderItinerary();
    });
  }

  // Category Filtering
  document.querySelectorAll(".cat-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.getAttribute("data-cat");
      renderAttractions();
    });
  });

  // Search Bar
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderAttractions();
    });
  }

  // Initial render
  applyTranslations();
  renderAttractions();
  renderCourses();
  renderItinerary();
});
