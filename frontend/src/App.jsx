import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import api from './api'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend)

const rolePaths = {
  admin: '/admin',
  driver: '/driver',
  passenger: '/passenger'
}

const AuthContext = createContext(null)

function useAuth() {
  return useContext(AuthContext)
}

const toDateTimeLocal = (value) => {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

const fromDateTimeLocal = (value) => (value ? new Date(value).toISOString() : null)

const downloadCsv = (rows, columns, filename) => {
  const header = columns.map((col) => col.label)
  const body = rows.map((row) =>
    columns.map((col) => {
      const raw = col.accessor ? col.accessor(row) : row[col.key]
      const text = raw === null || raw === undefined ? '' : String(raw)
      return `"${text.replace(/"/g, '""')}"`
    })
  )

  const content = [header.map((cell) => `"${cell}"`).join(','), ...body.map((line) => line.join(','))].join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('otms_user')
    return raw ? JSON.parse(raw) : null
  })

  const login = async (payload) => {
    const data = await api.login(payload)
    localStorage.setItem('otms_token', data.token)
    localStorage.setItem('otms_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const register = async (payload) => {
    const data = await api.register(payload)
    localStorage.setItem('otms_token', data.token)
    localStorage.setItem('otms_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('otms_token')
    localStorage.removeItem('otms_user')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>
}

function RequireRole({ role, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={rolePaths[user.role] || '/login'} replace />
  return children
}

function LoginPage() {
  const navigate = useNavigate()
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'passenger' })

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const currentUser = mode === 'login' ? await login({ email: form.email, password: form.password }) : await register(form)
      navigate(rolePaths[currentUser.role] || '/admin')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Online Transport Management System</h2>
        <div className="actions" style={{ marginBottom: 12 }}>
          <button className={`button ${mode === 'login' ? '' : 'secondary'}`} type="button" onClick={() => setMode('login')}>Login</button>
          <button className={`button ${mode === 'register' ? '' : 'secondary'}`} type="button" onClick={() => setMode('register')}>Register</button>
        </div>
        <form onSubmit={submit}>
          {mode === 'register' && (
            <div className="field">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} required />
          </div>
          {mode === 'register' && (
            <div className="field">
              <label>Role</label>
              <select value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}>
                <option value="admin">Admin</option>
                <option value="driver">Driver</option>
                <option value="passenger">Passenger</option>
              </select>
            </div>
          )}
          {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
          <button className="button" disabled={busy} type="submit">{busy ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}</button>
        </form>
      </div>
    </div>
  )
}

function Layout({ title, role, children }) {
  const { user, logout } = useAuth()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">OTMS</div>
        <div className="nav-links">
          <a href="#overview">Overview</a>
          {role === 'admin' && <a href="#reports">Reports</a>}
          <a href="#trips">Trips</a>
          <a href="#bookings">Bookings</a>
          <a href="#vehicles">Vehicles</a>
          <a href="#drivers">Drivers</a>
          <a href="#routes">Routes</a>
          <a href="#payments">Payments</a>
          <a href="#notifications">Notifications</a>
          {role === 'admin' && <a href="#users">Users</a>}
        </div>
        <button type="button" className="button secondary" onClick={logout}>Logout</button>
      </aside>
      <main className="content">
        <div className="header">
          <h1>{title}</h1>
          <div>{user?.name} • {user?.role}</div>
        </div>
        {children}
      </main>
    </div>
  )
}

