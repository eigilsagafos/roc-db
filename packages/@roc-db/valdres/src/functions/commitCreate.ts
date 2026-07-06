import type { CreateEntityFunction } from "roc-db"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"

export const commitCreate: CreateEntityFunction<ValdresEngine> = (
    txn,
    ref,
    document,
) => {
    throw new Error("commitCreate is not implemented")
    const { entity } = document
    console.log("commitCreate", ref, document)
    const {
        entityAtom,
        entityRefListAtom,
        txn: valdresTxn,
    } = txn.engineOpts as ValdresTxnEngine
    valdresTxn.set(entityAtom(ref), document)
    if (entityRefListAtom) {
        const refListAtom = entityRefListAtom as NonNullable<
            typeof entityRefListAtom
        >
        valdresTxn.set(refListAtom(entity), (curr: string[]) => [...curr, ref])
    }
}
