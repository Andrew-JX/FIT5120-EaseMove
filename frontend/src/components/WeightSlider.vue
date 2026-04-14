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
  <div class="slider-panel">
    <div class="panel-header">
      <h3 class="panel-title">Comfort Preferences</h3>
      <p class="panel-sub">Adjust how each factor affects the comfort score</p>
    </div>

    <div class="slider-list">
      <div v-for="key in sliderKeys" :key="key" class="slider-row">
        <div class="slider-top">
          <span class="slider-label">{{ sliderLabels[key] }}</span>
          <span class="slider-pct">{{ preferencesStore.weights[key] }}%</span>
        </div>
        <input
          type="range"
          :min="0"
          :max="100"
          :step="1"
          :value="preferencesStore.weights[key]"
          :aria-label="`${sliderLabels[key]} weight`"
          :aria-valuenow="preferencesStore.weights[key]"
          class="slider"
          @input="handleSliderInput(key, $event)"
        />
        <div class="slider-track-label">
          <span>0%</span><span>100%</span>
        </div>
      </div>
    </div>

    <div class="total-row">
      <span class="total-label">Total</span>
      <span
        class="total-value"
        :class="{ ok: sliderKeys.reduce((total, key) => total + preferencesStore.weights[key], 0) === 100 }"
      >
        {{ sliderKeys.reduce((total, key) => total + preferencesStore.weights[key], 0) }}%
      </span>
    </div>

    <button class="reset-btn" type="button" @click="resetWeights">
      Reset to defaults (60 / 30 / 10)
    </button>

    <p class="privacy-note">
      Your preferences are saved on this device only and are never shared or uploaded.
    </p>
  </div>
</template>

<style scoped>
.slider-panel {
  padding: 18px;
}

.panel-header {
  margin-bottom: 16px;
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: #006d77;
}

.panel-sub {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 3px;
}

.slider-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 14px;
}

.slider-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.slider-label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.slider-pct {
  font-size: 13px;
  font-weight: 700;
  color: #006d77;
}

.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  accent-color: #006d77;
}

.slider-track-label {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #d1d5db;
  margin-top: 3px;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-top: 1px solid #f3f4f6;
  margin-bottom: 12px;
}

.total-label {
  font-size: 13px;
  color: #6b7280;
}

.total-value {
  font-size: 13px;
  font-weight: 700;
  color: #ef4444;
}

.total-value.ok {
  color: #22c55e;
}

.reset-btn {
  width: 100%;
  padding: 10px;
  background: #ffffff;
  border: 1.5px solid #006d77;
  border-radius: 8px;
  color: #006d77;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 10px;
  transition: background 0.2s;
}

.reset-btn:hover {
  background: #edf6f9;
}

.privacy-note {
  font-size: 11px;
  color: #9ca3af;
  line-height: 1.5;
  text-align: center;
}
</style>
