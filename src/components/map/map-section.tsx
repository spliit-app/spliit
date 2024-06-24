import { useMap, useMapEvents } from 'react-leaflet'
import { MapSectionType } from './types'

type MapSectionProps = {
  section: MapSectionType
  updateSection: (section: MapSectionType) => void
}

function MapSection({ section, updateSection }: MapSectionProps) {
  const map = useMap()

  useMapEvents({
    dragend() {
      const { lat: latitude, lng: longitude } = map.getCenter()
      const location = { latitude, longitude }
      const zoom = map.getZoom()
      updateSection({ location, zoom })
    },
    zoomend() {
      const { lat: latitude, lng: longitude } = map.getCenter()
      const location = { latitude, longitude }
      const zoom = map.getZoom()
      updateSection({ location, zoom })
    },
  })

  map.setView(
    [section.location.latitude, section.location.longitude],
    section.zoom,
  )
  return null
}

export default MapSection
