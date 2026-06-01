import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const {
    loadEnvFile,
    getFixtureBuildDependencies,
    getNpmInvocation,
    readIntegrationResult,
    readProbeResult,
    resolveIntegrationOptions,
    resolveProbeOptions,
} = require('../../dist/scripts/integration')

const tempDirs: string[] = []

const makeProject = (): string => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsf-integration-'))
    tempDirs.push(projectDir)
    fs.mkdirSync(path.join(projectDir, 'test/integration/fixtures'), { recursive: true })
    fs.writeFileSync(path.join(projectDir, 'test/integration/fixtures/smoke.dsa.ts'), 'action({}, function() {})\n')
    fs.writeFileSync(path.join(projectDir, 'DAZStudio.exe'), '')
    return projectDir
}

afterEach(() => {
    while (tempDirs.length > 0) {
        const dir = tempDirs.pop()
        if (dir) fs.rmSync(dir, { recursive: true, force: true })
    }
})

describe('integration env loader', () => {
    it('loads simple values without overriding existing values', () => {
        const projectDir = makeProject()
        const envPath = path.join(projectDir, '.env.integration.local')
        fs.writeFileSync(envPath, [
            '# local machine settings',
            'DAZ_STUDIO_EXE=/from/file/DAZStudio.exe',
            'DAZ_TEST_TIMEOUT_MS="12345"',
            'INVALID KEY=ignored',
            '',
        ].join('\n'))

        const env: Record<string, string> = {
            DAZ_STUDIO_EXE: '/from/shell/DAZStudio.exe',
        }

        expect(loadEnvFile(envPath, env)).toBe(true)
        expect(env.DAZ_STUDIO_EXE).toBe('/from/shell/DAZStudio.exe')
        expect(env.DAZ_TEST_TIMEOUT_MS).toBe('12345')
        expect(env['INVALID KEY']).toBeUndefined()
    })
})

describe('integration option resolution', () => {
    it('uses project-relative fixture and output defaults without requiring content', () => {
        const projectDir = makeProject()
        const options = resolveIntegrationOptions(projectDir, {
            fixture: './test/integration/fixtures/smoke.dsa.ts',
        }, {
            DAZ_STUDIO_EXE: path.join(projectDir, 'DAZStudio.exe'),
        })

        expect(options.fixturePath).toBe(path.join(projectDir, 'test/integration/fixtures/smoke.dsa.ts'))
        expect(options.outDir).toBe(path.join(projectDir, 'test/integration/out'))
        expect(options.fixtureRoot).toBe(path.join(projectDir, 'test/integration/out/fixture'))
        expect(options.resultPath).toBe(path.join(projectDir, 'test/integration/out/fixture/result.json'))
        expect(options.contentPath).toBe('')
    })

    it('requires content only when requested', () => {
        const projectDir = makeProject()

        expect(() => resolveIntegrationOptions(projectDir, {
            fixture: './test/integration/fixtures/smoke.dsa.ts',
            requireContent: true,
        }, {
            DAZ_STUDIO_EXE: path.join(projectDir, 'DAZStudio.exe'),
        })).toThrow(/DAZ_TEST_CONTENT_DUF/)
    })
})

describe('probe option resolution', () => {
    it('uses probe-specific env and output defaults', () => {
        const projectDir = makeProject()
        fs.mkdirSync(path.join(projectDir, 'probes/fixtures'), { recursive: true })
        fs.writeFileSync(path.join(projectDir, 'probes/fixtures/scene.dsa.ts'), 'action({}, function() {})\n')

        const options = resolveProbeOptions(projectDir, {
            fixture: './probes/fixtures/scene.dsa.ts',
        }, {
            DAZ_STUDIO_EXE: path.join(projectDir, 'DAZStudio.exe'),
            DAZ_PROBE_TIMEOUT_MS: '123456',
        })

        expect(options.envFile).toBe(path.join(projectDir, '.env.probe.local'))
        expect(options.outDir).toBe(path.join(projectDir, 'probes/out'))
        expect(options.fixtureRoot).toBe(path.join(projectDir, 'probes/out/fixture'))
        expect(options.resultPath).toBe(path.join(projectDir, 'probes/out/fixture/result.json'))
        expect(options.timeoutMs).toBe(123456)
        expect(options.commandName).toBe('probe')
    })
})

describe('integration command resolution', () => {
    it('exposes a no-content smoke integration command', () => {
        const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'))
        const script = packageJson.scripts['test:integration:smoke']

        expect(script).toContain('integration')
        expect(script).toContain('./test/integration/fixtures/framework-smoke.dsa.ts')
        expect(script).not.toContain('--require-content')
    })

    it('uses node plus npm-cli on Windows so child_process can spawn without a shell', () => {
        const invocation = getNpmInvocation(['--version'], 'win32')

        expect(invocation.command).toMatch(/node(\.exe)?$/i)
        expect(invocation.args[0]).toMatch(/npm-cli\.js$/)
        expect(invocation.args[1]).toBe('--version')
    })

    it('uses npm on non-Windows platforms', () => {
        expect(getNpmInvocation(['--version'], 'linux')).toEqual({
            command: 'npm',
            args: ['--version']
        })
    })
})

describe('integration fixture build dependencies', () => {
    it('includes webpack loader dependencies needed by generated fixture projects', () => {
        const dependencies = getFixtureBuildDependencies(path.resolve(__dirname, '../..'))

        expect(dependencies['babel-loader']).toBeTruthy()
        expect(dependencies['ts-loader']).toBeTruthy()
        expect(dependencies['webpack']).toBeTruthy()
        expect(dependencies['typescript']).toBeTruthy()
    })
})

describe('integration result reader', () => {
    it('accepts successful result JSON', () => {
        const projectDir = makeProject()
        const resultPath = path.join(projectDir, 'result.json')
        fs.writeFileSync(resultPath, JSON.stringify({ ok: true }))

        expect(readIntegrationResult(resultPath)).toEqual({ ok: true })
    })

    it('reports fixture failures', () => {
        const projectDir = makeProject()
        const resultPath = path.join(projectDir, 'result.json')
        fs.writeFileSync(resultPath, JSON.stringify({ ok: false, failures: ['bad frame'] }))

        expect(() => readIntegrationResult(resultPath)).toThrow(/bad frame/)
    })
})

describe('probe result reader', () => {
    it('accepts arbitrary readable probe JSON without ok assertions', () => {
        const projectDir = makeProject()
        const resultPath = path.join(projectDir, 'result.json')
        fs.writeFileSync(resultPath, JSON.stringify({
            kind: 'daz-headless-probe',
            status: 'inconclusive',
            observations: { interfaceAvailable: false }
        }))

        expect(readProbeResult(resultPath)).toEqual({
            kind: 'daz-headless-probe',
            status: 'inconclusive',
            observations: { interfaceAvailable: false }
        })
    })
})
