declare global {
    interface RocDBEntityMap {}
}

export type Ref = keyof RocDBEntityMap extends never
    ? `${string}/${string}`
    : `${keyof RocDBEntityMap & string}/${number}`
