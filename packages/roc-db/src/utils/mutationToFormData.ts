import type { Mutation } from "../types/Mutation"

const generateRandomId = (length = 16) => {
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let result = ""
    for (let i = 0; i < length; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * characters.length),
        )
    }
    return result
}

export const mutationToFormData = (mutation: Mutation) => {
    const formData = new FormData()

    const files: [string, File][] = []
    const json = JSON.stringify(mutation, (key, value) => {
        if (value instanceof File) {
            const fileKey = `roc_db_file::${generateRandomId()}`
            files.push([fileKey, value])
            return fileKey
        }
        return value
    })
    formData.append("json", json)
    for (const [key, value] of files) {
        formData.append(key, value)
    }

    return formData
}
