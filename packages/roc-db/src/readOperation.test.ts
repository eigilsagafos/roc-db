import { describe, test } from "bun:test"
import { readOperation } from "./readOperation"
import { z } from "zod"

describe("readOperation", () => {
    test("should create a read operation", async () => {
        readOperation(
            "readUser",
            z.string(),
            z.object({ email: z.string() }),
            () => {},
        )
    })
})
