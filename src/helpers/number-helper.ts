export const tryParse = (input: string): { valid: boolean, value: number } => {
    const parsedValue = Number(input);
    if (isNaN(parsedValue)) {
        return { valid: false, value: 0 }
    }
    return { valid: true, value: parsedValue }
}

export const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
}