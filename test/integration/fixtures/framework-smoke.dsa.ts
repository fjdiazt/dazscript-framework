import { action } from '@dsf/core/action'
import { saveToFile } from '@dsf/helpers/file-helper'
import { currentTime, frameToTime, getCurrentFrame, timeToFrame } from '@dsf/helpers/scene-helper'
import { getStringScriptArguments } from '@dsf/helpers/script-helper'

type SmokeResult = {
    ok: boolean
    failures: string[]
    syntax: Record<string, unknown>
    daz: Record<string, unknown>
}

class SmokeAccumulator {
    label = 'framework-smoke'
    values: number[] = []

    add = (value: number): void => {
        const scoped = value
        this.values.push(scoped)
    }

    get total(): number {
        return this.values.reduce((sum, value) => sum + value, 0)
    }
}

const createResult = (): SmokeResult => ({
    ok: false,
    failures: [],
    syntax: {},
    daz: {}
})

const addFailure = (result: SmokeResult, message: string): void => {
    result.failures.push(message)
}

const assertCondition = (result: SmokeResult, condition: boolean, message: string): void => {
    if (!condition) addFailure(result, message)
}

const writeResult = (path: string, result: SmokeResult): void => {
    result.ok = result.failures.length === 0
    if (path) {
        saveToFile(path, JSON.stringify(result, null, 2))
    }
}

const runSyntaxChecks = (result: SmokeResult): void => {
    const accumulator = new SmokeAccumulator()
    accumulator.add(2)
    accumulator.add(5)

    const optionalInput: { nested?: { value?: number } } = {}
    const fallback = optionalInput.nested?.value ?? 7
    const blockValues: number[] = []

    for (let index = 0; index < 2; index++) {
        const scopedIndex = index
        blockValues.push(scopedIndex)
    }

    result.syntax = {
        label: accumulator.label,
        total: accumulator.total,
        fallback,
        blockValues: blockValues.join(',')
    }

    assertCondition(result, accumulator.label === 'framework-smoke', 'class field value was not preserved')
    assertCondition(result, accumulator.total === 7, 'class field arrow method or getter failed')
    assertCondition(result, fallback === 7, 'optional chaining or nullish fallback failed')
    assertCondition(result, blockValues.join(',') === '0,1', 'block scoping transform failed')
}

const runDazChecks = (result: SmokeResult): void => {
    const appAvailable = typeof App !== 'undefined' && !!App
    const sceneAvailable = typeof Scene !== 'undefined' && !!Scene
    const dzFileAvailable = typeof DzFile !== 'undefined'
    const currentFrame = getCurrentFrame()
    const roundTripFrame = timeToFrame(frameToTime(currentFrame))
    const time = currentTime()

    result.daz = {
        appAvailable,
        sceneAvailable,
        dzFileAvailable,
        currentFrame,
        roundTripFrame,
        time: String(time)
    }

    assertCondition(result, appAvailable, 'App global is not available')
    assertCondition(result, sceneAvailable, 'Scene global is not available')
    assertCondition(result, dzFileAvailable, 'DzFile constructor is not available')
    assertCondition(result, typeof currentFrame === 'number' && !isNaN(currentFrame), 'current frame is not numeric')
    assertCondition(result, roundTripFrame === currentFrame, 'frame/time roundtrip failed')
    assertCondition(result, time !== null && time !== undefined, 'current time was not available')
}

action({ text: 'Framework Compatibility Smoke Test', menuPath: false }, () => {
    const args = getStringScriptArguments()
    const resultPath = args.length > 0 ? args[0] : ''
    const result = createResult()

    try {
        runSyntaxChecks(result)
        runDazChecks(result)
    }
    catch (error) {
        addFailure(result, String(error))
    }

    writeResult(resultPath, result)
})
