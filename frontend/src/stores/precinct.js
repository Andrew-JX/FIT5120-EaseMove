import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export const usePrecinctStore = defineStore('precinct', () => {
  const precincts = ref([])
  const selectedPrecinct = ref(null)
  const comparePrecincts = ref([])
  const loading = ref(false)
  const error = ref(null)
  const lastFetched = ref(null)
  const todayData = ref({})

  /**
   * Returns a precinct object by precinct id.
   * @param {string} id - Precinct id to find.
   * @returns {Object | null} Matching precinct object, or null when unavailable.
   */
  const getPrecinctById = computed(() => (id) => (
    precincts.value.find((precinct) => precinct.id === id) ?? null
  ))

  /**
   * True when exactly two precincts have been selected for comparison.
   * @returns {boolean} Whether comparison is ready.
   */
  const isComparing = computed(() => comparePrecincts.value.length === 2)

  /**
   * Returns the compared precinct with the higher comfort score.
   * @returns {Object | null} Winning precinct, or null when tied or incomplete.
   */
  const betterPrecinct = computed(() => {
    if (!isComparing.value) return null

    const [firstId, secondId] = comparePrecincts.value
    const first = getPrecinctById.value(firstId)
    const second = getPrecinctById.value(secondId)

    if (!first || !second || first.comfort_score === second.comfort_score) return null

    return first.comfort_score > second.comfort_score ? first : second
  })

  /**
   * Fetches the latest comfort score for all precincts.
   * @returns {Promise<void>}
   */
  async function fetchCurrentPrecincts() {
    loading.value = true
    error.value = null

    try {
      const response = await axios.get(`${API_BASE_URL}/api/precincts/current`)
      precincts.value = response.data.precincts
      lastFetched.value = new Date().toISOString()
    } catch (err) {
      error.value = err.message || 'Unable to load comfort data'
    } finally {
      loading.value = false
    }
  }

  /**
   * Selects a precinct, or clears selection when the same id is selected again.
   * @param {string | null} precinctId - Precinct id to select.
   * @returns {void}
   */
  function selectPrecinct(precinctId) {
    if (!precinctId || selectedPrecinct.value === precinctId) {
      selectedPrecinct.value = null
      return
    }

    selectedPrecinct.value = precinctId
  }

  /**
   * Adds a precinct to the comparison list, replacing the oldest when full.
   * @param {string} precinctId - Precinct id to compare.
   * @returns {void}
   */
  function addToCompare(precinctId) {
    if (comparePrecincts.value.includes(precinctId)) return

    if (comparePrecincts.value.length >= 2) {
      comparePrecincts.value = [...comparePrecincts.value.slice(1), precinctId]
      return
    }

    comparePrecincts.value = [...comparePrecincts.value, precinctId]
  }

  /**
   * Clears all comparison selections.
   * @returns {void}
   */
  function clearCompare() {
    comparePrecincts.value = []
  }

  /**
   * Fetches comparison data for two precincts and refreshes matching store records.
   * @param {string} idA - First precinct id.
   * @param {string} idB - Second precinct id.
   * @returns {Promise<Array>} Comparison precinct records.
   */
  async function fetchComparison(idA, idB) {
    loading.value = true
    error.value = null

    try {
      const response = await axios.get(`${API_BASE_URL}/api/precincts/compare`, {
        params: { a: idA, b: idB }
      })
      const comparedPrecincts = response.data.precincts
      const comparedIds = comparedPrecincts.map((precinct) => precinct.id)

      precincts.value = [
        ...precincts.value.filter((precinct) => !comparedIds.includes(precinct.id)),
        ...comparedPrecincts
      ]
      comparePrecincts.value = comparedIds.slice(0, 2)

      return comparedPrecincts
    } catch (err) {
      error.value = err.message || 'Unable to load comparison data'
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetches today's recommendation for a precinct and stores it by precinct id.
   * @param {string} precinctId - Precinct id to fetch.
   * @returns {Promise<Object | null>} Today endpoint response or null on failure.
   */
  async function fetchTodayRecommendation(precinctId) {
    loading.value = true
    error.value = null

    try {
      const response = await axios.get(`${API_BASE_URL}/api/precincts/${precinctId}/today`)
      todayData.value = {
        ...todayData.value,
        [precinctId]: response.data
      }
      return response.data
    } catch (err) {
      error.value = err.message || 'Unable to load recommendation data'
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    precincts,
    selectedPrecinct,
    comparePrecincts,
    loading,
    error,
    lastFetched,
    todayData,
    getPrecinctById,
    isComparing,
    betterPrecinct,
    fetchCurrentPrecincts,
    selectPrecinct,
    addToCompare,
    clearCompare,
    fetchComparison,
    fetchTodayRecommendation
  }
})
