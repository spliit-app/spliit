// Find keys in non-English files that still have English content
const fs = require('fs')
const path = require('path')

const dir = path.join(__dirname, '../messages')
const en = JSON.parse(fs.readFileSync(path.join(dir, 'en-US.json'), 'utf8'))

function flattenEntries(obj, prefix) {
    prefix = prefix || ''
    const entries = []
    for (const k of Object.keys(obj)) {
        const full = prefix ? prefix + '.' + k : k
        const v = obj[k]
        if (typeof v === 'object' && v !== null) {
            const sub = flattenEntries(v, full)
            for (const s of sub) entries.push(s)
        } else {
            entries.push([full, v])
        }
    }
    return entries
}

const enEntries = flattenEntries(en)
const enMap = {}
for (const [k, v] of enEntries) enMap[k] = v

const files = fs.readdirSync(dir).filter(function (f) {
    return f.endsWith('.json') && f !== 'en-US.json'
})

// Some values are expected to be identical across locales (brand names, etc.).
// Add patterns here to avoid noisy false positives.
const ignoredKeyPatterns = [/\.github$/]
const ignoredValues = new Set(['GitHub'])

for (const file of files) {
    const other = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
    const otherEntries = flattenEntries(other)
    const otherMap = {}
    for (const [k, v] of otherEntries) otherMap[k] = v

    const englishContent = []
    for (const [k, enVal] of Object.entries(enMap)) {
        if (ignoredKeyPatterns.some((re) => re.test(k))) continue
        if (ignoredValues.has(enVal)) continue
        if (Object.prototype.hasOwnProperty.call(otherMap, k) && otherMap[k] === enVal) {
            englishContent.push(k + ' = ' + JSON.stringify(enVal))
        }
    }
    if (englishContent.length > 0) {
        console.log(file + ': ' + englishContent.length + ' keys with English content')
        for (const e of englishContent) {
            console.log('  ' + e)
        }
    }
}
