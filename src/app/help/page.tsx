// src/app/help/page.tsx
import fs from 'fs'
import path from 'path'
import { marked } from 'marked' // npm install marked

export default async function HelpPage() {
  const guidePath = path.join(process.cwd(), 'NEW_FEATURES_GUIDE.md')
  const content = fs.readFileSync(guidePath, 'utf-8')
  const html = marked(content)
  
  return (
    <div className="container max-w-4xl py-8 prose dark:prose-invert">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}