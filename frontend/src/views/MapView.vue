<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import axios from 'axios'
import PrecinctCard from '@/components/PrecinctCard.vue'
import WeightSlider from '@/components/WeightSlider.vue'
import CompareView from '@/views/CompareView.vue'
import { createPrecinctMarkerIcon } from '@/components/PrecinctMarker'
import { usePrecinctStore } from '@/stores/precinct'
import { usePreferencesStore } from '@/stores/preferences'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const MELBOURNE_CENTER = [-37.814, 144.963]
const REFRESH_INTERVAL_MS = 5 * 60 * 1000

const precinctStore = usePrecinctStore()
const preferencesStore = usePreferencesStore()

const mapElement = ref(null)
const facilitiesEnabled = ref(false)
const facilityError = ref(false)
const preferencesOpen = ref(false)
let map = null
let markerLayer = null
let facilitiesLayer = null
let refreshTimer = null

const selectedPrecinctId = computed(() => precinctStore.selectedPrecinct)

function clearMarkers() {
  if (!markerLayer) return
  markerLayer.clearLayers()
}

function renderMarkers() {
  if (!map || !markerLayer) return

  clearMarkers()

  precinctStore.precincts.forEach((precinct) => {
    if (precinct.lat === null || precinct.lng === null) return

    const marker = L.marker([precinct.lat, precinct.lng], {
      icon: createPrecinctMarkerIcon(precinct)
    })

    marker.on('click', () => {
      precinctStore.selectPrecinct(precinct.id)
    })

    marker.addTo(markerLayer)
  })
}

