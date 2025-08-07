import { describe, test } from "bun:test"
import { mutationToFormData } from "./mutationToFormData"
import { formDataToMutation } from "./formDataToMutation"

describe("mutationsToFormData", () => {
    test("mutation with file", () => {
        const res = mutationToFormData({
            ref: "Mutation/1",
            args: {
                file1: new File(["content"], "file.txt", {
                    type: "text/plain",
                }),
                file2: new File(["content"], "file.txt", {
                    type: "text/plain",
                }),
            },
        })
        console.log(res)
        const res2 = formDataToMutation(res)
        console.log(res2)
    })
})
