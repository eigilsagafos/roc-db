type ExtractEntityFromRef<T extends string> =
    T extends `${infer Entity}/${string}` ? Entity : T

export const entityFromRef = <T extends string>(ref: T) => {
    if (!ref) return ref as ExtractEntityFromRef<T>
    const slash = ref.indexOf("/")
    return (slash === -1 ? ref : ref.substring(0, slash)) as ExtractEntityFromRef<T>
}
