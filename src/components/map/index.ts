import dynamic from 'next/dynamic'

const Map = dynamic(() => import('./map-component'), {
  ssr: false,
})

export { Map }
