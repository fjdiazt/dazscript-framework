import { status } from '@dsf/common/log';

export type ProgressOptions = {
    isCancellable?: boolean
    showTimeElapsed?: boolean
    totalSteps?: number
}

export type ProgressHandle = {
    step: (count?: number) => boolean
    isCancelled: () => boolean
}

const defaultProgressOptions = (totalSteps: number, options?: ProgressOptions): Required<ProgressOptions> => ({
    isCancellable: true,
    showTimeElapsed: true,
    totalSteps,
    ...options
})

const reportInfo = (info: string | string[]): string => {
    const infoMessage = Array.isArray(info) ? '' : info;
    if (Array.isArray(info)) info.forEach(line => status(line));
    return infoMessage;
}

/**
 * Displays a progress dialog to the user if one is not already being displayed and starts a progress tracking operation.
 * @param info The string to display in the progress dialog as the current description of the operation.
 * @param items The items to process
 * @param callback The function to run for every item
 * @param isCancellable  If true, the user is given the option to cancel the operation.
 * @param showTimeElapsed If true, the amount of time since the progress operation was started will be displayed in the dialog.
 * @param totalSteps The number of progress steps for the operation to be complete.
 */
export const progress = <T>(info: string | string[], items: T[], callback: (item: T) => boolean | void,
    options?: ProgressOptions) => {

    const resolvedOptions = defaultProgressOptions(items.length, options);

    const infoMessage = reportInfo(info);
    startProgress(infoMessage, resolvedOptions.totalSteps, resolvedOptions.isCancellable, resolvedOptions.showTimeElapsed);

    try {
        // const total = Math.max(1, options.totalSteps ?? items.length);
        // let lastQuarter = -1; // -1 so first boundary triggers

        for (let i = 0; i < items.length; i++) {
            // cancellation
            if (resolvedOptions.isCancellable && progressIsCancelled()) {
                processEvents(); // flush once on cancel
                break;
            }

            // work
            if (callback && callback(items[i]) === false) break;

            // progress
            stepProgress(1);

            // 25/50/75/100 checkpoints
            // const quarter = Math.floor(((i + 1) * 2) / total); // 0..4
            // if (quarter > lastQuarter) {
            //     processEvents();
            //     lastQuarter = quarter;
            // }
        }
    }
    finally {
        finishProgress();
    }
}

/**
 * Starts a progress operation for multi-phase work that does not map to a single item array.
 * Uses script-level cleanup for normal returns and catchable script exceptions; host crashes or native aborts can still bypass script cleanup.
 * @param info The string to display in the progress dialog as the current description of the operation.
 * @param totalSteps The number of progress steps for the operation to be complete.
 * @param callback The function to run with a manual progress handle.
 * @param options Progress dialog options consistent with the array-driven progress helper.
 */
export const withProgress = <T>(info: string | string[], totalSteps: number, callback: (progress: ProgressHandle) => T,
    options?: Omit<ProgressOptions, 'totalSteps'>): T => {

    const resolvedOptions = defaultProgressOptions(totalSteps, options);
    const infoMessage = reportInfo(info);
    startProgress(infoMessage, resolvedOptions.totalSteps, resolvedOptions.isCancellable, resolvedOptions.showTimeElapsed);

    let flushedCancellation = false;
    const handle: ProgressHandle = {
        isCancelled: () => {
            const cancelled = resolvedOptions.isCancellable && Boolean(progressIsCancelled());
            if (cancelled && !flushedCancellation) {
                processEvents();
                flushedCancellation = true;
            }
            return cancelled;
        },
        step: (count: number = 1) => {
            if (handle.isCancelled()) return false;
            stepProgress(count);
            return true;
        }
    }

    try {
        return callback(handle);
    }
    finally {
        finishProgress();
    }
}
