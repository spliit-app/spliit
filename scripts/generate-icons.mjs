import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const publicDir = path.resolve(repoRoot, 'public')
const appDir = path.resolve(repoRoot, 'src', 'app')
const sourcePath = path.resolve(publicDir, 'new logo.png')
const generatedSourcePath = path.resolve(publicDir, 'spliit_forked_icon.png')
const generatedSourceWithTextPath = path.resolve(
  publicDir,
  'spliit_forked_icon_with_text.png',
)
const generatedSourceWithTextDarkPath = path.resolve(
  publicDir,
  'spliit_forked_icon_with_text_dark.png',
)

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Missing source image at ${sourcePath}`)
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const archiveRoot = path.resolve(publicDir, 'logo-archive', stamp)
fs.mkdirSync(archiveRoot, { recursive: true })

const moveIfExists = (targetPath) => {
  if (!fs.existsSync(targetPath)) return
  const targetName = path.basename(targetPath)
  fs.renameSync(targetPath, path.resolve(archiveRoot, targetName))
}

const logoDir = path.resolve(publicDir, 'logo')
if (fs.existsSync(logoDir)) {
  fs.renameSync(logoDir, path.resolve(archiveRoot, 'logo'))
}

moveIfExists(path.resolve(publicDir, 'android-chrome-192x192.png'))
moveIfExists(path.resolve(publicDir, 'android-chrome-512x512.png'))
moveIfExists(path.resolve(publicDir, 'logo-with-text.png'))
moveIfExists(path.resolve(publicDir, 'logo-with-text-dark.png'))
moveIfExists(path.resolve(publicDir, 'logo-with-text_.png'))
moveIfExists(path.resolve(publicDir, 'logo.svg'))
moveIfExists(path.resolve(publicDir, 'apple-touch-icon.png'))
moveIfExists(generatedSourcePath)
moveIfExists(generatedSourceWithTextPath)
moveIfExists(generatedSourceWithTextDarkPath)

const appArchiveRoot = path.resolve(archiveRoot, 'src-app')
fs.mkdirSync(appArchiveRoot, { recursive: true })
const moveAppIfExists = (targetPath) => {
  if (!fs.existsSync(targetPath)) return
  const targetName = path.basename(targetPath)
  fs.renameSync(targetPath, path.resolve(appArchiveRoot, targetName))
}

moveAppIfExists(path.resolve(appDir, 'apple-icon.png'))
moveAppIfExists(path.resolve(appDir, 'favicon.ico'))
moveAppIfExists(path.resolve(appDir, 'icon.svg'))

fs.mkdirSync(logoDir, { recursive: true })

const tempDir = path.resolve(repoRoot, '.tmp', 'icon-gen')
fs.rmSync(tempDir, { recursive: true, force: true })
fs.mkdirSync(tempDir, { recursive: true })

const localBin = path.resolve(
  repoRoot,
  'node_modules',
  '.bin',
  'pwa-asset-generator',
)
const cmd = fs.existsSync(localBin) ? localBin : 'npx'
const args = fs.existsSync(localBin)
  ? [
      sourcePath,
      tempDir,
      '--icon-only',
      '--type',
      'png',
      '--padding',
      '0',
      '--background',
      '#ffffff',
      '--maskable',
    ]
  : [
      'pwa-asset-generator',
      sourcePath,
      tempDir,
      '--icon-only',
      '--type',
      'png',
      '--padding',
      '0',
      '--background',
      '#ffffff',
      '--maskable',
    ]

try {
  execFileSync(cmd, args, { stdio: 'inherit' })
} catch (error) {
  console.warn(
    '[generate-icons] pwa-asset-generator failed, using sharp fallback.',
  )
}

const generatedFiles = fs.existsSync(tempDir) ? fs.readdirSync(tempDir) : []
const findIconBySize = (size, { maskable = false } = {}) => {
  const sizePattern = new RegExp(`${size}x${size}`)
  return generatedFiles.find((file) => {
    if (!sizePattern.test(file)) return false
    if (maskable) return file.includes('maskable')
    return !file.includes('maskable')
  })
}

const ensurePng = async (size, destPath) => {
  await sharp(sourcePath).resize(size, size).png().toFile(destPath)
}

const targetSizes = [48, 64, 128, 144, 192, 256, 512]
for (const size of targetSizes) {
  const generated = findIconBySize(size)
  const destPath = path.resolve(logoDir, `${size}x${size}.png`)
  if (generated) {
    fs.copyFileSync(path.resolve(tempDir, generated), destPath)
  } else {
    await ensurePng(size, destPath)
  }
}

const maskableGenerated = findIconBySize(512, { maskable: true })
const maskableTarget = path.resolve(logoDir, '512x512-maskable.png')
if (maskableGenerated) {
  fs.copyFileSync(path.resolve(tempDir, maskableGenerated), maskableTarget)
} else {
  await ensurePng(512, maskableTarget)
}

fs.copyFileSync(
  path.resolve(logoDir, '192x192.png'),
  path.resolve(publicDir, 'android-chrome-192x192.png'),
)
fs.copyFileSync(
  path.resolve(logoDir, '512x512.png'),
  path.resolve(publicDir, 'android-chrome-512x512.png'),
)
fs.copyFileSync(sourcePath, generatedSourcePath)

const appleIcon = findIconBySize(180) ?? findIconBySize(192)
const appleTarget = path.resolve(publicDir, 'apple-touch-icon.png')
if (appleIcon) {
  fs.copyFileSync(path.resolve(tempDir, appleIcon), appleTarget)
} else {
  await ensurePng(192, appleTarget)
}

const createHeaderLogo = async (destPath, { textColor }) => {
  const width = 522
  const height = 180
  const iconSize = 150
  const iconLeft = 16
  const iconTop = Math.round((height - iconSize) / 2)
  const textSvg = Buffer.from(`
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            <style>
                .wordmark {
                    font-family: ui-rounded, "Arial Rounded MT Bold", "Inter", "Arial", sans-serif;
                    font-size: 88px;
                    font-weight: 800;
                    letter-spacing: 0;
                    fill: ${textColor};
                }
            </style>
            <text class="wordmark" x="190" y="117">Spliit</text>
        </svg>
    `)
  const icon = await sharp(sourcePath)
    .resize(iconSize, iconSize, { fit: 'contain' })
    .png()
    .toBuffer()
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite([
      { input: icon, left: iconLeft, top: iconTop },
      { input: textSvg, left: 0, top: 0 },
    ])
    .png()
    .toFile(destPath)
}

await createHeaderLogo(generatedSourceWithTextPath, { textColor: '#047857' })
await createHeaderLogo(generatedSourceWithTextDarkPath, {
  textColor: '#f8fafc',
})
fs.copyFileSync(
  generatedSourceWithTextPath,
  path.resolve(publicDir, 'logo-with-text.png'),
)
fs.copyFileSync(
  generatedSourceWithTextDarkPath,
  path.resolve(publicDir, 'logo-with-text-dark.png'),
)
fs.copyFileSync(
  generatedSourceWithTextPath,
  path.resolve(publicDir, 'logo-with-text_.png'),
)

const svgPngBuffer = await sharp(sourcePath).resize(512, 512).png().toBuffer()
const svgBase64 = svgPngBuffer.toString('base64')
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><image href="data:image/png;base64,${svgBase64}" width="512" height="512"/></svg>`
fs.writeFileSync(path.resolve(publicDir, 'logo.svg'), svgContent, 'utf8')
fs.writeFileSync(path.resolve(appDir, 'icon.svg'), svgContent, 'utf8')
await sharp(sourcePath)
  .resize(512, 512)
  .png()
  .toFile(path.resolve(appDir, 'apple-icon.png'))

