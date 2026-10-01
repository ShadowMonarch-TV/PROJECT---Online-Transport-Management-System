const API_BASE = '/api'

const readToken = () => localStorage.getItem('otms_token')

const request = async (path, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  if (!options.noAuth) {
    const token = readToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  })

  if (response.status === 204) {
    return null
  }

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { detail: text }
    }
  }

  if (!response.ok) {
    const message = data?.detail || data?.non_field_errors?.[0] || response.statusText
    throw new Error(message)
  }

  return data
}

const api = {
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload), noAuth: true }),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload), noAuth: true }),
  me: () => request('/auth/me'),
  list: (resource) => request(`/${resource}/`),
  create: (resource, payload) => request(`/${resource}/`, { method: 'POST', body: JSON.stringify(payload) }),
  update: (resource, id, payload) => request(`/${resource}/${id}/`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (resource, id) => request(`/${resource}/${id}/`, { method: 'DELETE' }),
  updateTripLocation: (id, payload) => request(`/trips/${id}/location/`, { method: 'PUT', body: JSON.stringify(payload) }),
  markNotificationRead: (id) => request(`/notifications/${id}/read/`, { method: 'PUT' }),
  reportsSummary: () => request('/reports/summary'),
  reportDailyTransport: () => request('/reports/daily-transport'),
  reportMonthlyRevenue: () => request('/reports/monthly-revenue'),
  reportVehicleUsage: () => request('/reports/vehicle-usage'),
  reportDriverPerformance: () => request('/reports/driver-performance')
}

export default api
