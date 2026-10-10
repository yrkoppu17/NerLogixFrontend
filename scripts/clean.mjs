import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..', '..')

function cleanDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true })
    console.log(`Cleaned: ${dirPath}`)
  }
}

const dataDir = path.join(rootDir, 'data')
if (fs.existsSync(dataDir)) {
  const items = fs.readdirSync(dataDir)
  for (const item of items) {
    if (item.startsWith('verify_')) {
      cleanDir(path.join(dataDir, item))
    }
  }
}

cleanDir(path.join(rootDir, 'frontend', 'dist'))
cleanDir(path.join(rootDir, 'backend', 'target'))
cleanDir(path.join(rootDir, 'backend', 'src', 'main', 'resources', 'static'))
cleanDir(path.join(rootDir, 'playwright-report'))
cleanDir(path.join(rootDir, 'test-results'))

console.log('Clean complete.')
