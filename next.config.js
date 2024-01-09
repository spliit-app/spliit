/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ hostname: 'avatars.githubusercontent.com' }],
  },
}

const { withPlausibleProxy } = require('next-plausible')
module.exports = withPlausibleProxy()(nextConfig)
