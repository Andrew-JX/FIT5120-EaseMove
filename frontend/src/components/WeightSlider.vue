<script setup>
import { onMounted, watch } from 'vue'
import { usePreferencesStore } from '@/stores/preferences'
import { usePrecinctStore } from '@/stores/precinct'

const preferencesStore = usePreferencesStore()
const precinctStore = usePrecinctStore()

const sliderLabels = {
  temperature: 'Temperature',
  humidity: 'Humidity',
  activity: 'Activity Density'
}

const sliderKeys = ['temperature', 'humidity', 'activity']

function clampWeight(value) {
  return Math.max(0, Math.min(100, Number(value)))
}

function buildBalancedWeights(changedKey, newValue) {
  const currentWeights = { ...preferencesStore.weights }
  const remaining = 100 - newValue
  const [firstKey, secondKey] = sliderKeys.filter((key) => key !== changedKey)
  const firstCurrent = currentWeights[firstKey]
  const secondCurrent = currentWeights[secondKey]
  const nextWeights = {
    ...currentWeights,
    [changedKey]: newValue
  }

  if (remaining === 0) {
    nextWeights[firstKey] = 0
    nextWeights[secondKey] = 0
    return nextWeights
  }

  if (firstCurrent > 0 && secondCurrent > 0) {
    const firstShare = Math.round(remaining * (firstCurrent / (firstCurrent + secondCurrent)))
    nextWeights[firstKey] = firstShare
    nextWeights[secondKey] = remaining - firstShare
    return nextWeights
  }

  if (firstCurrent > 0) {
    nextWeights[firstKey] = remaining
    nextWeights[secondKey] = 0
    return nextWeights
  }

  if (secondCurrent > 0) {
    nextWeights[firstKey] = 0
    nextWeights[secondKey] = remaining
    return nextWeights
  }

  nextWeights[firstKey] = Math.floor(remaining / 2)
  nextWeights[secondKey] = remaining - nextWeights[firstKey]
  return nextWeights
}

function handleSliderInput(changedKey, event) {
  const newValue = clampWeight(event.target.value)
  preferencesStore.setWeights(buildBalancedWeights(changedKey, newValue))
}

function resetWeights() {
  preferencesStore.resetWeights()
}

onMounted(() => {
  preferencesStore.loadFromStorage()
})

watch(
  () => preferencesStore.weightsAsDecimals,
  () => {
    precinctStore.fetchCurrentPrecincts()
  },
  { deep: true }
)
</script>

<template>
  <section class="weight-panel" aria-labelledby="comfort-preferences-title">
    <header class="panel-header">
      <div>
        <p class="eyebrow">Settings</p>
        <h2 id="comfort-preferences-title">Comfort Preferences</h2>
      </div>
      <button class="reset-button" type="button" @click="resetWeights">
        Reset to defaults
      </button>
    </header>

    <div class="slider-list">
      <label v-for="key in sliderKeys" :key="key" class="slider-row">
        <span class="slider-label">
          {{ sliderLabels[key] }}
          <strong>{{ preferencesStore.weights[key] }}%</strong>
        </span>
        <input
          :aria-label="`${sliderLabels[key]} preference weight`"
          type="range"
          min="0"
          max="100"
          step="1"
          :value="preferencesStore.weights[key]"
          @input="handleSliderInput(key, $event)"
        />
      </label>
    </div>

    <p class="privacy-note">
      Your preferences are saved on this device only and are never shared or uploaded.
    </p>
  </section>
</template>

<style scoped>
.weight-panel {
  --stormy-teal: #006d77;
  --pearl-aqua: #83c5be;
  --alice-blue: #edf6f9;
  --almond-silk: #ffddd2;
  --tangerine-dream: #e29578;
  width: min(360px, calc(100vw - 32px));
  padding: 18px;
  border: 1px solid rgba(0, 109, 119, 0.16);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
  color: #102a2f;
}

.panel-header {
  display: grid;
  gap: 12px;
}

.eyebrow,
h2,
p {
  margin: 0;
}

.eyebrow {
  color: var(--stormy-teal);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

h2 {
  font-size: 22px;
  font-weight: 800;
  line-height: 1.2;
}

.reset-button {
  justify-self: start;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--stormy-teal);
  border-radius: 8px;
  background: #ffffff;
  color: var(--stormy-teal);
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.slider-list {
  display: grid;
  gap: 18px;
  margin-top: 20px;
}

.slider-row {
  display: grid;
  gap: 10px;
}

.slider-label {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: #243f45;
  font-size: 15px;
  font-weight: 800;
}

.slider-label strong {
  color: var(--stormy-teal);
  font-size: 15px;
  font-weight: 900;
}

input[type='range'] {
  width: 100%;
  accent-color: var(--stormy-teal);
  cursor: pointer;
  transition: opacity 180ms ease;
}

input[type='range']::-webkit-slider-runnable-track {
  height: 8px;
  border-radius: 8px;
  background: linear-gradient(90deg, var(--stormy-teal), var(--pearl-aqua));
}

input[type='range']::-webkit-slider-thumb {
  width: 22px;
  height: 22px;
  margin-top: -7px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: var(--stormy-teal);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.24);
  appearance: none;
}

input[type='range']::-moz-range-track {
  height: 8px;
  border-radius: 8px;
  background: linear-gradient(90deg, var(--stormy-teal), var(--pearl-aqua));
}

input[type='range']::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: var(--stormy-teal);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.24);
}

.privacy-note {
  margin-top: 18px;
  color: #5c7479;
  font-size: 14px;
  line-height: 1.45;
}

@media (max-width: 768px) {
  .weight-panel {
    width: calc(100vw - 24px);
  }
}
</style>
