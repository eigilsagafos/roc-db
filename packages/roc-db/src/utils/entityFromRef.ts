export const entityFromRef = (ref: string): string =>
    ref?.substring(0, ref?.indexOf("/"))
