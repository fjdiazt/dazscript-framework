import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { expect, it } from 'vitest'

const { runWebpack } = require('../../dist/scripts/build')

it('preserves existing implementations when building a different action', async () => {
    const tempRoot = fs.realpathSync(os.tmpdir())
    const project = fs.mkdtempSync(path.join(tempRoot, 'dsf-launchers-'))
    try {
        fs.mkdirSync(path.join(project, 'src', 'actions'), { recursive: true })
        fs.writeFileSync(path.join(project, 'dazscript.config.cjs'), "module.exports = { appDataPath: 'Test/Launchers' }")
        fs.writeFileSync(path.join(project, 'tsconfig.json'), JSON.stringify({ include: ['src/**/*.ts'] }))
        for (const name of ['first', 'second']) {
            fs.writeFileSync(path.join(project, 'src', 'actions', `${name}.dsa.ts`), [
                'declare function action(options: { text: string }, run: () => void): void',
                `action({ text: '${name}' }, function () {})`,
            ].join('\n'))
        }

        await runWebpack(project, { file: 'actions/first' })
        const marker = '// Auto-generated launcher shim.'
        const launcher = path.join(project, 'out', 'actions', 'first.dsa')
        const implementation = path.join(project, 'out', 'actions', 'lib', 'first', 'first.dsa')
        const firstLauncher = fs.readFileSync(launcher, 'utf8')
        const firstImplementation = fs.readFileSync(implementation, 'utf8')
        expect(firstLauncher).toContain(marker)
        expect(firstImplementation).not.toContain(marker)

        await runWebpack(project, { file: 'actions/second' })

        expect(fs.readFileSync(launcher, 'utf8')).toBe(firstLauncher)
        expect(fs.readFileSync(implementation, 'utf8')).toBe(firstImplementation)
        expect(fs.readFileSync(path.join(project, 'out', 'actions', 'second.dsa'), 'utf8')).toContain(marker)
        expect(fs.readFileSync(path.join(project, 'out', 'actions', 'lib', 'second', 'second.dsa'), 'utf8')).not.toContain(marker)
    } finally {
        if (path.dirname(fs.realpathSync(project)) === tempRoot) fs.rmSync(project, { recursive: true, force: true })
    }
}, 20_000)
