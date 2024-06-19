import { ExpenseFormValues } from '@/lib/schemas'
import { Marker, useMapEvents } from 'react-leaflet'

type MarkerProps = {
  location: ExpenseFormValues['location']
  updateLocation: (location: { latitude: number; longitude: number }) => void
}

function LocationMarker({ location, updateLocation }: MarkerProps) {
  useMapEvents({
    click(event) {
      const { lat: latitude, lng: longitude } = event.latlng
      updateLocation({ latitude, longitude })
    },
  })

  return (
    location && <Marker position={[location.latitude, location.longitude]} />
  )
}

export default LocationMarker
