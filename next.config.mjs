import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin()

/**
 * Undefined entries are not supported. Push optional patterns to this array only if defined.
 * @type {import('next/dist/shared/lib/image-config').RemotePattern}
 */
const remotePatterns = []

// S3 Storage
if (process.env.S3_UPLOAD_ENDPOINT) {
  // custom endpoint for providers other than AWS
  const url = new URL(process.env.S3_UPLOAD_ENDPOINT);
  remotePatterns.push({
    hostname: url.hostname,
  })
} else if (process.env.S3_UPLOAD_BUCKET && process.env.S3_UPLOAD_REGION) {
  // default provider
  remotePatterns.push({
    hostname: `${process.env.S3_UPLOAD_BUCKET}.s3.${process.env.S3_UPLOAD_REGION}.amazonaws.com`,
  })
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained server into .next/standalone, containing only the
  // files Next.js traced as actually reachable at runtime. The Docker runtime
  // stage copies that instead of a full production `node_modules`.
  output: 'standalone',
  images: {
    remotePatterns
  },
  reactCompiler: true,
  // Required to run in a codespace (see https://github.com/vercel/next.js/issues/58019)
  experimental: {
    serverActions: {
      // localhost:3000 covers local dev and same-host container access; the
      // configured base URL covers a deployment reached under its own domain,
      // whose server actions would otherwise be rejected as cross-origin.
      // An unparseable value is ignored here rather than thrown: this file is
      // evaluated before the env schema runs, and its `Invalid URL` is far less
      // useful than the validation error the schema is about to produce.
      allowedOrigins: (() => {
        const base = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL
        try {
          return ['localhost:3000', ...(base ? [new URL(base).host] : [])]
        } catch {
          return ['localhost:3000']
        }
      })(),
    },
  },
}

export default withNextIntl(nextConfig)
