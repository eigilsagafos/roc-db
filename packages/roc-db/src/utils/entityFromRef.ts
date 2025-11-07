type ExtractEntityFromRef<T extends `${string}/${string}`> =
    T extends `${infer Entity}/${string}` ? Entity : never

export const entityFromRef = <T extends `${string}/${string}`>(ref: T) =>
    ref?.substring(0, ref?.indexOf("/")) as ExtractEntityFromRef<T>
