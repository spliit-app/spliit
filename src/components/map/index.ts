import dynamic from 'next/dynamic'

const MapComponent = dynamic(() => import('./map-component'), {
  ssr: false,
})

export { MapComponent }
