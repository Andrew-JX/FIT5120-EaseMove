<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import axios from 'axios'
import PrecinctCard from '@/components/PrecinctCard.vue'
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
  <main class="map-view">
    <div ref="mapElement" class="map-canvas" aria-label="Melbourne comfort map"></div>

    <div v-if="precinctStore.loading" class="loading-overlay">
      <div class="spinner" aria-label="Loading comfort data"></div>
    </div>

    <div v-if="precinctStore.error" class="error-banner">
      Unable to load comfort data. Showing last known conditions.
    </div>

    <button class="facilities-toggle" type="button" :class="{ active: facilitiesEnabled }" @click="toggleFacilities">
      Street facilities
    </button>

    <div v-if="facilityError" class="toast" role="status">
      Street facilities data temporarily unavailable
    </div>

    <PrecinctCard v-if="selectedPrecinctId" :precinct-id="selectedPrecinctId" />
    <CompareView />
  </main>
</template>

<style scoped>
@import 'leaflet/dist/leaflet.css';

:global(body) {
  min-width: 320px;
  display: block;
  place-items: initial;
}

:global(#app) {
  width: 100%;
  max-width: none;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  display: block;
}

.map-view {
  --stormy-teal: #006d77;
  --pearl-aqua: #83c5be;
  --alice-blue: #edf6f9;
  --almond-silk: #ffddd2;
  --tangerine-dream: #e29578;
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  color: #102a2f;
}

.map-canvas {
  width: 100%;
  height: calc(100vh - 0px);
  min-height: 520px;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  background: rgba(237, 246, 249, 0.72);
}

.spinner {
  width: 44px;
  height: 44px;
  border: 5px solid var(--pearl-aqua);
  border-top-color: var(--stormy-teal);
  border-radius: 50%;
  animation: spin 800ms linear infinite;
}

.error-banner,
.toast,
.facilities-toggle {
  position: absolute;
  z-index: 1000;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 800;
}

.error-banner {
  top: 16px;
  left: 50%;
  width: min(520px, calc(100vw - 32px));
  padding: 12px 16px;
  transform: translateX(-50%);
  border: 1px solid var(--tangerine-dream);
  background: var(--almond-silk);
  color: #8a3a1e;
  text-align: center;
}

.facilities-toggle {
  top: 16px;
  right: 16px;
  min-height: 44px;
  border: 1px solid rgba(0, 109, 119, 0.25);
  background: #ffffff;
  color: var(--stormy-teal);
  cursor: pointer;
  padding: 0 16px;
}

.facilities-toggle.active {
  border-color: var(--stormy-teal);
  background: var(--stormy-teal);
  color: #ffffff;
}

.toast {
  right: 16px;
  bottom: 24px;
  max-width: 320px;
  padding: 12px 14px;
  background: #ffffff;
  color: #102a2f;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
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
  background: var(--stormy-teal);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .map-canvas {
    min-height: 100vh;
  }

  .facilities-toggle {
    top: 12px;
    right: 12px;
  }

  .toast {
    right: 12px;
    bottom: 12px;
    max-width: calc(100vw - 24px);
  }
}
</style>
