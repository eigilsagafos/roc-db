import { createPageEntitiesOperation } from "./createPageEntitiesOperation"
import { pageMutations } from "./pageMutations"
import { redo } from "./redo"
import { undo } from "./undo"

// The operations the adapter used to inject automatically. They are no longer
// added implicitly — spread this into your `operations` list to opt in:
//
//   operations: [...createBuiltInOperations(entities), ...myOperations]
//
// `pageEntities` needs the entity set to page over, so this is a factory rather
// than a static array. Register only the pieces you need if you prefer — the
// individual operations are exported too.
export const createBuiltInOperations = (entities: any) => [
    pageMutations,
    createPageEntitiesOperation(entities),
    undo,
    redo,
]
