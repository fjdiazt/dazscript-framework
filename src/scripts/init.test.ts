import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const { initIntegrationTests, initProbes, initUnitTests } = require('../../dist/scripts/init')

const tempDirs: string[] = []

const makeProject = (name = 'toolbox-test'): string => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`))
    tempDirs.push(projectDir)
    fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({
        private: true,
        scripts: {
            test: 'vitest run',
        },
    }, null, 2))
    return projectDir
}

const toFixtureName = (projectDir: string): string =>
    path.basename(projectDir)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'project'

afterEach(() => {
    while (tempDirs.length > 0) {
        const dir = tempDirs.pop()
        if (dir) fs.rmSync(dir, { recursive: true, force: true })
    }
})

describe('init integration tests', () => {
    it('creates the fixture, docs, env examples, npm script, and ignore entries', () => {
        const projectDir = makeProject('toolbox-test')
        const fixtureBaseName = toFixtureName(projectDir)

        initIntegrationTests(projectDir, { force: false })

        const fixturePath = path.join(projectDir, `test/integration/fixtures/${fixtureBaseName}-smoke.dsa.ts`)
        const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'))
        const gitignore = fs.readFileSync(path.join(projectDir, '.gitignore'), 'utf8')

        expect(fs.existsSync(fixturePath)).toBe(true)
        expect(fs.existsSync(path.join(projectDir, 'test/integration/README.md'))).toBe(true)
        expect(fs.existsSync(path.join(projectDir, '.env.integration.linux.example'))).toBe(true)
        expect(fs.existsSync(path.join(projectDir, '.env.integration.windows.example'))).toBe(true)
        expect(packageJson.scripts['test:integration']).toBe(
            `dazscript integration --fixture ./test/integration/fixtures/${fixtureBaseName}-smoke.dsa.ts`
        )
        expect(gitignore).toContain('test/integration/out/')
        expect(gitignore).toContain('.env.integration.local')
    })

    it('does not replace an existing integration script or duplicate ignore entries', () => {
        const projectDir = makeProject('existing-test')
        const packageJsonPath = path.join(projectDir, 'package.json')
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
        packageJson.scripts['test:integration'] = 'custom command'
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
        fs.writeFileSync(path.join(projectDir, '.gitignore'), 'test/integration/out/\n')

        initIntegrationTests(projectDir, { force: false })
        initIntegrationTests(projectDir, { force: false })

        const updatedPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
        const gitignore = fs.readFileSync(path.join(projectDir, '.gitignore'), 'utf8')

        expect(updatedPackageJson.scripts['test:integration']).toBe('custom command')
        expect(gitignore.match(/test\/integration\/out\//g)?.length).toBe(1)
        expect(gitignore.match(/\.env\.integration\.local/g)?.length).toBe(1)
    })
})

describe('init probes', () => {
    it('creates the probe fixture, docs, env examples, npm script, and ignore entries', () => {
        const projectDir = makeProject('probe-test')
        const fixtureBaseName = toFixtureName(projectDir)

        initProbes(projectDir, { force: false })

        const fixturePath = path.join(projectDir, `probes/fixtures/${fixtureBaseName}-scene.dsa.ts`)
        const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'))
        const gitignore = fs.readFileSync(path.join(projectDir, '.gitignore'), 'utf8')

        expect(fs.existsSync(fixturePath)).toBe(true)
        expect(fs.existsSync(path.join(projectDir, 'probes/README.md'))).toBe(true)
        expect(fs.existsSync(path.join(projectDir, '.env.probe.linux.example'))).toBe(true)
        expect(fs.existsSync(path.join(projectDir, '.env.probe.windows.example'))).toBe(true)
        expect(packageJson.scripts.probe).toBe(
            `dazscript probe --fixture ./probes/fixtures/${fixtureBaseName}-scene.dsa.ts`
        )
        expect(gitignore).toContain('probes/out/')
        expect(gitignore).toContain('.env.probe.local')
    })

    it('does not replace an existing probe script or duplicate ignore entries', () => {
        const projectDir = makeProject('existing-probe')
        const packageJsonPath = path.join(projectDir, 'package.json')
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
        packageJson.scripts.probe = 'custom probe'
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
        fs.writeFileSync(path.join(projectDir, '.gitignore'), 'probes/out/\n')

        initProbes(projectDir, { force: false })
        initProbes(projectDir, { force: false })

        const updatedPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
        const gitignore = fs.readFileSync(path.join(projectDir, '.gitignore'), 'utf8')

        expect(updatedPackageJson.scripts.probe).toBe('custom probe')
        expect(gitignore.match(/probes\/out\//g)?.length).toBe(1)
        expect(gitignore.match(/\.env\.probe\.local/g)?.length).toBe(1)
    })
})

describe('init unit tests', () => {
    it('creates Vitest config, sample test, docs, npm scripts, and dev dependency', () => {
        const projectDir = makeProject('unit-test')
        const packageJsonPath = path.join(projectDir, 'package.json')
        const initialPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
        delete initialPackageJson.scripts.test
        fs.writeFileSync(packageJsonPath, JSON.stringify(initialPackageJson, null, 2))

        initUnitTests(projectDir, { force: false })

        const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'))

        expect(fs.existsSync(path.join(projectDir, 'vitest.config.ts'))).toBe(true)
        expect(fs.existsSync(path.join(projectDir, 'tsconfig.test.json'))).toBe(true)
        expect(fs.existsSync(path.join(projectDir, 'test/unit/smoke.test.ts'))).toBe(true)
        expect(fs.existsSync(path.join(projectDir, 'test/unit/README.md'))).toBe(true)
        expect(packageJson.scripts.test).toBe('vitest run')
        expect(packageJson.scripts['test:watch']).toBe('vitest')
        expect(packageJson.devDependencies.vitest).toBe('^3.0.0')
    })

    it('does not replace existing unit test scripts or duplicate Vitest dependency', () => {
        const projectDir = makeProject('existing-unit-test')
        const packageJsonPath = path.join(projectDir, 'package.json')
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
        packageJson.scripts.test = 'custom test'
        packageJson.scripts['test:watch'] = 'custom watch'
        packageJson.devDependencies = {
            vitest: '^4.0.0',
        }
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))

        initUnitTests(projectDir, { force: false })

        const updatedPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

        expect(updatedPackageJson.scripts.test).toBe('custom test')
        expect(updatedPackageJson.scripts['test:watch']).toBe('custom watch')
        expect(updatedPackageJson.devDependencies.vitest).toBe('^4.0.0')
    })

    it('replaces the default npm init failing test script', () => {
        const projectDir = makeProject('npm-default-unit-test')
        const packageJsonPath = path.join(projectDir, 'package.json')
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
        packageJson.scripts.test = 'echo "Error: no test specified" && exit 1'
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))

        initUnitTests(projectDir, { force: false })

        const updatedPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

        expect(updatedPackageJson.scripts.test).toBe('vitest run')
    })
})
