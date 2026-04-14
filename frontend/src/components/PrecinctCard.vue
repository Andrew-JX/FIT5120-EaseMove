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
  <div v-if="precinct" class="card-shell">
    <div class="card-backdrop" @click="closeCard"></div>

    <article class="precinct-card" aria-live="polite">
      <button class="close-button" type="button" aria-label="Close precinct details" @click="closeCard">
        ×
      </button>

      <header class="card-header">
        <div>
          <p class="eyebrow">Current conditions</p>
          <h2>{{ precinct.name }}</h2>
        </div>

        <span
          class="label-pill"
          :class="[`label-${precinct.comfort_label.replace(' ', '-').toLowerCase()}`, { stale: precinct.stale_data }]"
        >
          {{ precinct.comfort_label }}
        </span>
      </header>

      <div v-if="precinct.stale_data" class="stale-banner">
        Data may be outdated
      </div>

      <dl class="metrics-grid">
        <div>
          <dt>Temperature</dt>
          <dd>{{ precinct.temperature ?? '—' }}°C</dd>
        </div>
        <div>
          <dt>Humidity</dt>
          <dd>{{ precinct.humidity ?? '—' }}%</dd>
        </div>
        <div>
          <dt>Activity level</dt>
          <dd>{{ precinct.activity_level ?? '—' }}</dd>
        </div>
        <div>
          <dt>Wind speed</dt>
          <dd>{{ precinct.wind_speed ?? '—' }} km/h</dd>
        </div>
      </dl>

      <p class="updated-text">{{ updatedText }}</p>

      <section v-if="today" class="recommendation-section">
        <h3>Travel recommendation</h3>
        <p>{{ today.recommendation }}</p>

        <div v-if="preparationAdvice.length" class="advice-list">
          <h3>Preparation advice</h3>
          <ul>
            <li v-for="item in preparationAdvice" :key="item">{{ item }}</li>
          </ul>
        </div>
      </section>

      <button class="compare-button" type="button" @click="addToCompare">
        Compare
      </button>
    </article>
  </div>
</template>

<style scoped>
.card-shell {
  --stormy-teal: #006d77;
  --pearl-aqua: #83c5be;
  --alice-blue: #edf6f9;
  --almond-silk: #ffddd2;
  --tangerine-dream: #e29578;
}

.card-backdrop {
  display: none;
}

.precinct-card {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 1100;
  width: 380px;
  height: 100vh;
  overflow-y: auto;
  padding: 24px;
  background: #ffffff;
  border-left: 1px solid rgba(0, 109, 119, 0.18);
  box-shadow: -12px 0 32px rgba(15, 23, 42, 0.16);
  color: #12343b;
}

.close-button {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(0, 109, 119, 0.2);
  border-radius: 8px;
  background: var(--alice-blue);
  color: var(--stormy-teal);
  font-size: 24px;
  cursor: pointer;
}

.card-header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  padding-right: 32px;
}

.eyebrow {
  margin: 0 0 6px;
  color: var(--stormy-teal);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h2,
h3,
p {
  margin: 0;
}

h2 {
  color: #102a2f;
  font-size: 28px;
  font-weight: 800;
  line-height: 1.15;
}

h3 {
  color: #102a2f;
  font-size: 16px;
  font-weight: 800;
}

.label-pill {
  flex: 0 0 auto;
  padding: 6px 10px;
  border: 1px solid;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 800;
}

.label-comfortable {
  border-color: #22c55e;
  background: #dcfce7;
  color: #166534;
}

.label-caution {
  border-color: #eab308;
  background: #fef3c7;
  color: #854d0e;
}

.label-high-risk {
  border-color: #ef4444;
  background: #fee2e2;
  color: #991b1b;
}

.label-pill.stale {
  opacity: 0.5;
}

.stale-banner {
  margin-top: 18px;
  padding: 10px 12px;
  border: 1px solid var(--tangerine-dream);
  border-radius: 8px;
  background: var(--almond-silk);
  color: #8a3a1e;
  font-size: 14px;
  font-weight: 700;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 24px 0 12px;
}

.metrics-grid div {
  padding: 14px;
  border: 1px solid rgba(0, 109, 119, 0.14);
  border-radius: 8px;
  background: var(--alice-blue);
}

dt {
  color: #4b6267;
  font-size: 14px;
  font-weight: 700;
}

dd {
  margin: 4px 0 0;
  color: #102a2f;
  font-size: 20px;
  font-weight: 800;
}

.updated-text {
  color: #5c7479;
  font-size: 14px;
}

.recommendation-section {
  display: grid;
  gap: 10px;
  margin-top: 24px;
  color: #243f45;
  font-size: 15px;
}

.advice-list {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 20px;
}

li {
  font-size: 14px;
}

.compare-button {
  width: 100%;
  min-height: 44px;
  margin-top: 24px;
  border: 0;
  border-radius: 8px;
  background: var(--stormy-teal);
  color: #ffffff;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
}

@media (max-width: 768px) {
  .card-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1090;
    display: block;
    background: rgba(0, 0, 0, 0.3);
  }

  .precinct-card {
    top: auto;
    bottom: 0;
    left: 0;
    width: 100vw;
    height: auto;
    max-height: 70vh;
    border-top: 1px solid rgba(0, 109, 119, 0.18);
    border-left: 0;
    border-radius: 8px 8px 0 0;
    transform: translateY(0);
    transition: transform 300ms ease;
  }

  h2 {
    font-size: 24px;
  }
}
</style>
