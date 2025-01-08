export class Delayed {
    private minDelay: number;
    private maxDelay: number;
    private timeout: any;
    private action: () => void;

    /**
     * Perform an action delayed
     * @param action action to delay
     * @param minDelay min delay in milliseconds
     * @param maxDelay max delay in milliseconds
     */
    constructor(action: () => void, minDelay = 100, maxDelay = 500) {
        this.action = action;
        this.minDelay = minDelay;
        this.maxDelay = maxDelay;
    }

    public trigger() {
        if (this.timeout === undefined) {
            this.timeout = new DzTimer();
            this.timeout.timeout.connect(() => {
                this.action();
                this.reset();
            });
            this.timeout.start(this.maxDelay);
        } else {
            this.timeout.stop();
            this.timeout.start(this.minDelay);
        }
    }

    private reset() {
        if (this.timeout !== undefined) {
            this.timeout.stop();
            this.timeout = undefined;
        }
    }
}