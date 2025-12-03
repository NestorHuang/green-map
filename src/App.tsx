import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MapProvider } from './contexts/MapContext'
import MapPage from './pages/MapPage'

function App() {
  return (
    <MapProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MapPage />} />
        </Routes>
      </BrowserRouter>
    </MapProvider>
  )
}

export default App
