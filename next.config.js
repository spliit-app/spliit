/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns:
      process.env.S3_UPLOAD_BUCKET && process.env.S3_UPLOAD_REGION
        ? [
            {
              hostname: `${process.env.S3_UPLOAD_BUCKET}.s3.${process.env.S3_UPLOAD_REGION}.amazonaws.com`,
            },
          ]
        : [],
  },
}

module.exports = nextConfig
