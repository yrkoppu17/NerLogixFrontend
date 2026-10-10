import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..', '..')
const isWin = process.platform === 'win32'
const mvnCmd = isWin ? '.\\mvnw.cmd' : './mvnw'

console.log('=== NER-Logix Build ===')

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

try {
  console.log('Building frontend...')
  execSync('npm run build', { cwd: path.join(rootDir, 'frontend'), stdio: 'inherit' })

  const staticDir = path.join(rootDir, 'backend', 'src', 'main', 'resources', 'static')
  if (fs.existsSync(staticDir)) {
    fs.rmSync(staticDir, { recursive: true, force: true })
  }
  fs.mkdirSync(staticDir, { recursive: true })

  console.log('Copying frontend dist to backend static resources...')
  copyDirSync(path.join(rootDir, 'frontend', 'dist'), staticDir)

  console.log('Building backend JAR...')
  execSync(`${mvnCmd} -q -DskipTests clean package`, { cwd: path.join(rootDir, 'backend'), stdio: 'inherit' })

  console.log('Build completed successfully: backend/target/nerlogix.jar')
} catch (err) {
  console.error('Build failed:', err.message)
  process.exit(1)
}
