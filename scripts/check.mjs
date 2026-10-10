import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..', '..')

function runStep(name, cmd, cwd) {
  process.stdout.write(`Running ${name}... `)
  try {
    execSync(cmd, { cwd: cwd || rootDir, stdio: 'pipe', encoding: 'utf-8' })
    console.log('OK')
  } catch (err) {
    console.log('FAILED')
    const output = (err.stdout || '') + '\n' + (err.stderr || '')
    const firstLine = output.trim().split('\n').filter(l => l.includes('ERROR') || l.includes('Error') || l.includes('failed') || l.includes('FAIL')).slice(0, 10).join('\n') || output.slice(0, 1000)
    console.error(`\n[${name} Error]\n${firstLine}\n`)
    process.exit(1)
  }
}

const isWin = process.platform === 'win32'
const mvnCmd = isWin ? '.\\mvnw.cmd' : './mvnw'

console.log('=== NER-Logix Check ===')
runStep('Backend compile & tests', `${mvnCmd} -q test`, path.join(rootDir, 'backend'))
runStep('Frontend typecheck', 'npm run typecheck', path.join(rootDir, 'frontend'))
runStep('Frontend lint', 'npm run lint', path.join(rootDir, 'frontend'))
runStep('Frontend tests', 'npm test -- --run', path.join(rootDir, 'frontend'))
console.log('All checks passed!')
