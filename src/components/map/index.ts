import dynamic from 'next/dynamic'

// This is necessary for using react-leaflet with Next.js
// see: https://github.com/PaulLeCam/react-leaflet/issues/956#issuecomment-1057881284
const Map = dynamic(() => import('./map-component'), {
  ssr: false,
})

export { Map }
