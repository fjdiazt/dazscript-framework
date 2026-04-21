const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const source = path.join(repoRoot, 'scripts', 'pre-push')
const gitDir = path.join(repoRoot, '.git')
const hooksDir = path.join(gitDir, 'hooks')
const target = path.join(hooksDir, 'pre-push')

if (!fs.existsSync(gitDir) || !fs.statSync(gitDir).isDirectory()) {
  process.exit(0)
}

fs.mkdirSync(hooksDir, { recursive: true })
fs.copyFileSync(source, target)

try {
  fs.chmodSync(target, 0o755)
} catch (error) {
  // Windows does not need POSIX execute bits for git hook execution.
}
