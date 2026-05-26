import { action } from '@dsf/core/action'
import { saveToFile } from '@dsf/helpers/file-helper'
import { getChildren, getFigure, getRoot, isBodyPartOf, isBone, isFigure } from '@dsf/helpers/node-helper'
import { currentTime, frameToTime, getCurrentFrame, getEndFrame, getLastFrame, timeToFrame } from '@dsf/helpers/scene-helper'
import { getStringScriptArguments } from '@dsf/helpers/script-helper'

type IntegrationResult = {
    ok: boolean
    failures: string[]
    scene: Record<string, unknown>
    node: Record<string, unknown>
}

const createResult = (): IntegrationResult => ({
    ok: false,
    failures: [],
    scene: {},
    node: {}
})

const addFailure = (result: IntegrationResult, message: string): void => {
    result.failures.push(message)
}

const writeResult = (path: string, result: IntegrationResult): void => {
    result.ok = result.failures.length === 0
    if (path) {
        saveToFile(path, JSON.stringify(result, null, 2))
    }
}

const assertCondition = (result: IntegrationResult, condition: boolean, message: string): void => {
    if (!condition) addFailure(result, message)
}

const isNumber = (value: unknown): boolean => typeof value === 'number' && !isNaN(value as number)

const runSceneChecks = (result: IntegrationResult): void => {
    const time = currentTime()
    const currentFrame = getCurrentFrame()
    const endFrame = getEndFrame()
    const lastFrame = getLastFrame()
    const roundTripFrame = timeToFrame(frameToTime(currentFrame))

    result.scene = {
        time: String(time),
        currentFrame,
        endFrame,
        lastFrame,
        roundTripFrame
    }

    assertCondition(result, time !== null && time !== undefined, 'scene-helper currentTime returned null or undefined')
    assertCondition(result, isNumber(currentFrame), 'scene-helper getCurrentFrame did not return a number')
    assertCondition(result, isNumber(endFrame), 'scene-helper getEndFrame did not return a number')
    assertCondition(result, endFrame === lastFrame, 'scene-helper getEndFrame and getLastFrame disagree')
    assertCondition(result, roundTripFrame === currentFrame, 'scene-helper frame/time roundtrip failed')
}

const findFirstBodyBone = (figure: DzSkeleton, children: DzNode[]): DzNode | null => {
    for (let index = 0; index < children.length; index++) {
        const child = children[index]
        if (isBone(child) && isBodyPartOf(child, figure)) return child
    }

    return null
}

const sameFigureLabel = (left: DzSkeleton | DzNode | null, right: DzSkeleton | DzNode | null): boolean => {
    if (!left || !right) return false
    return String(left.getLabel()) === String(right.getLabel())
}

const openContent = (contentPath: string): DzNode | null => {
    const contentMgr = App.getContentMgr()
    contentMgr.openFile(contentPath, true)

    const selected = Scene.getPrimarySelection()
    if (selected) return selected

    return null
}

const runNodeChecks = (result: IntegrationResult, contentPath: string): void => {
    assertCondition(result, !!contentPath, 'missing content path argument')
    if (!contentPath) return

    const loadedNode = openContent(contentPath)
    assertCondition(result, loadedNode !== null, 'DAZ did not load or select a node from the content path')
    if (!loadedNode) return

    const figure = getRoot(loadedNode) as DzSkeleton | null
    assertCondition(result, figure !== null, 'node-helper getRoot returned null for loaded node')
    if (!figure) return

    const figureIsFigure = isFigure(figure)
    const children = getChildren(figure, true, false, false)
    const bodyBone = findFirstBodyBone(figure, children)
    const bodyChildren: DzNode[] = []
    let nonBodyBoneCount = 0

    for (let index = 0; index < children.length; index++) {
        const child = children[index]
        if (!isBone(child)) continue
        if (isBodyPartOf(child, figure)) {
            bodyChildren.push(child)
        }
        else {
            nonBodyBoneCount += 1
        }
    }

    const boneRoot = bodyBone ? getRoot(bodyBone) : null
    const boneFigure = bodyBone ? getFigure(bodyBone) : null

    result.node = {
        loadedLabel: String(loadedNode.getLabel()),
        figureLabel: String(figure.getLabel()),
        figureIsFigure,
        childCount: children.length,
        bodyBoneCount: bodyChildren.length,
        nonBodyBoneCount,
        bodyBoneLabel: bodyBone ? String(bodyBone.getLabel()) : '',
        bodyBoneIsBone: bodyBone ? isBone(bodyBone) : false,
        boneRootMatchesFigure: sameFigureLabel(boneRoot, figure),
        boneFigureMatchesFigure: sameFigureLabel(boneFigure, figure),
        bodyPartOfFigure: bodyBone ? isBodyPartOf(bodyBone, figure) : false
    }

    assertCondition(result, figureIsFigure, 'node-helper isFigure did not identify loaded root as a figure')
    assertCondition(result, children.length > 0, 'node-helper getChildren returned no figure children')
    assertCondition(result, bodyChildren.length > 0, 'node-helper did not find any body bones for loaded figure')
    assertCondition(result, bodyBone !== null, 'node-helper could not discover a body bone')
    if (!bodyBone) return

    assertCondition(result, isBone(bodyBone), 'node-helper isBone did not identify discovered bone')
    assertCondition(result, sameFigureLabel(boneRoot, figure), 'node-helper getRoot(bone) did not return the loaded figure label')
    assertCondition(result, sameFigureLabel(boneFigure, figure), 'node-helper getFigure(bone) did not return the loaded figure label')
    assertCondition(result, isBodyPartOf(bodyBone, figure), 'node-helper isBodyPartOf failed for discovered body bone')
}

action({ text: 'Framework Integration Test', menuPath: false }, () => {
    const args = getStringScriptArguments()
    const resultPath = args.length > 0 ? args[0] : ''
    const contentPath = args.length > 1 ? args[1] : ''
    const result = createResult()

    try {
        runSceneChecks(result)
        runNodeChecks(result, contentPath)
    }
    catch (error) {
        addFailure(result, String(error))
    }

    writeResult(resultPath, result)
})