function createFacilityIcon(type) {
  const normalisedType = String(type).toLowerCase().replaceAll(' ', '_')
  const isDrinkingFountain = normalisedType === 'drinking_fountain'

  return L.divIcon({
    className: 'facility-marker',
    html: isDrinkingFountain
      ? `<div class="facility-icon facility-icon-water" aria-label="Drinking fountain">
          <svg width="16" height="20" viewBox="0 0 16 20" aria-hidden="true">
            <path d="M8 1C5.2 5.2 3 8.4 3 12a5 5 0 0 0 10 0c0-3.6-2.2-6.8-5-11Z" fill="#2563eb"></path>
          </svg>
        </div>`
      : '<div class="facility-icon facility-icon-bike" aria-label="Bicycle rail"></div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  })
}

function removeFacilitiesLayer() {
  if (!map || !facilitiesLayer) return
  map.removeLayer(facilitiesLayer)
  facilitiesLayer = null
}

async function loadFacilities() {
  if (!map) return

  facilityError.value = false
  removeFacilitiesLayer()

  try {
    const response = await axios.get(`${API_BASE_URL}/api/furniture`, {
      params: { precinct: 'all', type: 'all' }
    })

    facilitiesLayer = L.geoJSON(response.data, {
      pointToLayer(feature, latlng) {
        return L.marker(latlng, {
          icon: createFacilityIcon(feature.properties?.asset_type)
        })
      }
    }).addTo(map)
  } catch {
    facilitiesEnabled.value = false
    facilityError.value = true
  }
}

async function toggleFacilities() {
  facilitiesEnabled.value = !facilitiesEnabled.value

  if (facilitiesEnabled.value) {
    await loadFacilities()
    return
  }

  removeFacilitiesLayer()
}

function togglePreferences() {
  preferencesOpen.value = !preferencesOpen.value
}

async function fetchAndRenderPrecincts() {
  await precinctStore.fetchCurrentPrecincts()
  await nextTick()
  renderMarkers()
}

function initialiseMap() {
  map = L.map(mapElement.value, {
    zoomControl: true
  }).setView(MELBOURNE_CENTER, 14)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map)

  markerLayer = L.layerGroup().addTo(map)
}

onMounted(async () => {
  preferencesStore.loadFromStorage()
  initialiseMap()
  await fetchAndRenderPrecincts()

  refreshTimer = window.setInterval(fetchAndRenderPrecincts, REFRESH_INTERVAL_MS)
})

onBeforeUnmount(() => {
  if (refreshTimer) window.clearInterval(refreshTimer)
  removeFacilitiesLayer()
  if (map) map.remove()
})

watch(() => precinctStore.precincts, renderMarkers, { deep: true })
</script>

<template>
  <div class="page">
    <nav class="navbar">
      <div class="navbar-inner">
        <div class="brand">
          <div class="logo" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="10" fill="#006d77" />
              <path d="M18 8 C13 8 9 12 9 17 C9 24 18 30 18 30 C18 30 27 24 27 17 C27 12 23 8 18 8Z" fill="white" opacity="0.9" />
              <circle cx="18" cy="17" r="4" fill="#006d77" />
            </svg>
          </div>
          <div>
            <h1 class="brand-title">EaseMove Melbourne</h1>
            <p class="brand-sub">Travel comfort decision-support tool</p>
          </div>
        </div>
        <div class="live-badge">
          <span class="live-dot"></span>
          Live sensors
        </div>
      </div>
    </nav>

    <main class="main-container">
      <div class="map-card">
        <div class="tabs">
          <button class="tab-btn active" type="button">View</button>
          <button class="tab-btn" type="button">Compare</button>
        </div>

        <div v-if="precinctStore.loading" class="status-banner loading-banner">
          <span class="spinner" aria-label="Loading comfort data"></span>
          Loading comfort data...
        </div>

        <div v-if="precinctStore.error" class="status-banner error-banner">
          Unable to load comfort data. Showing last known conditions.
        </div>

        <div class="map-layout">
          <aside class="sidebar">
            <div class="sidebar-inner">
              <h3 class="sidebar-title">Comfort Levels</h3>
              <div class="filter-list">
                <div class="filter-btn comfortable">
                  <span class="filter-dot"></span>
                  <span class="filter-label">Comfortable</span>
                  <span class="filter-count">{{ precinctStore.precincts.filter((precinct) => precinct.comfort_label === 'Comfortable').length }}</span>
                </div>
                <div class="filter-btn caution">
                  <span class="filter-dot"></span>
                  <span class="filter-label">Caution</span>
                  <span class="filter-count">{{ precinctStore.precincts.filter((precinct) => precinct.comfort_label === 'Caution').length }}</span>
                </div>
                <div class="filter-btn high-risk">
                  <span class="filter-dot"></span>
                  <span class="filter-label">High Risk</span>
                  <span class="filter-count">{{ precinctStore.precincts.filter((precinct) => precinct.comfort_label === 'High Risk').length }}</span>
                </div>
              </div>
            </div>
          </aside>

          <section class="map-wrapper">
            <button
              class="map-fab"
              :class="{ 'fab-active': facilitiesEnabled }"
              type="button"
              style="right: 16px; top: 16px;"
              title="Street facilities"
              @click="toggleFacilities"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </button>

            <button
              class="map-fab"
              :class="{ 'fab-active': preferencesOpen }"
              type="button"
              style="right: 16px; top: 68px;"
              title="Comfort preferences"
              :aria-expanded="preferencesOpen"
              aria-controls="comfort-preferences-panel"
              @click="togglePreferences"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
              </svg>
            </button>

            <div ref="mapElement" class="leaflet-map" aria-label="Melbourne comfort map"></div>

            <div class="legend">
              <div class="legend-title">Comfort Levels</div>
              <div class="legend-item"><span class="legend-dot comfortable"></span>Comfortable (70-100)</div>
              <div class="legend-item"><span class="legend-dot caution"></span>Caution (40-69)</div>
              <div class="legend-item"><span class="legend-dot high-risk"></span>High Risk (0-39)</div>
            </div>

            <div v-if="facilityError" class="toast" role="status">
              Street facilities data temporarily unavailable
            </div>

            <div v-if="preferencesOpen" id="comfort-preferences-panel" class="weight-panel">
              <WeightSlider />
            </div>

            <Transition name="slide-up">
              <PrecinctCard v-if="selectedPrecinctId" :precinct-id="selectedPrecinctId" class="precinct-card-overlay" />
            </Transition>
          </section>

          <aside v-if="precinctStore.isComparing" class="compare-panel">
            <CompareView />
          </aside>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
@import 'leaflet/dist/leaflet.css';

.page {
  min-height: 100vh;
}

.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 12px rgba(0, 109, 119, 0.08);
}

