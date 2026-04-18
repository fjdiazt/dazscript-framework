import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        include: ['tests/**/*.test.ts']
    },
    resolve: {
        alias: {
            '@dsf': path.resolve(__dirname, 'src'),
            '@dst': path.resolve(__dirname, '../dazscript-types/src/types')
        }
    }
})
