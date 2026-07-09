import { NotificationsController } from './state/NotificationsController'
import { TelemetryController } from './state/TelemetryController'
import { Dashboard } from './components/Dashboard'
import './App.css'

function App() {
  return (
    // TelemetryController publishes messages into NotificationsController, so the
    // notifications controller must wrap it.

    <NotificationsController>
      <TelemetryController>
        <Dashboard />
      </TelemetryController>
    </NotificationsController>
  )
}

export default App
