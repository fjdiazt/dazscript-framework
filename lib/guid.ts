export const createUID = (): string => {
    return "uuid-" + ((new Date).getTime().toString(16) + Math.floor(1E7 * Math.random()).toString(16));
}