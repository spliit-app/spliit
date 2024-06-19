import { LatLngExpression } from 'leaflet'
import 'leaflet-defaulticon-compatibility'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css'
import 'leaflet/dist/leaflet.css'
import React from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'

type MapProps = {
  latitude: number
  longitude: number
}

type KeepMapCenteredProps = {
  center: LatLngExpression
  zoom?: number | undefined
}

function KeepMapCentered({ center, zoom }: KeepMapCenteredProps) {
  const map = useMap()
  map.setView(center, zoom)
  return null
}

const Map: React.FC<MapProps> = ({ latitude, longitude }) => {
  const center: [number, number] = [latitude, longitude]
  const zoom = 13

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={false}
      style={{ height: '40vh', zIndex: 0 }}
    >
      <KeepMapCentered center={center} zoom={zoom} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={center} />
    </MapContainer>
  )
}

export default Map
