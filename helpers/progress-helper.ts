/**
 * Displays a progress dialog to the user if one is not already being displayed and starts a progress tracking operation.
 * @param info The string to display in the progress dialog as the current description of the operation.
 * @param items The items to process
 * @param callback The function to run for every item
 * @param isCancellable  If true, the user is given the option to cancel the operation.
 * @param showTimeElapsed If true, the amount of time since the progress operation was started will be displayed in the dialog.
 * @param totalSteps The number of progress steps for the operation to be complete.
 */
export const progress = <T>(info: string, items: T[], callback: (item: T) => boolean | void, isCancellable: boolean = true, showTimeElapsed: boolean = true, totalSteps?: number) => {
    totalSteps = totalSteps ?? items.length;

    startProgress(info, totalSteps, isCancellable, showTimeElapsed);

    for (let item of items) {
        if (isCancellable) {
            if (progressIsCancelled()) {
                break;
            } else {
                // This is too slow
                //if(progress) processEvents();
            }
        }

        //============
        if (callback && callback(item) === false)
            return
        //============

        stepProgress(1);
    }

    finishProgress();
}