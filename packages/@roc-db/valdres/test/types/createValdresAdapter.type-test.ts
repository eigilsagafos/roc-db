// Type-level regression test for the state-definition params of
// `createValdresAdapter`. This file is never executed — it exists to be
// type-checked (`bun run test:types`).
//
// valdres 1.0.0-beta.24 replaced `atomFamily` with `collection()` and
// `family()`. Entities and mutations are enumerated, so they are collections
// keyed by ref; the unique and index lookups are families of atoms keyed by
// (entity, field, value).
//
// We assert against the SHIPPED declaration (dist/types) so this verifies what
// consumers actually receive, and does not depend on the package implementation
// type-checking cleanly.
//
// Note the value slot uses `EntityDocument` (the runtime document shape), not
// the `Entity` model-builder class — roc-db exports both, under distinct names.
import { expectTypeOf } from "expect-type"
import type { EntityDocument, Mutation, Ref } from "roc-db"
import { atom, collection, family, type Atom, type Collection } from "valdres"
import type { createValdresAdapter } from "../../dist/types/createValdresAdapter"

type Opts = Parameters<typeof createValdresAdapter>[0]
type LookupArgs = [string, string, string | number | boolean]

// --- entityAtom / mutationAtom: collections of documents keyed by ref. ---
expectTypeOf<Opts["entityAtom"]>().toEqualTypeOf<
    Collection<string, EntityDocument>
>()
expectTypeOf<Opts["mutationAtom"]>().toEqualTypeOf<
    Collection<string, Mutation>
>()

// --- entityUniqueAtom / entityIndexAtom: keyed by a 3-tuple (see
// refByUniqueField.ts, pageEntitiesByIndex.ts, commit.ts). The unique lookup
// holds a single ref (null when free); the index lookup holds a ref list. ---
expectTypeOf<Parameters<Opts["entityUniqueAtom"]>>().toEqualTypeOf<LookupArgs>()
expectTypeOf<Parameters<Opts["entityIndexAtom"]>>().toEqualTypeOf<LookupArgs>()
expectTypeOf<ReturnType<Opts["entityUniqueAtom"]>>().toEqualTypeOf<
    Atom<Ref | null>
>()
expectTypeOf<ReturnType<Opts["entityIndexAtom"]>>().toEqualTypeOf<Atom<Ref[]>>()

// --- The params accept definitions built with valdres' own constructors. ---
const entityAtom = collection<string, EntityDocument>()
const mutationAtom = collection<string, Mutation>()
const entityUniqueAtom = family(
    (entity: string, key: string, value: string | number | boolean) =>
        atom<Ref | null>(null),
)
const entityIndexAtom = family(
    (entity: string, key: string, value: string | number | boolean) =>
        atom<Ref[]>([]),
)
expectTypeOf(entityAtom).toMatchTypeOf<Opts["entityAtom"]>()
expectTypeOf(mutationAtom).toMatchTypeOf<Opts["mutationAtom"]>()
expectTypeOf(entityUniqueAtom).toMatchTypeOf<Opts["entityUniqueAtom"]>()
expectTypeOf(entityIndexAtom).toMatchTypeOf<Opts["entityIndexAtom"]>()

// A family with the value and key slots swapped is rejected.
const swapped = family((ref: string) => atom<string>(""))
// @ts-expect-error -- wrong key arity and value type
expectTypeOf(swapped).toMatchTypeOf<Opts["entityUniqueAtom"]>()
