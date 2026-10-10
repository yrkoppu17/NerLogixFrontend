import { execSync, spawn } from 'child_process'
import http from 'http'
import net from 'net'
import path from 'path'
import fs from 'fs'

import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..', '..')

async function findFreePort() {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.listen(0, () => {
      const port = server.address().port
      server.close(() => resolve(port))
    })
  })
}

async function waitForHealth(port, maxTries = 60) {
  for (let i = 0; i < maxTries; i++) {
    try {
      const res = await new Promise((resolve, reject) => {
        http.get(`http://localhost:${port}/api/health`, (response) => {
          let data = ''
          response.on('data', chunk => data += chunk)
          response.on('end', () => resolve({ statusCode: response.statusCode, data }))
        }).on('error', reject)
      })

      if (res.statusCode === 200 && res.data.includes('"status":"UP"')) {
        return true
      }
    } catch {
      // ignore, retry
    }
    await new Promise(r => setTimeout(r, 1000))
  }
  return false
}

async function runVerify() {
  console.log('=== NER-Logix Verification ===')

  console.log('1. Running check script...')
  execSync(`node "${path.join(__dirname, 'check.mjs')}"`, { stdio: 'inherit' })
  console.log('Check passed.')

  console.log('2. Building application...')
  execSync(`node "${path.join(__dirname, 'build.mjs')}"`, { stdio: 'inherit' })
  console.log('Build passed.')

  const port = await findFreePort()
  const jarPath = path.join(rootDir, 'backend', 'target', 'nerlogix.jar')
  
  if (!fs.existsSync(jarPath)) {
    console.error('FAIL: Built jar file not found at', jarPath)
    process.exit(1)
  }

  console.log(`3. Starting server on port ${port}...`)
  const tempDbDir = path.join(rootDir, 'backend', 'data', `verify_${Date.now()}`)
  const appProc = spawn('java', [
    `-Dserver.port=${port}`,
    `-Dspring.datasource.url=jdbc:h2:file:${tempDbDir}/db;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH`,
    '-jar',
    jarPath
  ], { stdio: 'pipe' })

  let appLogs = ''
  appProc.stdout.on('data', chunk => appLogs += chunk)
  appProc.stderr.on('data', chunk => appLogs += chunk)

  function stopAppProc() {
    console.log('Stopping server...')
    if (process.platform === 'win32') {
      try {
        execSync(`taskkill /F /PID ${appProc.pid} /T`, { stdio: 'ignore' })
      } catch {}
    } else {
      appProc.kill('SIGKILL')
    }
  }

  const isUp = await waitForHealth(port)
  if (!isUp) {
    console.error('FAIL: Server failed to start or health check timed out.')
    console.error('Server logs:\n', appLogs.slice(-2000))
    stopAppProc()
    process.exit(1)
  }
  console.log('Server is healthy on port', port)

  console.log('4. Running Playwright E2E tests...')
  try {
    execSync(`npx playwright test`, {
      cwd: path.join(rootDir, 'frontend'),
      env: { ...process.env, BASE_URL: `http://localhost:${port}` },
      stdio: 'inherit'
    })
    console.log('E2E tests passed.')
  } catch (err) {
    console.error('FAIL: Playwright tests failed.')
    stopAppProc()
    process.exit(1)
  } finally {
    stopAppProc()
    try {
      fs.rmSync(tempDbDir, { recursive: true, force: true })
    } catch {}
  }

  console.log('=== ALL VERIFICATIONS PASSED ===')
}

runVerify().catch(err => {
  console.error('Verification error:', err)
  process.exit(1)
})
