// Type-level regression test for the atom-family generics of
// `createValdresAdapter`. This file is never executed — it exists to be
// type-checked (`bun run test:types`).
//
// It guards against the pre.99 bug where the atom-family params had their
// <Value, Args> generics swapped and used non-tuple Args:
//
//   entityAtom:   AtomFamily<string, Entity | null>    // WRONG: value/args swapped,
//   mutationAtom: AtomFamily<string, Mutation | null>  //        and Args not a tuple
//   entityIndexAtom: AtomFamily<Ref, [...]>            // WRONG: value should be Ref[]
//
// valdres' AtomFamily is `AtomFamily<Value, Args extends [any, ...any[]]>`, so
// value comes first and Args must be a non-empty tuple. Putting `Entity | null`
// in the Args slot violated that constraint and silently degraded to `any`.
//
// We assert against the SHIPPED declaration (dist/types) so this verifies what
// consumers actually receive, and does not depend on the package implementation
// type-checking cleanly.
//
// Note the value slot uses `EntityDocument` (the runtime document shape), not
// the `Entity` model-builder class — roc-db exports both, under distinct names.
import { expectTypeOf } from "expect-type"
import type { EntityDocument, Mutation, Ref } from "roc-db"
import type { AtomFamily } from "valdres"
import type { createValdresAdapter } from "../../dist/types/createValdresAdapter"

type Opts = Parameters<typeof createValdresAdapter>[0]

type ValueOf<T> = T extends AtomFamily<infer V, any> ? V : never
type ArgsOf<T> = T extends AtomFamily<any, infer A> ? A : never

// --- Args slot: must be a non-empty tuple matching the runtime call arity. ---
// (Previously entityAtom/mutationAtom had `Entity | null` / `Mutation | null`
// here — not tuples — which is the core bug.)

// entityAtom(ref) / mutationAtom(ref) — keyed by a single entity/mutation ref.
expectTypeOf<ArgsOf<Opts["entityAtom"]>>().toEqualTypeOf<[string]>()
expectTypeOf<ArgsOf<Opts["mutationAtom"]>>().toEqualTypeOf<[string]>()

// entityUniqueAtom(entity, key, value) / entityIndexAtom(entity, key, value) —
// keyed by a 3-tuple (see refByUniqueField.ts, pageEntitiesByIndex.ts, commit.ts).
expectTypeOf<ArgsOf<Opts["entityUniqueAtom"]>>().toEqualTypeOf<
    [string, string, string | number | boolean]
>()
expectTypeOf<ArgsOf<Opts["entityIndexAtom"]>>().toEqualTypeOf<
    [string, string, string | number | boolean]
>()

// --- Value slot: must hold the stored value, not the key. ---

// The unique index stores a single ref (or null when no entry exists — it is
// created with an `atomFamily(null)` default and `refByUniqueField` returns the
// raw get()); the list index stores an array of refs (commit.ts sets
// `curr => [...curr, ref]`, pageEntitiesByIndex reads `refs.map`).
expectTypeOf<ValueOf<Opts["entityUniqueAtom"]>>().toEqualTypeOf<Ref | null>()
expectTypeOf<ValueOf<Opts["entityIndexAtom"]>>().toEqualTypeOf<Ref[]>()

// entityAtom/mutationAtom store the document/mutation, not the key. (The old
// bug put the key `string` here and the value in the Args slot.)
expectTypeOf<
    ValueOf<Opts["entityAtom"]>
>().toEqualTypeOf<EntityDocument | null>()
expectTypeOf<ValueOf<Opts["mutationAtom"]>>().toEqualTypeOf<Mutation | null>()

// --- The declared params must accept atoms built by valdres' own atomFamily()
// with value-first / args-second generics. If the generics were swapped, these
// assignments would not type-check. ---
declare const unique: AtomFamily<
    Ref | null,
    [string, string, string | number | boolean]
>
declare const index: AtomFamily<
    Ref[],
    [string, string, string | number | boolean]
>
expectTypeOf(unique).toEqualTypeOf<Opts["entityUniqueAtom"]>()
expectTypeOf(index).toEqualTypeOf<Opts["entityIndexAtom"]>()
