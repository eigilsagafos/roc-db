declare global {
    interface RocDBEntityMap {}
}

type Kinds = keyof RocDBEntityMap & string

export type Ref = keyof RocDBEntityMap extends never
    ? string
    : Kinds | `${Kinds}/${number}`
