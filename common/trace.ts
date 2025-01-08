import { app } from '@dsf/lib/global';

export function trace(enabled: boolean = true) {
    return function (target: any, key?: string, descriptor?: PropertyDescriptor) {
        if (key !== undefined && descriptor !== undefined) {
            // Applied to a method
            if (!enabled)
                return descriptor

            const originalMethod = descriptor.value;
            descriptor.value = function (...args: any[]) {
                app.debug(`[TRACE] Entering method: ${key}`);
                app.flushLogBuffer()
                const result = originalMethod.apply(this, args);
                app.debug(`[TRACE] Exiting method: ${key}`);
                app.flushLogBuffer()
                return result;
            };

            return descriptor;
        } else if (key === undefined && descriptor === undefined) {
            // Applied to a class
            return target;
        }
    }
}
