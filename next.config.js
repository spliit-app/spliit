/** @type {import('next').NextConfig} */
const nextConfig = {}

const { withPlausibleProxy } = require('next-plausible')
module.exports = withPlausibleProxy()(nextConfig)
