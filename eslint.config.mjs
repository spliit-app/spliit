import nextVitals from 'eslint-config-next/core-web-vitals'
import { defineConfig, globalIgnores } from 'eslint/config'

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Prisma 7 emits the generated client here; it ships its own
    // eslint-disable banners and should not be linted as project source.
    'src/generated/**',
  ]),
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])

export default eslintConfig
