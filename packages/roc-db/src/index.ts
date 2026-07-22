export { createAdapter } from "./createAdapter"
export { readOperation } from "./readOperation"
export { writeOperation } from "./writeOperation"
export { Entity } from "./Entity"

// errors
export { BadRequestError } from "./errors/BadRequestError"
export { ConflictError } from "./errors/ConflictError"
export { NotFoundError } from "./errors/NotFoundError"
export { ChangeSetIntegrityError } from "./errors/ChangeSetIntegrityError"
export { ChangeSetNotEmptyError } from "./errors/ChangeSetNotEmptyError"
export { NotAChangeSetError } from "./errors/NotAChangeSetError"
export { NotAVersionError } from "./errors/NotAVersionError"
export { DuplicateOperationError } from "./errors/DuplicateOperationError"
export { ReservedOperationNameError } from "./errors/ReservedOperationNameError"
export { OptimisticDuplicationError } from "./errors/OptimisticDuplicationError"
export { SingletonDuplicationError } from "./errors/SingletonDuplicationError"
export { createUniqueConstraintConflictError } from "./errors/createUniqueConstraintConflictError"

// schemas
export { MutationRefSchema } from "./schemas/MutationRefSchema"
export { RefSchema } from "./schemas/RefSchema"

// schema generators
export { entitySchemaGenerator } from "./schemas/generators/entitySchemaGenerator"
export { mutationSchemaGenerator } from "./schemas/generators/mutationSchemaGenerator"
export { refSchemaGenerator } from "./schemas/generators/refSchemaGenerator"

// types
export type { ReadTransaction } from "./lib/ReadTransaction"
// export type { WriteTransaction } from "./lib/WriteTransaction"
export type { ReadEntityResult } from "./types/ReadEntityResult"
export type { Adapter } from "./types/Adapter"
export type {
    AdapterFunctions,
    BeginFunction,
    BeginRequestFunction,
    CommitFunction,
    CreateEntityFunction,
    EndFunction,
    FindDebounceMutationFunction,
    GetChangeSetMutationsFunction,
    OnChangeSetAppliedFunction,
    OnChangeSetInitFunction,
    PageEntitiesByIndexFunction,
    PageEntitiesFunction,
    PageMutationsFunction,
    PatchEntityFunction,
    ReadEntityFunctiun,
    ReadMutationFunction,
    RefByUniqueFieldFunction,
    SaveMutationFunction,
    UpdateEntityFunction,
} from "./types/AdapterFunctions"
// The `Entity` name is the model-builder class (exported above). The document
// shape produced/stored at runtime (z.infer of EntitySchema) is exported here
// under a distinct name to avoid the collision.
export type { Entity as EntityDocument } from "./types/Entity"
export type { Mutation } from "./types/Mutation"
export type {
    DuplicateChangeSetMutationsOptions,
    DuplicateChangeSetMutationsResult,
} from "./lib/duplicateChangeSetMutations"
export type { MutationRef } from "./types/MutationRef"
export type { Operation } from "./types/Operation"
export type { ReadRequest } from "./types/ReadRequest"
export type { Ref } from "./types/Ref"
export type { Session } from "./types/Session"
export type { Transaction } from "./types/Transaction"
export type { ReadOperation } from "./types/ReadOperation"
export type { WriteOperation } from "./types/WriteOperation"
export type { WriteOperationSettings } from "./types/WriteOperationSettings"
export type { WriteRequest } from "./types/WriteRequest"

// utils
export { deepPatch } from "./utils/deepPatch"
export { DELETED_IN_CHANGE_SET_SYMBOL } from "./utils/DELETED_IN_CHANGE_SET_SYMBOL"
export { entityFromRef } from "./utils/entityFromRef"
export { entityKindsFromRefSchema } from "./utils/entityKindsFromRefSchema"
export { generateRef } from "./utils/generateRef"
export { idFromRef } from "./utils/idFromRef"
export { parseRef } from "./utils/parseRef"
export { Query } from "./utils/Query"
export { QueryArray } from "./utils/QueryArray"
export { QueryChain } from "./utils/QueryChain"
export { QueryChainClass } from "./utils/QueryChainClass"
export { QueryObject } from "./utils/QueryObject"
export { refsFromRelations } from "./utils/refsFromRelations"
export { Snowflake } from "./utils/Snowflake"
export { validateAndIndexDocument } from "./utils/validateAndIndexDocument"
export { mutationToFormData } from "./utils/mutationToFormData"
export { formDataToMutation } from "./utils/formDataToMutation"
export { sortMutations } from "./utils/sortMutations"

// lib - temporarily exposed for valdres integration until a better solution is found
export { findOperation } from "./lib/findOperation"
export { loadChangeSetBase } from "./lib/loadChangeSetBase"
export { parseRequestPayload } from "./lib/parseRequestPayload"
export { WriteTransaction } from "./lib/WriteTransaction"
export { runSyncFunctionChain } from "./lib/runSyncFunctionChain"
export { generateTransactionCache } from "./lib/generateTransactionCache"
