import { Delayed } from '@dsf/lib/delayed'

export const createFilterScheduler = (
    filterList: (keywords?: string) => void,
    delayedFactory: (action: () => void, minDelay: number, maxDelay: number) => { trigger: () => void } = (action, minDelay, maxDelay) => new Delayed(action, minDelay, maxDelay)
) => {
    let scheduledKeywords: string | undefined
    let delayed: { trigger: () => void } | null = null

    return (keywords?: string, delay?: { min: number, max: number }) => {
        scheduledKeywords = keywords

        if (!delayed) {
            delayed = delayedFactory(() => {
                filterList(scheduledKeywords)
            }, delay?.min ?? 100, delay?.max ?? 400)
        }

        delayed.trigger()
    }
}
