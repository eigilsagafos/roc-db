// z.infer<typeof RefSchema>
export type Ref = keyof RocDBEntityRegistry extends never
    ? `${string}/${string}`
    : `${keyof RocDBEntityRegistry & string}/${number}`
