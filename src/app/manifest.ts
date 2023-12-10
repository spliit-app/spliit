import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Spliit',
    short_name: 'Spliit',
    description:
      'A minimalist web application to share expenses with friends and family. No ads, no account, no problem.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff',
    theme_color: '#047857',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/logo-512x512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