const createIco = async (destPath) => {
  const sizes = [16, 32, 48]
  const pngBuffers = await Promise.all(
    sizes.map((size) =>
      sharp(sourcePath).resize(size, size).ensureAlpha().png().toBuffer(),
    ),
  )
  const headerSize = 6
  const directorySize = 16 * sizes.length
  let offset = headerSize + directorySize
  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(sizes.length, 4)

  const entries = pngBuffers.map((pngBuffer, index) => {
    const size = sizes[index]
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size === 256 ? 0 : size, 0)
    entry.writeUInt8(size === 256 ? 0 : size, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(pngBuffer.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += pngBuffer.length
    return entry
  })

  fs.writeFileSync(destPath, Buffer.concat([header, ...entries, ...pngBuffers]))
}

await createIco(path.resolve(appDir, 'favicon.ico'))

fs.writeFileSync(
  path.resolve(archiveRoot, 'RESTORE.md'),
  `# Logo Asset Restore Point

This folder contains the logo and app icon assets that were replaced by \`npm run generate-icons\`.

To manually revert this logo change from the repository root:

\`\`\`bash
cp -R ${path.relative(repoRoot, path.resolve(archiveRoot, 'logo'))} public/logo
cp ${path.relative(repoRoot, path.resolve(archiveRoot, 'android-chrome-192x192.png'))} public/android-chrome-192x192.png
cp ${path.relative(repoRoot, path.resolve(archiveRoot, 'android-chrome-512x512.png'))} public/android-chrome-512x512.png
cp ${path.relative(repoRoot, path.resolve(archiveRoot, 'apple-touch-icon.png'))} public/apple-touch-icon.png
cp ${path.relative(repoRoot, path.resolve(archiveRoot, 'logo-with-text.png'))} public/logo-with-text.png
rm -f public/logo-with-text-dark.png public/spliit_forked_icon_with_text_dark.png
cp ${path.relative(repoRoot, path.resolve(archiveRoot, 'logo.svg'))} public/logo.svg
cp ${path.relative(repoRoot, path.resolve(archiveRoot, 'spliit_forked_icon.png'))} public/spliit_forked_icon.png
cp ${path.relative(repoRoot, path.resolve(archiveRoot, 'spliit_forked_icon_with_text.png'))} public/spliit_forked_icon_with_text.png
cp ${path.relative(repoRoot, path.resolve(appArchiveRoot, 'apple-icon.png'))} src/app/apple-icon.png
cp ${path.relative(repoRoot, path.resolve(appArchiveRoot, 'favicon.ico'))} src/app/favicon.ico
cp ${path.relative(repoRoot, path.resolve(appArchiveRoot, 'icon.svg'))} src/app/icon.svg
\`\`\`
`,
  'utf8',
)

fs.rmSync(tempDir, { recursive: true, force: true })

const nextCacheDir = path.resolve(repoRoot, '.next')
fs.rmSync(nextCacheDir, { recursive: true, force: true })

console.log(`Icons generated. Archived old assets in ${archiveRoot}`)
console.log('[generate-icons] Cleared .next cache to refresh image assets.')