function useLookups() {
  const { user } = useAuth()
  const [lookups, setLookups] = useState({ users: [], vehicles: [], drivers: [], routes: [], trips: [], bookings: [] })

  const load = async () => {
    if (!user) return

    const resourceNames = ['vehicles', 'drivers', 'routes', 'trips', 'bookings']
    if (user.role === 'admin') resourceNames.unshift('users')

    const result = { users: [], vehicles: [], drivers: [], routes: [], trips: [], bookings: [] }

    await Promise.all(
      resourceNames.map(async (name) => {
        try {
          result[name] = await api.list(name)
        } catch {
          result[name] = []
        }
      })
    )

    setLookups(result)
  }

  useEffect(() => {
    load()
  }, [user?.id, user?.role])

  return { lookups, reload: load }
}
function ResourceManager({ title, id, resource, fields, columns, lookups, filterRows }) {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)

  const initialForm = useMemo(() => {
    const base = {}
    fields.forEach((f) => {
      base[f.name] = f.type === 'checkbox' ? false : ''
    })
    return base
  }, [fields])

  const [form, setForm] = useState(initialForm)

  const load = async () => {
    try {
      setRows(await api.list(resource))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [resource])

  const visible = filterRows ? rows.filter(filterRows) : rows

  const editRow = (row) => {
    const next = { ...initialForm }
    fields.forEach((f) => {
      const raw = row[f.name]
      if (f.type === 'datetime-local') next[f.name] = toDateTimeLocal(raw)
      else if (f.type === 'checkbox') next[f.name] = Boolean(raw)
      else next[f.name] = raw ?? ''
    })
    setForm(next)
    setEditing(row.id)
  }

  const clearForm = () => {
    setEditing(null)
    setForm(initialForm)
  }

  const payload = () => {
    const data = {}
    fields.forEach((f) => {
      let value = form[f.name]
      if (f.type === 'datetime-local') value = fromDateTimeLocal(value)
      if (f.cast === 'number' || f.type === 'number') value = value === '' ? null : Number(value)
      if (f.skipIfEmpty && (value === null || value === '')) return
      data[f.name] = value
    })
    return data
  }

  const submit = async (event) => {
    event.preventDefault()
    try {
      if (editing) await api.update(resource, editing, payload())
      else await api.create(resource, payload())
      clearForm()
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (idValue) => {
    try {
      await api.remove(resource, idValue)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="section" id={id || resource}>
      <div className="card">
        <div className="actions" style={{ justifyContent: 'space-between' }}>
          <h2>{title}</h2>
          <button className="button secondary" type="button" onClick={() => downloadCsv(visible, columns, `${resource}.csv`)}>Export CSV</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-row">
            {fields.map((f) => (
              <div className="field" key={f.name}>
                <label>{f.label}</label>
                {f.type === 'select' ? (
                  <select value={form[f.name]} onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))} required={f.required}>
                    <option value="">Select</option>
                    {(f.options ? f.options(lookups) : []).map((op) => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea value={form[f.name]} onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))} />
                ) : (
                  <input type={f.type || 'text'} step={f.step} value={form[f.name]} onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))} required={f.required} />
                )}
              </div>
            ))}
          </div>
          {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
          <div className="actions">
            <button className="button" type="submit">{editing ? 'Update' : 'Add'}</button>
            {editing && <button className="button secondary" type="button" onClick={clearForm}>Cancel</button>}
          </div>
        </form>
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => <th key={c.label}>{c.label}</th>)}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id}>
                {columns.map((c) => <td key={c.label}>{c.accessor ? c.accessor(row) : row[c.key]}</td>)}
                <td>
                  <div className="actions">
                    <button className="button secondary" type="button" onClick={() => editRow(row)}>Edit</button>
                    <button className="button danger" type="button" onClick={() => remove(row.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function TrackingMap({ trips }) {
  const mapped = trips.filter((t) => t.current_lat && t.current_lng)
  const center = mapped.length ? [Number(mapped[0].current_lat), Number(mapped[0].current_lng)] : [20.5937, 78.9629]

  return (
    <div className="map">
      <MapContainer center={center} zoom={5} scrollWheelZoom style={{ width: '100%', height: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        {mapped.map((trip) => (
          <Marker key={trip.id} position={[Number(trip.current_lat), Number(trip.current_lng)]}>
            <Popup>
              <strong>{trip.route_name || `Trip ${trip.id}`}</strong>
              <div>Status: {trip.status}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

function Reports() {
  const [daily, setDaily] = useState([])
  const [monthly, setMonthly] = useState([])
  const [usage, setUsage] = useState([])
  const [driverPerf, setDriverPerf] = useState([])

  useEffect(() => {
    const load = async () => {
      setDaily(await api.reportDailyTransport().catch(() => []))
      setMonthly(await api.reportMonthlyRevenue().catch(() => []))
      setUsage(await api.reportVehicleUsage().catch(() => []))
      setDriverPerf(await api.reportDriverPerformance().catch(() => []))
    }
    load()
  }, [])

  return (
    <section className="section" id="reports">
      <div className="card">
        <h2>Reports</h2>
        <div className="grid">
          <div className="card">
            <h3>Daily Trips</h3>
            <Bar data={{ labels: daily.map((d) => d.day), datasets: [{ label: 'Trips', data: daily.map((d) => d.trips), backgroundColor: '#0f766e' }] }} />
          </div>
          <div className="card">
            <h3>Monthly Revenue</h3>
            <Line data={{ labels: monthly.map((m) => m.month), datasets: [{ label: 'Revenue', data: monthly.map((m) => m.revenue), borderColor: '#ea580c' }] }} />
          </div>
          <div className="card">
            <h3>Vehicle Usage</h3>
            <Bar data={{ labels: usage.map((u) => u.vehicle__plate_number || 'N/A'), datasets: [{ label: 'Trips', data: usage.map((u) => u.trips), backgroundColor: '#111827' }] }} />
          </div>
          <div className="card">
            <h3>Driver Performance</h3>
            <Doughnut data={{ labels: driverPerf.map((d) => d.driver__user__name || 'N/A'), datasets: [{ data: driverPerf.map((d) => d.trips), backgroundColor: ['#0f766e', '#ea580c', '#0ea5e9', '#16a34a'] }] }} />
          </div>
        </div>
      </div>
    </section>
  )
}
function AdminDashboard() {
  const { lookups } = useLookups()

  return (
    <Layout title="Admin Dashboard" role="admin">
      <section className="section" id="overview"><div className="banner">Complete transport operations console.</div></section>
      <Reports />

      <ResourceManager
        title="Vehicles"
        id="vehicles"
        resource="vehicles"
        lookups={lookups}
        fields={[
          { name: 'plate_number', label: 'Plate Number', required: true },
          { name: 'model', label: 'Model', required: true },
          { name: 'capacity', label: 'Capacity', type: 'number', cast: 'number', required: true },
          { name: 'status', label: 'Status', required: true }
        ]}
        columns={[{ label: 'Plate', key: 'plate_number' }, { label: 'Model', key: 'model' }, { label: 'Capacity', key: 'capacity' }, { label: 'Status', key: 'status' }]}
      />

      <ResourceManager
        title="Drivers"
        id="drivers"
        resource="drivers"
        lookups={lookups}
        fields={[
          { name: 'user_id', label: 'User', type: 'select', required: true, options: (l) => l.users.map((u) => ({ value: u.id, label: u.name })) },
          { name: 'license_number', label: 'License Number', required: true },
          { name: 'phone', label: 'Phone' },
          { name: 'assigned_vehicle_id', label: 'Vehicle', type: 'select', options: (l) => l.vehicles.map((v) => ({ value: v.id, label: v.plate_number })) }
        ]}
        columns={[{ label: 'Driver', key: 'user_name' }, { label: 'License', key: 'license_number' }, { label: 'Phone', key: 'phone' }, { label: 'Vehicle', key: 'assigned_vehicle_plate' }]}
      />

      <ResourceManager
        title="Routes"
        id="routes"
        resource="routes"
        lookups={lookups}
        fields={[
          { name: 'name', label: 'Name', required: true },
          { name: 'origin', label: 'Origin', required: true },
          { name: 'destination', label: 'Destination', required: true },
          { name: 'distance_km', label: 'Distance', type: 'number', cast: 'number' },
          { name: 'duration_min', label: 'Duration (min)', type: 'number', cast: 'number' }
        ]}
        columns={[{ label: 'Name', key: 'name' }, { label: 'Origin', key: 'origin' }, { label: 'Destination', key: 'destination' }, { label: 'Distance', key: 'distance_km' }, { label: 'Duration', key: 'duration_min' }]}
      />

      <ResourceManager
        title="Trips"
        id="trips"
        resource="trips"
        lookups={lookups}
        fields={[
          { name: 'route_id', label: 'Route', type: 'select', required: true, options: (l) => l.routes.map((r) => ({ value: r.id, label: r.name })) },
          { name: 'vehicle_id', label: 'Vehicle', type: 'select', options: (l) => l.vehicles.map((v) => ({ value: v.id, label: v.plate_number })) },
          { name: 'driver_id', label: 'Driver', type: 'select', options: (l) => l.drivers.map((d) => ({ value: d.id, label: d.user_name })) },
          { name: 'start_time', label: 'Start', type: 'datetime-local', required: true },
          { name: 'end_time', label: 'End', type: 'datetime-local' },
          { name: 'status', label: 'Status' },
          { name: 'capacity', label: 'Capacity', type: 'number', cast: 'number' },
          { name: 'current_lat', label: 'Latitude', type: 'number', cast: 'number', step: '0.000001' },
          { name: 'current_lng', label: 'Longitude', type: 'number', cast: 'number', step: '0.000001' }
        ]}
        columns={[{ label: 'Route', key: 'route_name' }, { label: 'Vehicle', key: 'vehicle_plate' }, { label: 'Driver', key: 'driver_name' }, { label: 'Start', accessor: (r) => (r.start_time ? new Date(r.start_time).toLocaleString() : '') }, { label: 'Status', key: 'status' }]}
      />

      <ResourceManager
        title="Bookings"
        id="bookings"
        resource="bookings"
        lookups={lookups}
        fields={[
          { name: 'trip_id', label: 'Trip', type: 'select', required: true, options: (l) => l.trips.map((t) => ({ value: t.id, label: t.route_name })) },
          { name: 'passenger_id', label: 'Passenger', type: 'select', required: true, options: (l) => l.users.map((u) => ({ value: u.id, label: u.name })) },
          { name: 'seats', label: 'Seats', type: 'number', cast: 'number', required: true },
          { name: 'status', label: 'Status', required: true }
        ]}
        columns={[{ label: 'Route', key: 'route_name' }, { label: 'Passenger', key: 'passenger_name' }, { label: 'Seats', key: 'seats' }, { label: 'Status', key: 'status' }]}
      />

      <ResourceManager
        title="Payments"
        id="payments"
        resource="payments"
        lookups={lookups}
        fields={[
          { name: 'booking_id', label: 'Booking', type: 'select', required: true, options: (l) => l.bookings.map((b) => ({ value: b.id, label: `Booking ${b.id}` })) },
          { name: 'amount', label: 'Amount', type: 'number', cast: 'number', required: true },
          { name: 'method', label: 'Method', required: true },
          { name: 'status', label: 'Status', required: true },
          { name: 'transaction_id', label: 'Transaction ID' }
        ]}
        columns={[{ label: 'Passenger', key: 'passenger_name' }, { label: 'Amount', key: 'amount' }, { label: 'Method', key: 'method' }, { label: 'Status', key: 'status' }]}
      />

      <ResourceManager
        title="Notifications"
        id="notifications"
        resource="notifications"
        lookups={lookups}
        fields={[
          { name: 'user_id', label: 'User', type: 'select', required: true, options: (l) => l.users.map((u) => ({ value: u.id, label: u.name })) },
          { name: 'title', label: 'Title', required: true },
          { name: 'message', label: 'Message', type: 'textarea', required: true }
        ]}
        columns={[{ label: 'User', key: 'user_name' }, { label: 'Title', key: 'title' }, { label: 'Message', key: 'message' }, { label: 'Read', accessor: (r) => (r.is_read ? 'Yes' : 'No') }]}
      />

      <ResourceManager
        title="Users"
        id="users"
        resource="users"
        lookups={lookups}
        fields={[
          { name: 'name', label: 'Name', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'role', label: 'Role', type: 'select', required: true, options: () => [{ value: 'admin', label: 'Admin' }, { value: 'driver', label: 'Driver' }, { value: 'passenger', label: 'Passenger' }] },
          { name: 'password', label: 'Password', type: 'password', skipIfEmpty: true }
        ]}
        columns={[{ label: 'Name', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Role', key: 'role' }]}
      />
    </Layout>
  )
}

function DriverDashboard() {
  const { user } = useAuth()
  const { lookups } = useLookups()
  const myDriverProfile = lookups.drivers.find((d) => d.user_id === user?.id)
  const myTrips = myDriverProfile ? lookups.trips.filter((t) => t.driver_id === myDriverProfile.id) : []

  return (
    <Layout title="Driver Dashboard" role="driver">
      <section className="section" id="overview"><div className="banner">Manage assigned trips and live tracking updates.</div></section>
      <div className="card"><h2>Live Tracking</h2><TrackingMap trips={myTrips} /></div>
      <ResourceManager
        title="My Trips"
        id="trips"
        resource="trips"
        lookups={lookups}
        filterRows={(row) => myTrips.some((t) => t.id === row.id)}
        fields={[
          { name: 'route_id', label: 'Route', type: 'select', required: true, options: (l) => l.routes.map((r) => ({ value: r.id, label: r.name })) },
          { name: 'vehicle_id', label: 'Vehicle', type: 'select', options: (l) => l.vehicles.map((v) => ({ value: v.id, label: v.plate_number })) },
          { name: 'driver_id', label: 'Driver', type: 'select', required: true, options: (l) => l.drivers.map((d) => ({ value: d.id, label: d.user_name })) },
          { name: 'start_time', label: 'Start', type: 'datetime-local', required: true },
          { name: 'end_time', label: 'End', type: 'datetime-local' },
          { name: 'status', label: 'Status' },
          { name: 'capacity', label: 'Capacity', type: 'number', cast: 'number' },
          { name: 'current_lat', label: 'Latitude', type: 'number', cast: 'number', step: '0.000001' },
          { name: 'current_lng', label: 'Longitude', type: 'number', cast: 'number', step: '0.000001' }
        ]}
        columns={[{ label: 'Route', key: 'route_name' }, { label: 'Status', key: 'status' }, { label: 'Start', accessor: (r) => (r.start_time ? new Date(r.start_time).toLocaleString() : '') }]}
      />
    </Layout>
  )
}

function PassengerDashboard() {
  const { user } = useAuth()
  const { lookups } = useLookups()

  return (
    <Layout title="Passenger Dashboard" role="passenger">
      <section className="section" id="overview"><div className="banner">Book trips and manage your ride details.</div></section>

      <ResourceManager
        title="Trips"
        id="trips"
        resource="trips"
        lookups={lookups}
        fields={[
          { name: 'route_id', label: 'Route', type: 'select', required: true, options: (l) => l.routes.map((r) => ({ value: r.id, label: r.name })) },
          { name: 'vehicle_id', label: 'Vehicle', type: 'select', options: (l) => l.vehicles.map((v) => ({ value: v.id, label: v.plate_number })) },
          { name: 'driver_id', label: 'Driver', type: 'select', options: (l) => l.drivers.map((d) => ({ value: d.id, label: d.user_name })) },
          { name: 'start_time', label: 'Start', type: 'datetime-local', required: true },
          { name: 'status', label: 'Status' }
        ]}
        columns={[{ label: 'Route', key: 'route_name' }, { label: 'Vehicle', key: 'vehicle_plate' }, { label: 'Driver', key: 'driver_name' }, { label: 'Start', accessor: (r) => (r.start_time ? new Date(r.start_time).toLocaleString() : '') }]}
      />

      <ResourceManager
        title="My Bookings"
        id="bookings"
        resource="bookings"
        lookups={lookups}
        filterRows={(r) => r.passenger_id === user?.id}
        fields={[
          { name: 'trip_id', label: 'Trip', type: 'select', required: true, options: (l) => l.trips.map((t) => ({ value: t.id, label: t.route_name })) },
          { name: 'passenger_id', label: 'Passenger', type: 'select', required: true, options: () => [{ value: user?.id, label: user?.name || 'Me' }] },
          { name: 'seats', label: 'Seats', type: 'number', cast: 'number', required: true },
          { name: 'status', label: 'Status', required: true }
        ]}
        columns={[{ label: 'Route', key: 'route_name' }, { label: 'Seats', key: 'seats' }, { label: 'Status', key: 'status' }]}
      />
    </Layout>
  )
}

function HomeRedirect() {
  const { user } = useAuth()
  return user ? <Navigate to={rolePaths[user.role] || '/login'} replace /> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<RequireRole role="admin"><AdminDashboard /></RequireRole>} />
          <Route path="/driver" element={<RequireRole role="driver"><DriverDashboard /></RequireRole>} />
          <Route path="/passenger" element={<RequireRole role="passenger"><PassengerDashboard /></RequireRole>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
