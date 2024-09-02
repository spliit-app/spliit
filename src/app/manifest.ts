import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Geeky Navigator - Expense',
    short_name: 'Expense',
    description:
      'A minimalist web application to share expenses with friends and family. No ads, no account, no problem.',
    start_url: '/groups',
    display: 'standalone',
    background_color: '#fff',
    theme_color: '#047857',
    icons: [
      {
        src: 'https://geekynavigator.com/logo.jpg',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'https://geekynavigator.com/logo.jpg',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: 'https://geekynavigator.com/logo.jpg',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
