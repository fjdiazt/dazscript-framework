
export const getModifiers = (figure: DzSkeleton): DzModifier[] => {
    let modifiers: DzModifier[] = []
    let obj = figure.getObject()

    for (let i = 0; i < obj.getNumModifiers(); i++) {
        modifiers.push(obj.getModifier(i))
    }

    return modifiers
}

export type MirrorSide = 'left' | 'right'

export type MirrorNameConvention =
    | 'compact-prefix'
    | 'underscore-prefix'
    | 'underscore-suffix'
    | 'word-prefix'
    | 'word-suffix'

export type MirrorNodeMatch = {
    source: DzNode
    mirror: DzNode | null
    side: MirrorSide | null
    convention: MirrorNameConvention | null
    sourceToken: string | null
    mirrorToken: string | null
    mirrorName: string | null
}

type MirrorNameCandidate = Omit<MirrorNodeMatch, 'source' | 'mirror'>

const preserveCase = (source: string, replacement: string): string => {
    if (source.toUpperCase() === source) return replacement.toUpperCase()
    if (source.toLowerCase() === source) return replacement.toLowerCase()
    if (source.length > 0 && source[0].toUpperCase() === source[0]) {
        return replacement[0].toUpperCase() + replacement.substring(1).toLowerCase()
    }

    return replacement
}

export const getMirrorNameCandidate = (name: string): MirrorNameCandidate | null => {
    const compactPrefix = /^([lr])([A-Z].*)$/.exec(name)
    if (compactPrefix) {
        const sourceToken = compactPrefix[1]
        const mirrorToken = sourceToken === 'r' ? 'l' : 'r'
        return {
            side: sourceToken === 'r' ? 'right' : 'left',
            convention: 'compact-prefix',
            sourceToken,
            mirrorToken,
            mirrorName: `${mirrorToken}${compactPrefix[2]}`
        }
    }

    const underscorePrefix = /^(r|l|right|left)([_-].+)$/i.exec(name)
    if (underscorePrefix) {
        const sourceToken = underscorePrefix[1]
        const side = sourceToken.toLowerCase()[0] === 'r' ? 'right' : 'left'
        const mirrorToken = preserveCase(sourceToken, sourceToken.length === 1
            ? (side === 'right' ? 'l' : 'r')
            : (side === 'right' ? 'left' : 'right'))
        return {
            side,
            convention: 'underscore-prefix',
            sourceToken,
            mirrorToken,
            mirrorName: `${mirrorToken}${underscorePrefix[2]}`
        }
    }

    const underscoreSuffix = /^(.+[_-])(r|l|right|left)$/i.exec(name)
    if (underscoreSuffix) {
        const sourceToken = underscoreSuffix[2]
        const side = sourceToken.toLowerCase()[0] === 'r' ? 'right' : 'left'
        const mirrorToken = preserveCase(sourceToken, sourceToken.length === 1
            ? (side === 'right' ? 'l' : 'r')
            : (side === 'right' ? 'left' : 'right'))
        return {
            side,
            convention: 'underscore-suffix',
            sourceToken,
            mirrorToken,
            mirrorName: `${underscoreSuffix[1]}${mirrorToken}`
        }
    }

    const wordPrefix = /^(right|left)([A-Z].*)$/i.exec(name)
    if (wordPrefix) {
        const sourceToken = wordPrefix[1]
        const side = sourceToken.toLowerCase() === 'right' ? 'right' : 'left'
        const mirrorToken = preserveCase(sourceToken, side === 'right' ? 'left' : 'right')
        return {
            side,
            convention: 'word-prefix',
            sourceToken,
            mirrorToken,
            mirrorName: `${mirrorToken}${wordPrefix[2]}`
        }
    }

    const wordSuffix = /^(.+[a-z])(Right|Left)$/i.exec(name)
    if (wordSuffix) {
        const sourceToken = wordSuffix[2]
        const side = sourceToken.toLowerCase() === 'right' ? 'right' : 'left'
        const mirrorToken = preserveCase(sourceToken, side === 'right' ? 'left' : 'right')
        return {
            side,
            convention: 'word-suffix',
            sourceToken,
            mirrorToken,
            mirrorName: `${wordSuffix[1]}${mirrorToken}`
        }
    }

    return null
}

export const getMirrorNodeMatch = (figure: DzSkeleton, node: DzNode): MirrorNodeMatch => {
    const name = node.getName().valueOf()
    const candidate = getMirrorNameCandidate(name)

    if (!candidate) {
        return {
            source: node,
            mirror: null,
            side: null,
            convention: null,
            sourceToken: null,
            mirrorToken: null,
            mirrorName: null
        }
    }

    return {
        source: node,
        mirror: figure.findNodeChild(candidate.mirrorName, true),
        ...candidate
    }
}

export const getMirrorNodeMatches = (figure: DzSkeleton, nodes: DzNode[]): MirrorNodeMatch[] => {
    return nodes.map(node => getMirrorNodeMatch(figure, node))
}

export const getMirrorNodes = (figure: DzSkeleton, nodes: DzNode[]): DzNode[] => {
    return getMirrorNodeMatches(figure, nodes)
        .map(match => match.mirror)
        .filter(node => node !== null) as DzNode[]
}
