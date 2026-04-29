export const idFromRef = (ref: string): string | undefined => {
    if (!ref) return undefined
    const slash = ref.indexOf("/")
    return slash === -1 ? undefined : ref.substring(slash + 1)
}
