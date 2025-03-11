import { describe, test, expect } from "bun:test"
import { idsFromRelations } from "./idsFromRelations"

describe("idsFromRelations", () => {
    test("null deletes key", () => {
        const res = idsFromRelations({
            foo: "Foo/1",
            bar: ["Bar/2", "Foo/1"],
            foobar: "Foo/2",
        })
        expect(res).toStrictEqual(["1", "2"])
    })
})
