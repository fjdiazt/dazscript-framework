import { status } from '@dsf/common/log';

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
    options?: { isCancellable?: boolean, showTimeElapsed?: boolean, totalSteps?: number }) => {

    options = {
        isCancellable: true,
        showTimeElapsed: true,
        totalSteps: items.length,
        ...options
    };

    const infoMessage = Array.isArray(info) ? '' : info;
    startProgress(infoMessage, options.totalSteps, options.isCancellable, options.showTimeElapsed);

    if (Array.isArray(info)) info.forEach(line => status(line));

    // const total = Math.max(1, options.totalSteps ?? items.length);
    // let lastQuarter = -1; // -1 so first boundary triggers

    for (let i = 0; i < items.length; i++) {
        // cancellation
        if (options.isCancellable && progressIsCancelled()) {
            processEvents(); // flush once on cancel
            break;
        }

        // work
        if (callback && callback(items[i]) === false) return;

        // progress
        stepProgress(1);

        // 25/50/75/100 checkpoints
        // const quarter = Math.floor(((i + 1) * 2) / total); // 0..4
        // if (quarter > lastQuarter) {
        //     processEvents();
        //     lastQuarter = quarter;
        // }
    }

    finishProgress();
}