import { describe, expect, test } from "bun:test"
import { join } from "node:path"

const ROOT_DIR = join(import.meta.dir, "..")
const ADAPTERS = [
    "in-memory",
    "indexed-db",
    "postgres",
    "test-utils",
    "valdres",
]

// The roc-db release that introduced the adapter function set the adapters
// implement (`findRecentMutations` replaced `findDebounceMutation`).
const ADAPTER_INTERFACE_SINCE = "0.2.0-pre.105"
const PREVIOUS_INTERFACE = "0.2.0-pre.104"

const readPackage = (dir: string) =>
    Bun.file(join(ROOT_DIR, "packages", dir, "package.json")).json()

describe.each(ADAPTERS)("@roc-db/%s", adapter => {
    test("peers only on roc-db versions with the adapter interface it implements", async () => {
        const pkg = await readPackage(`@roc-db/${adapter}`)
        const range = pkg.peerDependencies["roc-db"]
        expect(Bun.semver.satisfies(ADAPTER_INTERFACE_SINCE, range)).toBeTrue()
        expect(Bun.semver.satisfies(PREVIOUS_INTERFACE, range)).toBeFalse()
        const core = await readPackage("roc-db")
        expect(Bun.semver.satisfies(core.version, range)).toBeTrue()
    })
})

test("@roc-db/test-utils declares the packages its exports import", async () => {
    const pkg = await readPackage("@roc-db/test-utils")
    const declared = { ...pkg.dependencies, ...pkg.peerDependencies }
    expect(Object.keys(declared)).toContain("@faker-js/faker")
    expect(Object.keys(declared)).toContain("@roc-db/in-memory")
})
