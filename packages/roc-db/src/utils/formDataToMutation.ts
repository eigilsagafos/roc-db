export const formDataToMutation = (formData: FormData) => {
    const files: { [key: string]: File } = {}
    const json = formData.get("json") as string
    if (json === undefined) {
        throw new Error("No JSON data found in FormData")
    }
    for (const [key, value] of formData.entries()) {
        if (key.startsWith("roc_db_file::")) {
            // value = value as u File
            files[key] = value as unknown as File
        } else if (key === "json") {
            continue
        } else {
            throw new Error(`Unknown key: ${key}`)
        }
    }

    return JSON.parse(json, (key, value) => {
        if (typeof value === "string" && value.startsWith("roc_db_file::")) {
            return files[value]
        }
        return value
    })
}
