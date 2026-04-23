import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts']
    },
    resolve: {
        alias: {
            '@dsf': path.resolve(__dirname, 'src'),
            '@dst': path.resolve(__dirname, 'node_modules/dazscript-types/src/types')
        }
    }
})
