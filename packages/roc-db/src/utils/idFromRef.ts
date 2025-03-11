export const idFromRef = (ref: string): string =>
    ref?.substring(ref?.indexOf("/") + 1)
