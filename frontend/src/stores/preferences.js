import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'easemove_weights'
const DEFAULT_WEIGHTS = { temperature: 60, humidity: 30, activity: 10 }

/**
 * Validates user comfort score weights.
 * @param {Object} candidate - Weight object to validate.
 * @returns {boolean} True when all keys exist and sum to 100.
 */
function isValidWeights(candidate) {
  if (!candidate) return false

  const keys = ['temperature', 'humidity', 'activity']
  const hasAllKeys = keys.every((key) => Number.isFinite(candidate[key]))

  if (!hasAllKeys) return false

  return keys.reduce((total, key) => total + candidate[key], 0) === 100
}

export const usePreferencesStore = defineStore('preferences', () => {
  const weights = ref({ ...DEFAULT_WEIGHTS })

  /**
   * Returns percentage weights as decimal scoring weights.
   * @returns {{ temperature: number, humidity: number, activity: number }} Decimal weight values.
   */
  const weightsAsDecimals = computed(() => ({
    temperature: weights.value.temperature / 100,
    humidity: weights.value.humidity / 100,
    activity: weights.value.activity / 100
  }))

  /**
   * Validates, saves, and applies new comfort score weights.
   * @param {{ temperature: number, humidity: number, activity: number }} newWeights - Weight values that must sum to 100.
   * @returns {boolean} True when weights were applied.
   */
  function setWeights(newWeights) {
    if (!isValidWeights(newWeights)) return false

    weights.value = { ...newWeights }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weights.value))
    return true
  }

  /**
   * Resets comfort score weights to project defaults and saves them.
   * @returns {void}
   */
  function resetWeights() {
    weights.value = { ...DEFAULT_WEIGHTS }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weights.value))
  }

  /**
   * Loads saved comfort score weights from localStorage when valid.
   * @returns {void}
   */
  function loadFromStorage() {
    try {
      const storedWeights = JSON.parse(localStorage.getItem(STORAGE_KEY))

      if (isValidWeights(storedWeights)) {
        weights.value = { ...storedWeights }
      }
    } catch {
      weights.value = { ...DEFAULT_WEIGHTS }
    }
  }

  return {
    weights,
    weightsAsDecimals,
    setWeights,
    resetWeights,
    loadFromStorage
  }
})