.navbar-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-title {
  font-size: 22px;
  font-weight: 700;
  color: #006d77;
  line-height: 1.2;
}

.brand-sub {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.live-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #374151;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  padding: 5px 12px;
  border-radius: 20px;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  animation: pulse 2s infinite;
}

.main-container {
  max-width: 1400px;
  margin: 24px auto;
  padding: 0 24px 24px;
}

.map-card {
  background: rgba(255, 255, 255, 0.97);
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 109, 119, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.4);
  overflow: hidden;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 24px;
}

.tab-btn {
  padding: 14px 24px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  background: none;
  border: none;
  cursor: default;
  position: relative;
}

.tab-btn.active {
  color: #006d77;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: #006d77;
  border-radius: 2px 2px 0 0;
}

.status-banner {
  padding: 10px 24px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.loading-banner {
  background: #edf6f9;
  color: #006d77;
}

.error-banner {
  background: #fef3c7;
  color: #92400e;
  border-top: 1px solid #fde68a;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #83c5be;
  border-top-color: #006d77;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

.map-layout {
  display: flex;
  height: 560px;
}

.sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid #e5e7eb;
  background: #f9fafb;
  overflow: hidden;
}

.sidebar-inner {
  padding: 16px;
}

.sidebar-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
}

.filter-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  font-size: 13px;
  color: #374151;
  text-align: left;
}

.filter-btn.comfortable {
  border-color: #22c55e;
  background: #f0fdf4;
}

.filter-btn.caution {
  border-color: #eab308;
  background: #fefce8;
}

.filter-btn.high-risk {
  border-color: #ef4444;
  background: #fef2f2;
}

.filter-dot,
.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.filter-btn.comfortable .filter-dot,
.legend-dot.comfortable {
  background: #22c55e;
}

.filter-btn.caution .filter-dot,
.legend-dot.caution {
  background: #eab308;
}

.filter-btn.high-risk .filter-dot,
.legend-dot.high-risk {
  background: #ef4444;
}

.filter-label {
  flex: 1;
}

.filter-count {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
}

.map-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.leaflet-map {
  width: 100%;
  height: 100%;
  z-index: 1;
}

.map-fab {
  position: absolute;
  z-index: 10;
  width: 40px;
  height: 40px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #374151;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.map-fab:hover {
  background: #f0fdf9;
  color: #006d77;
}

.map-fab.fab-active {
  background: #006d77;
  color: #ffffff;
  border-color: #006d77;
}

.legend {
  position: absolute;
  top: 16px;
  right: 70px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.legend-title {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #4b5563;
  margin-bottom: 5px;
}

.legend-item:last-child {
  margin-bottom: 0;
}

.toast {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  background: rgba(17, 24, 39, 0.88);
  color: #ffffff;
  font-size: 13px;
  padding: 8px 18px;
  border-radius: 20px;
  white-space: nowrap;
  pointer-events: none;
}

.weight-panel {
  position: absolute;
  top: 70px;
  right: 70px;
  z-index: 20;
  width: 300px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.precinct-card-overlay {
  position: absolute;
  z-index: 20;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 300ms ease, opacity 200ms ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.slide-up-enter-to,
.slide-up-leave-from {
  transform: translateY(0);
  opacity: 1;
}

.compare-panel {
  width: 420px;
  flex-shrink: 0;
  border-left: 1px solid #e5e7eb;
  overflow-y: auto;
  padding: 16px;
  background: #fafafa;
}

:global(.facility-icon) {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.2);
  font-size: 18px;
}

:global(.facility-icon-water) {
  background: #dbeafe;
}

:global(.facility-icon-bike) {
  background: #006d77;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .navbar-inner {
    padding: 12px 16px;
  }

  .brand-title {
    font-size: 18px;
  }

  .main-container {
    padding: 12px;
    margin: 12px auto;
  }

  .map-layout {
    height: calc(100vh - 130px);
  }

  .sidebar,
  .compare-panel {
    display: none;
  }

  .legend {
    right: 16px;
    top: 120px;
  }

  .weight-panel {
    right: 8px;
    top: 60px;
    width: calc(100vw - 16px);
  }
}
</style>
