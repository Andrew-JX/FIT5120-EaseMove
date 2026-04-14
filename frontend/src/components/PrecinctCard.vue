<script setup>
import { computed, onMounted, watch } from 'vue'
import { usePrecinctStore } from '@/stores/precinct'

const props = defineProps({
  precinctId: {
    type: String,
    required: true
  }
})

const precinctStore = usePrecinctStore()

const precinct = computed(() => precinctStore.getPrecinctById(props.precinctId))
const today = computed(() => precinctStore.todayData[props.precinctId])
const preparationAdvice = computed(() => today.value?.preparation_advice ?? [])

const updatedText = computed(() => {
  if (!precinct.value?.last_updated) return 'Updated time unavailable'

  const updatedAt = new Date(precinct.value.last_updated)
  const diffMinutes = Math.round((Date.now() - updatedAt.getTime()) / 60000)

  if (diffMinutes <= 60) return `Updated ${Math.max(diffMinutes, 0)} min ago`

  return `Updated at ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
})

function closeCard() {
  precinctStore.selectPrecinct(null)
}

function addToCompare() {
  precinctStore.addToCompare(props.precinctId)
}

async function loadTodayRecommendation() {
  await precinctStore.fetchTodayRecommendation(props.precinctId)
}

onMounted(loadTodayRecommendation)

watch(() => props.precinctId, loadTodayRecommendation)
</script>

<template>
  <article
    v-if="precinct"
    class="card"
    :class="[`label-${precinct.comfort_label.replace(' ', '-').toLowerCase()}`, { stale: precinct.stale_data }]"
    aria-live="polite"
  >
    <div class="card-header">
      <div>
        <h2 class="precinct-name">{{ precinct.name }}</h2>
        <p class="updated-text" :class="{ stale: precinct.stale_data }">
          {{ precinct.stale_data ? 'Data may be outdated' : updatedText }}
        </p>
      </div>
      <button class="close-btn" type="button" aria-label="Close precinct details" @click="closeCard">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div v-if="precinct.stale_data" class="stale-banner">
      <span class="stale-icon">!</span>
      <div>
        <p class="stale-title">Data may be outdated</p>
        <p class="stale-msg">Sensor data is more than 30 minutes old. Conditions may have changed.</p>
      </div>
    </div>

    <div class="score-block">
      <p class="score-label">Comfort Score</p>
      <div class="score-value">
        {{ precinct.comfort_score }}<span class="score-max">/100</span>
      </div>
      <div class="comfort-pill" :class="`pill-${precinct.comfort_label.replace(' ', '-').toLowerCase()}`">
        {{ precinct.comfort_label }}
      </div>
    </div>

    <div class="sensor-grid" :class="{ stale: precinct.stale_data }">
      <div class="sensor-card temp-card">
        <div class="sensor-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" /></svg>
          Temperature
        </div>
        <div class="sensor-value">{{ precinct.temperature ?? '-' }}°C</div>
      </div>
      <div class="sensor-card humid-card">
        <div class="sensor-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>
          Humidity
        </div>
        <div class="sensor-value">{{ precinct.humidity ?? '-' }}%</div>
      </div>
      <div class="sensor-card activity-card">
        <div class="sensor-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          Activity
        </div>
        <div class="sensor-value">{{ precinct.activity_level ?? '-' }}</div>
      </div>
      <div class="sensor-card wind-card">
        <div class="sensor-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" /></svg>
          Wind
        </div>
        <div class="sensor-value">{{ precinct.wind_speed ?? '-' }} km/h</div>
      </div>
    </div>

    <div class="rec-section">
      <div v-if="today" class="rec-content">
        <p class="rec-text">{{ today.recommendation }}</p>
        <p v-if="today.recommendation_basis" class="rec-basis">
          Based on: {{ today.recommendation_basis.current_temp }}°C ·
          {{ today.recommendation_basis.current_humidity }}% humidity ·
          {{ today.recommendation_basis.current_activity }} activity
        </p>
        <ul v-if="preparationAdvice.length" class="advice-list">
          <li v-for="tip in preparationAdvice" :key="tip" class="advice-item">{{ tip }}</li>
        </ul>
      </div>
      <p v-else class="no-rec">Recommendation based on current conditions only.</p>
    </div>

    <div class="card-actions">
      <button class="compare-btn" type="button" @click="addToCompare">Compare</button>
      <button class="go-btn" type="button" @click="loadTodayRecommendation">I Want to Go</button>
    </div>
  </article>
</template>

<style scoped>
.card {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 20;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 109, 119, 0.14);
  border: 1px solid #e5e7eb;
  width: 360px;
  max-height: 70vh;
  overflow-y: auto;
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
}

.precinct-name {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.updated-text {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
}

.updated-text.stale {
  color: #ef4444;
  font-weight: 500;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  flex-shrink: 0;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
}

.stale-banner {
  display: flex;
  gap: 10px;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 14px;
}

.stale-icon {
  width: 22px;
  height: 22px;
  background: #ef4444;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.stale-title {
  font-size: 13px;
  font-weight: 600;
  color: #991b1b;
}

.stale-msg {
  font-size: 11px;
  color: #b91c1c;
  margin-top: 2px;
}

.score-block {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%);
  border: 2px solid #22c55e;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  margin-bottom: 14px;
}

.label-caution .score-block {
  border-color: #eab308;
}

.label-high-risk .score-block {
  border-color: #ef4444;
}

.card.stale .score-block {
  border-color: #9ca3af;
}

.score-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 6px;
}

.score-value {
  font-size: 44px;
  font-weight: 800;
  line-height: 1;
  color: #22c55e;
}

.label-caution .score-value {
  color: #eab308;
}

.label-high-risk .score-value {
  color: #ef4444;
}

.card.stale .score-value {
  color: #9ca3af;
}

.score-max {
  font-size: 20px;
  color: #9ca3af;
  font-weight: 400;
}

.comfort-pill {
  display: inline-block;
  margin-top: 8px;
  padding: 4px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid;
}

.pill-comfortable {
  color: #166534;
  background: #dcfce7;
  border-color: #22c55e;
}

.pill-caution {
  color: #854d0e;
  background: #fef3c7;
  border-color: #eab308;
}

.pill-high-risk {
  color: #991b1b;
  background: #fee2e2;
  border-color: #ef4444;
}

.sensor-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}

.sensor-grid.stale {
  opacity: 0.55;
}

.sensor-card {
  border-radius: 10px;
  padding: 10px 12px;
  border: 1px solid;
}

.temp-card {
  background: #fff7ed;
  border-color: #fed7aa;
}

.humid-card {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.activity-card {
  background: #f5f3ff;
  border-color: #ddd6fe;
}

.wind-card {
  background: #f0fdfa;
  border-color: #99f6e4;
}

.sensor-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 5px;
}

.sensor-value {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.rec-section {
  margin-bottom: 14px;
}

.rec-text {
  font-size: 13px;
  color: #111827;
  line-height: 1.55;
  font-weight: 500;
}

.rec-basis {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 4px;
}

.no-rec {
  font-size: 13px;
  color: #9ca3af;
  font-style: italic;
}

.advice-list {
  list-style: none;
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.advice-item {
  font-size: 12px;
  color: #374151;
  background: #f0fdf9;
  border: 1px solid #99f6e4;
  border-radius: 8px;
  padding: 7px 10px;
  line-height: 1.5;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.compare-btn {
  flex: 1;
  padding: 10px;
  border: 2px solid #006d77;
  color: #006d77;
  background: #ffffff;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.compare-btn:hover {
  background: #edf6f9;
}

.go-btn {
  flex: 2;
  padding: 10px;
  background: linear-gradient(135deg, #006d77 0%, #0891b2 100%);
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.go-btn:hover {
  opacity: 0.9;
}

@media (max-width: 768px) {
  .card {
    position: fixed !important;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    border-radius: 20px 20px 0 0;
    max-height: 75vh;
  }
}
</style>
