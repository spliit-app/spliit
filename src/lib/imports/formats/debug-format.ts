import { importFormats, type ImportFormat } from '@/lib/imports/types'

// Extremely simple debug format to aid manual testing.
//
// Expected content:
//   DEBUG_IMPORT\n
//   { ...Spliit-JSON payload... }
//
// Rationale:
// - Keeps detection unambiguous (hard prefix), avoiding conflicts with real formats
// - Reuses Spliit-JSON parsing for convenience when a JSON payload follows the marker
// - Allows devs to quickly craft debug fixtures without changing the main adapters

export class DebugImportFormat implements ImportFormat {
  id = 'debug'
  label = 'Debug Import'
  priority = 5

  private stripPrefix(content: string) {
    const trimmed = content.trimStart()
    const prefixes = ['DEBUG_IMPORT', 'DEBUG_ERRORS']
    for (const prefix of prefixes) {
      if (trimmed.startsWith(prefix)) {
        const idx = trimmed.indexOf('\n')
        return idx >= 0 ? trimmed.slice(idx + 1) : ''
      }
    }
    return content
  }

  async detect(content: string): Promise<number> {
    const trimmed = content.trimStart()
    if (
      trimmed.startsWith('DEBUG_IMPORT') ||
      trimmed.startsWith('DEBUG_ERRORS')
    )
      return 0.99
    return 0
  }

  async parseToInternal(content: string) {
    // Debug format: only emit errors from payload lines after marker.
    // Usage:
    //   DEBUG_ERRORS\n
    //   <message per line>
    // or:
    //   DEBUG_IMPORT\n
    //   <message per line>
    const body = this.stripPrefix(content)
    const errors = body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((message, index) => ({ row: index + 1, message }))

    return { expenses: [], group: undefined, errors }
  }
}

// Self-register
importFormats.register(new DebugImportFormat())
