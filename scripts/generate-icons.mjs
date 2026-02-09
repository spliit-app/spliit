import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const publicDir = path.resolve(repoRoot, 'public')
const sourcePath = path.resolve(publicDir, 'spliit_forked_icon.png')
const sourceWithTextPath = path.resolve(
    publicDir,
    'spliit_forked_icon_with_text.png',
)

if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing source image at ${sourcePath}`)
}

if (!fs.existsSync(sourceWithTextPath)) {
    throw new Error(`Missing source image at ${sourceWithTextPath}`)
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
moveIfExists(path.resolve(publicDir, 'logo-with-text_.png'))
moveIfExists(path.resolve(publicDir, 'logo.svg'))
moveIfExists(path.resolve(publicDir, 'apple-touch-icon.png'))

fs.mkdirSync(logoDir, { recursive: true })

const tempDir = path.resolve(repoRoot, '.tmp', 'icon-gen')
fs.rmSync(tempDir, { recursive: true, force: true })
fs.mkdirSync(tempDir, { recursive: true })

const localBin = path.resolve(repoRoot, 'node_modules', '.bin', 'pwa-asset-generator')
const cmd = fs.existsSync(localBin) ? localBin : 'npx'
const args = fs.existsSync(localBin)
    ? [sourcePath, tempDir, '--icon-only', '--type', 'png', '--padding', '0', '--background', '#ffffff', '--maskable']
    : ['pwa-asset-generator', sourcePath, tempDir, '--icon-only', '--type', 'png', '--padding', '0', '--background', '#ffffff', '--maskable']

try {
    execFileSync(cmd, args, { stdio: 'inherit' })
} catch (error) {
    console.warn('[generate-icons] pwa-asset-generator failed, using sharp fallback.')
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

fs.copyFileSync(path.resolve(logoDir, '192x192.png'), path.resolve(publicDir, 'android-chrome-192x192.png'))
fs.copyFileSync(path.resolve(logoDir, '512x512.png'), path.resolve(publicDir, 'android-chrome-512x512.png'))

const appleIcon = findIconBySize(180) ?? findIconBySize(192)
const appleTarget = path.resolve(publicDir, 'apple-touch-icon.png')
if (appleIcon) {
    fs.copyFileSync(path.resolve(tempDir, appleIcon), appleTarget)
} else {
    await ensurePng(192, appleTarget)
}

fs.copyFileSync(
    sourceWithTextPath,
    path.resolve(publicDir, 'logo-with-text.png'),
)
fs.copyFileSync(
    sourceWithTextPath,
    path.resolve(publicDir, 'logo-with-text_.png'),
)

const svgPngBuffer = await sharp(sourcePath)
    .resize(512, 512)
    .png()
    .toBuffer()
const svgBase64 = svgPngBuffer.toString('base64')
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><image href="data:image/png;base64,${svgBase64}" width="512" height="512"/></svg>`
fs.writeFileSync(path.resolve(publicDir, 'logo.svg'), svgContent, 'utf8')

fs.rmSync(tempDir, { recursive: true, force: true })

console.log(`Icons generated. Archived old assets in ${archiveRoot}`)
