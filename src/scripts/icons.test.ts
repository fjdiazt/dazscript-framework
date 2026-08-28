import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, expect, it } from 'vitest'

const { copyIcons } = require('../../dist/scripts/icons')

const tempDirs: string[] = []

const makeProject = (): string => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsf-icons-'))
    tempDirs.push(projectDir)
    fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true })
    return projectDir
}

afterEach(() => {
    while (tempDirs.length > 0) {
        fs.rmSync(tempDirs.pop()!, { recursive: true, force: true })
    }
})

it('copies a legacy dsa icon under the preferred output name', () => {
    const projectDir = makeProject()
    fs.writeFileSync(path.join(projectDir, 'src', 'Power Menu Favorite Actions.dsa.png'), 'legacy icon')

    copyIcons(projectDir, { outDir: './out' })

    expect(fs.readFileSync(path.join(projectDir, 'out', 'Power Menu Favorite Actions.png'), 'utf8')).toBe('legacy icon')
    expect(fs.existsSync(path.join(projectDir, 'out', 'Power Menu Favorite Actions.dsa.png'))).toBe(false)
})

it('copies a declared asset from the project root into a nested output directory', () => {
    const projectDir = makeProject()
    fs.mkdirSync(path.join(projectDir, 'publishing', 'manual'), { recursive: true })
    fs.writeFileSync(path.join(projectDir, 'publishing', 'manual', 'User Manual.pdf'), 'completed pdf')

    copyIcons(projectDir, {
        outDir: './build',
        assets: [{ from: './publishing/manual/User Manual.pdf', to: 'docs/User Manual.pdf' }],
    })

    expect(fs.readFileSync(path.join(projectDir, 'build', 'docs', 'User Manual.pdf'), 'utf8')).toBe('completed pdf')
})

it('fails clearly when a declared asset is missing', () => {
    const projectDir = makeProject()

    expect(() => copyIcons(projectDir, {
        outDir: './out',
        assets: [{ from: './publishing/manual/User Manual.pdf', to: 'User Manual.pdf' }],
    })).toThrow('[dazscript assets] Required asset not found: ./publishing/manual/User Manual.pdf')
})

it.each([
    [{ from: '../User Manual.pdf', to: 'User Manual.pdf' }, 'from'],
    [{ from: './User Manual.pdf', to: '../User Manual.pdf' }, 'to'],
])('rejects an asset %s path outside its allowed root', (asset, field) => {
    const projectDir = makeProject()

    expect(() => copyIcons(projectDir, { outDir: './out', assets: [asset] }))
        .toThrow(`[dazscript assets] Asset ${field} path must stay inside its allowed root`)
})
