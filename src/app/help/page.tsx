// src/app/help/page.tsx
import fs from 'fs/promises'
import { marked } from 'marked'
import path from 'path'

// Configure marked to not render raw HTML for security
// Any HTML tags in the markdown will be removed from the output
marked.use({
  renderer: {
    html() {
      // Strip HTML tags instead of rendering them to prevent XSS
      return ''
    },
  },
})

export default async function HelpPage() {
  let html: string | null = null

  try {
    const guidePath = path.join(process.cwd(), 'NEW_FEATURES_GUIDE.md')
    const content = await fs.readFile(guidePath, 'utf-8')
    html = await marked.parse(content, { async: true })
  } catch (error) {
    return (
      <div className="container max-w-4xl py-8">
        <h1 className="text-2xl font-bold mb-4">Help Guide Not Found</h1>
        <p className="text-muted-foreground">
          The help documentation is currently unavailable. Please try again
          later.
        </p>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8 prose dark:prose-invert">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
