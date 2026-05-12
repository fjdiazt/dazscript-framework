import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const { generateInstallerFiles } = require('../../dist/scripts/install-generator')

const tempDirs: string[] = []

const makeProject = (): string => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsf-install-generator-'))
    tempDirs.push(projectDir)
    fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true })
    fs.writeFileSync(
        path.join(projectDir, 'dazscript.config.cjs'),
        "module.exports = { appDataPath: 'Test/ActionIcons' }\n"
    )
    return projectDir
}

const writeScript = (projectDir: string, name: string, actionOptions: string = ''): void => {
    fs.writeFileSync(
        path.join(projectDir, 'src', `${name}.dsa.ts`),
        `action({ text: '${name}'${actionOptions} }, function() {})\n`
    )
}

const writePng = (projectDir: string, fileName: string): void => {
    fs.writeFileSync(path.join(projectDir, 'src', fileName), 'png')
}

const generateSetup = (projectDir: string): string => {
    const previousCwd = process.cwd()
    process.chdir(projectDir)
    try {
        generateInstallerFiles(projectDir, {
            scriptsPath: './src',
            defaultMenuPath: '/Test',
            appDataPath: undefined,
        })
    } finally {
        process.chdir(previousCwd)
    }
    return fs.readFileSync(path.join(projectDir, 'src', 'Setup.dsa.ts'), 'utf8')
}

afterEach(() => {
    while (tempDirs.length > 0) {
        const dir = tempDirs.pop()
        if (dir) fs.rmSync(dir, { recursive: true, force: true })
    }
})

describe('install generator action icons', () => {
    it('prefers the action icon convention over the script icon fallback', () => {
        const projectDir = makeProject()
        writeScript(projectDir, 'render-tools')
        writePng(projectDir, 'render-tools.action.png')
        writePng(projectDir, 'render-tools.png')
        writePng(projectDir, 'render-tools.dsa.png')

        const setup = generateSetup(projectDir)

        expect(setup).toContain('"icon": "./render-tools.action.png"')
        expect(setup).not.toContain('"icon": "./render-tools.png"')
        expect(setup).not.toContain('"icon": "./render-tools.dsa.png"')
    })

    it('falls back to the script icon when no action icon exists', () => {
        const projectDir = makeProject()
        writeScript(projectDir, 'power-menu')
        writePng(projectDir, 'power-menu.png')
        writePng(projectDir, 'power-menu.dsa.png')

        const setup = generateSetup(projectDir)

        expect(setup).toContain('"icon": "./power-menu.png"')
        expect(setup).not.toContain('"icon": "./power-menu.dsa.png"')
    })

    it('keeps the dsa-named script icon as a legacy fallback', () => {
        const projectDir = makeProject()
        writeScript(projectDir, 'legacy-icon')
        writePng(projectDir, 'legacy-icon.dsa.png')

        const setup = generateSetup(projectDir)

        expect(setup).toContain('"icon": "./legacy-icon.dsa.png"')
    })

    it('lets explicit action icon metadata override discovered icon files', () => {
        const projectDir = makeProject()
        writeScript(projectDir, 'custom-icon', ", icon: 'icons/custom-action.png'")
        writePng(projectDir, 'custom-icon.action.png')
        writePng(projectDir, 'custom-icon.png')
        writePng(projectDir, 'custom-icon.dsa.png')

        const setup = generateSetup(projectDir)

        expect(setup).toContain('"icon": "icons/custom-action.png"')
        expect(setup).not.toContain('"icon": "custom-icon.action.png"')
        expect(setup).not.toContain('"icon": "custom-icon.png"')
        expect(setup).not.toContain('"icon": "custom-icon.dsa.png"')
    })
})
