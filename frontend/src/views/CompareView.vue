<script setup>
import { computed } from 'vue'
import { usePrecinctStore } from '@/stores/precinct'

const precinctStore = usePrecinctStore()

const comparedPrecincts = computed(() => (
  precinctStore.comparePrecincts
    .map((id) => precinctStore.getPrecinctById(id))
    .filter(Boolean)
))

const betterPrecinct = computed(() => precinctStore.betterPrecinct)

const recommendation = computed(() => {
  if (comparedPrecincts.value.length !== 2) return ''

  const [first, second] = comparedPrecincts.value

  if (first.comfort_label === 'High Risk' && second.comfort_label === 'High Risk') {
    return 'Both areas are currently high risk. Consider waiting or using alternative transport.'
  }

  if (first.comfort_label === 'High Risk' && second.comfort_label !== 'High Risk') {
    return `${second.name} is more comfortable right now 鈥?consider heading there instead.`
  }

  if (second.comfort_label === 'High Risk' && first.comfort_label !== 'High Risk') {
    return `${first.name} is more comfortable right now 鈥?consider heading there instead.`
  }

  if (betterPrecinct.value) {
    return `${betterPrecinct.value.name} is more comfortable right now 鈥?consider heading there instead.`
  }

  return 'Conditions are similar in both areas right now.'
})

function formatUpdated(value) {
  if (!value) return 'Updated time unavailable'

  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="compare-view">
    <div v-if="!precinctStore.isComparing" class="empty-state">
      <div class="empty-icon">↑</div>
      <h3>Select Two Areas</h3>
      <p>Click map markers to compare comfort levels side by side</p>
    </div>

    <div v-else>
      <div class="compare-grid">
        <div
          v-for="precinct in comparedPrecincts"
          :key="precinct.id"
          class="compare-card"
          :class="[`label-${precinct.comfort_label.replace(' ', '-').toLowerCase()}`, { winner: betterPrecinct?.id === precinct.id }]"
        >
          <div v-if="betterPrecinct?.id === precinct.id" class="better-badge">
            Better right now
          </div>

          <h3 class="compare-name">{{ precinct.name }}</h3>
          <p class="compare-updated">
            Updated {{ precinct.stale_data ? 'recently (stale)' : formatUpdated(precinct.last_updated) }}
          </p>

          <div class="compare-score">
            {{ precinct.comfort_score }}<span class="compare-max">/100</span>
          </div>

          <div class="compare-pill" :class="`pill-${precinct.comfort_label.replace(' ', '-').toLowerCase()}`">
            {{ precinct.comfort_label }}
          </div>

          <div class="compare-stats">
            <div class="stat temp-stat">
              <span class="stat-label">Temperature</span>
              <span class="stat-value">{{ precinct.temperature ?? '-' }}°C</span>
            </div>
            <div class="stat humid-stat">
              <span class="stat-label">Humidity</span>
              <span class="stat-value">{{ precinct.humidity ?? '-' }}%</span>
            </div>
            <div class="stat activity-stat">
              <span class="stat-label">Activity</span>
              <span class="stat-value">{{ precinct.activity_level ?? '-' }}</span>
            </div>
            <div class="stat wind-stat">
              <span class="stat-label">Wind</span>
              <span class="stat-value">{{ precinct.wind_speed ?? '-' }} km/h</span>
            </div>
          </div>
        </div>
      </div>

      <p v-if="!betterPrecinct" class="tied-msg">
        Conditions are similar in both areas right now.
      </p>

      <div v-if="recommendation" class="rec-box">
        <span class="rec-icon">i</span>
        <div>
          <p class="rec-title">Recommendation</p>
          <p class="rec-text">{{ recommendation }}</p>
        </div>
      </div>

      <button class="clear-btn" type="button" @click="precinctStore.clearCompare()">
        Clear comparison
      </button>
    </div>
  </div>
</template>

<style scoped>
.compare-view {
  padding: 4px;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: #6b7280;
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.empty-state p {
  font-size: 13px;
}

.compare-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}

.compare-card {
  border: 2px solid #22c55e;
  border-radius: 12px;
  padding: 14px;
  background: #ffffff;
  position: relative;
}

.compare-card.label-caution {
  border-color: #eab308;
}

.compare-card.label-high-risk {
  border-color: #ef4444;
}

.better-badge {
  position: absolute;
  top: -12px;
  right: -8px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(34, 197, 94, 0.35);
}

.compare-name {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 2px;
}

.compare-updated {
  font-size: 10px;
  color: #9ca3af;
  margin-bottom: 10px;
}

.compare-score {
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
  color: #22c55e;
}

.label-caution .compare-score {
  color: #eab308;
}

.label-high-risk .compare-score {
  color: #ef4444;
}

.compare-max {
  font-size: 16px;
  color: #9ca3af;
  font-weight: 400;
}

.compare-pill {
  display: inline-block;
  margin: 6px 0 10px;
  padding: 3px 12px;
  border-radius: 16px;
  font-size: 11px;
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

.compare-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 7px;
  padding: 6px 8px;
  border: 1px solid;
}

.temp-stat {
  background: #fff7ed;
  border-color: #fed7aa;
}

.humid-stat {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.activity-stat {
  background: #f5f3ff;
  border-color: #ddd6fe;
}

.wind-stat {
  background: #f0fdfa;
  border-color: #99f6e4;
}

.stat-label {
  font-size: 10px;
  color: #6b7280;
}

.stat-value {
  font-size: 12px;
  font-weight: 700;
  color: #111827;
}

.tied-msg {
  text-align: center;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 12px;
}

.rec-box {
  display: flex;
  gap: 10px;
  background: linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%);
  border-left: 4px solid #3b82f6;
  border-radius: 0 10px 10px 0;
  padding: 12px 14px;
  margin-bottom: 12px;
}

.rec-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.rec-title {
  font-size: 12px;
  font-weight: 700;
  color: #1e3a8a;
  margin-bottom: 3px;
}

.rec-text {
  font-size: 13px;
  color: #374151;
  line-height: 1.5;
}

.clear-btn {
  width: 100%;
  padding: 10px;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #6b7280;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

@media (max-width: 768px) {
  .compare-grid {
    grid-template-columns: 1fr;
  }
}
</style>
