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
    return `${second.name} is more comfortable right now — consider heading there instead.`
  }

  if (second.comfort_label === 'High Risk' && first.comfort_label !== 'High Risk') {
    return `${first.name} is more comfortable right now — consider heading there instead.`
  }

  if (betterPrecinct.value) {
    return `${betterPrecinct.value.name} is more comfortable right now — consider heading there instead.`
  }

  return 'Conditions are similar in both areas right now.'
})

function formatUpdated(value) {
  if (!value) return 'Updated time unavailable'

  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <section v-if="precinctStore.isComparing" class="compare-view" aria-label="Precinct comparison">
    <header class="compare-header">
      <div>
        <p class="eyebrow">Comparison</p>
        <h2>Better right now</h2>
      </div>
      <button type="button" @click="precinctStore.clearCompare()">Clear comparison</button>
    </header>

    <div class="compare-grid">
      <article
        v-for="precinct in comparedPrecincts"
        :key="precinct.id"
        class="compare-column"
        :class="{ winner: betterPrecinct?.id === precinct.id }"
      >
        <span v-if="betterPrecinct?.id === precinct.id" class="winner-badge">Better right now</span>
        <h3>{{ precinct.name }}</h3>
        <span class="label-pill" :class="`label-${precinct.comfort_label.replace(' ', '-').toLowerCase()}`">
          {{ precinct.comfort_label }}
        </span>

        <dl>
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
            <dt>Last updated</dt>
            <dd>{{ formatUpdated(precinct.last_updated) }}</dd>
          </div>
        </dl>
      </article>
    </div>

    <p class="recommendation">{{ recommendation }}</p>
  </section>
</template>

<style scoped>
.compare-view {
  --stormy-teal: #006d77;
  --pearl-aqua: #83c5be;
  --alice-blue: #edf6f9;
  --almond-silk: #ffddd2;
  --tangerine-dream: #e29578;
  position: fixed;
  left: 24px;
  bottom: 24px;
  z-index: 1050;
  width: min(760px, calc(100vw - 48px));
  padding: 18px;
  border: 1px solid rgba(0, 109, 119, 0.16);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
  color: #102a2f;
}

.compare-header {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.eyebrow,
h2,
h3,
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
}

h3 {
  font-size: 18px;
  font-weight: 800;
}

button {
  min-height: 40px;
  border: 1px solid var(--stormy-teal);
  border-radius: 8px;
  background: #ffffff;
  color: var(--stormy-teal);
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.compare-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
}

.compare-column {
  position: relative;
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(0, 109, 119, 0.16);
  border-radius: 8px;
  background: var(--alice-blue);
}

.compare-column.winner {
  border-color: #22c55e;
  background: #f0fdf4;
}

.winner-badge {
  justify-self: start;
  padding: 4px 8px;
  border-radius: 8px;
  background: #22c55e;
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
}

.label-pill {
  justify-self: start;
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

dl {
  display: grid;
  gap: 8px;
  margin: 0;
}

dl div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

dt,
dd {
  font-size: 14px;
}

dt {
  color: #4b6267;
  font-weight: 700;
}

dd {
  margin: 0;
  color: #102a2f;
  font-weight: 800;
}

.recommendation {
  margin-top: 14px;
  color: #243f45;
  font-size: 15px;
  font-weight: 700;
}

@media (max-width: 768px) {
  .compare-view {
    left: 12px;
    right: 12px;
    bottom: 12px;
    width: auto;
    max-height: 72vh;
    overflow-y: auto;
  }

  .compare-header,
  .compare-grid {
    grid-template-columns: 1fr;
  }

  .compare-header {
    align-items: flex-start;
  }
}
</style>
