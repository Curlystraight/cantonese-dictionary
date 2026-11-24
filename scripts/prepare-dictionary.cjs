
const fs = require('fs')
const path = require('path')

// Input and output files
const inputPath = path.join(__dirname, '../data/cccanto-webdist.txt')
const outputPath = path.join(__dirname, '../data/cccanto-clean.csv')

// Read the original dictionary
const content = fs.readFileSync(inputPath, 'utf8')
const lines = content.split(/\r?\n/)

// CSV escaping
function escapeCsv(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

const rows = []
let skipped = 0
const skippedExamples = []


for (const line of lines) {
  const trimmed = line.trim()

  // Ignore blank lines and comments
  if (!trimmed || trimmed.startsWith('#')) continue

  // Extract the four fields we want
  const match = trimmed.match(
    /^(\S+)\s+(\S+)\s+\[[^\]]*\]\s+\{([^}]+)\}\s+\/(.*?)\/(?:\s+#.*)?$/
  )

  if (!match) {
    skipped++

    if (skippedExamples.length < 20) {
        skippedExamples.push(trimmed)
    }

    continue
  }

  const [, traditional, simplified, jyutping, english] = match

  rows.push([
    traditional,
    simplified,
    jyutping.trim(),
    english.trim(),
    'CC-Canto',
    '2017-02-02',
  ])
}

// Create CSV
const headers = [
  'traditional',
  'simplified',
  'jyutping',
  'english',
  'source',
  'source_version',
]

const csv = [
  headers.map(escapeCsv).join(','),
  ...rows.map(row => row.map(escapeCsv).join(',')),
].join('\n')

// Save the cleaned dictionary
fs.writeFileSync(outputPath, '\uFEFF' + csv, 'utf8')

console.log('Dictionary preparation complete!')
console.log(`Entries extracted: ${rows.length}`)
console.log(`Lines skipped: ${skipped}`)
console.log('First 20 skipped examples:')
console.log(skippedExamples.join('\n'))
console.log(`Output: ${outputPath}`)