import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..', '..')
const isWin = process.platform === 'win32'
const mvnCmd = isWin ? '.\\mvnw.cmd' : './mvnw'

console.log('Starting NER-Logix Backend & Frontend dev servers...')

const backend = spawn(mvnCmd, ['spring-boot:run'], {
  cwd: path.join(rootDir, 'backend'),
  stdio: 'inherit',
  shell: true
})

const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(rootDir, 'frontend'),
  stdio: 'inherit',
  shell: true
})

function cleanup() {
  console.log('Shutting down dev servers...')
  backend.kill()
  frontend.kill()
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
