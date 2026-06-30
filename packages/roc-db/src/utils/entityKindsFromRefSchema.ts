// Recover the entity kinds a ref schema accepts. refSchemaGenerator tags its
// output with `entityKinds`; this unwraps optional/nullable/default wrappers
// (the tag lives on the inner schema) to find it. Returns [] for the generic
// ref schema or any schema we can't introspect — callers treat that as
// "unknown kinds" and skip kind-based checks.
export const entityKindsFromRefSchema = (schema: any): string[] => {
    let s = schema
    for (let i = 0; s && i < 5; i++) {
        if (Array.isArray(s.entityKinds)) return s.entityKinds
        const inner = s?._zod?.def?.innerType ?? s?.def?.innerType
        if (!inner) break
        s = inner
    }
    return []
}
