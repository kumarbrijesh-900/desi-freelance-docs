import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lance',
    short_name: 'Lance',
    description: 'Smart Invoice Generator for Indian Freelancers',
    start_url: '/',
    display: 'standalone',
    background_color: '#111118',
    theme_color: '#111118',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
