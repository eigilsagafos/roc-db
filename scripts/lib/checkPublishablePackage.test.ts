import { describe, expect, test } from "bun:test"
import { checkPublishablePackage, type ProbeFile } from "./checkPublishablePackage"

/** A probe backed by an in-memory map of existing files → byte size. */
const probeFrom =
    (files: Record<string, number>): ProbeFile =>
    relativePath =>
        relativePath in files
            ? { exists: true, size: files[relativePath] }
            : { exists: false, size: 0 }

/** A minimal, fully-valid prepacked package.json + the files it references. */
const validPackage = () => ({
    name: "@roc-db/example",
    version: "1.0.0",
    exports: {
        ".": {
            import: "./dist/index.js",
            types: "./dist/types/index.d.ts",
        },
    },
    publishConfig: { access: "public" },
})

const validFiles = {
    "./dist/index.js": 128,
    "./dist/types/index.d.ts": 64,
}

const run = (pkg: any, files: Record<string, number> = validFiles) =>
    checkPublishablePackage("@roc-db/example", pkg, probeFrom(files))

describe("checkPublishablePackage", () => {
    test("a valid prepacked package passes with no errors or warnings", async () => {
        const { errors, warnings } = await run(validPackage())
        expect(errors).toEqual([])
        expect(warnings).toEqual([])
    })

    test("flags leftover scripts (prepack should strip them)", async () => {
        const pkg = { ...validPackage(), scripts: { build: "bun run build" } }
        const { errors } = await run(pkg)
        expect(errors).toContain("[@roc-db/example] scripts should be removed by prepack")
    })

    test("flags leftover devDependencies", async () => {
        const pkg = { ...validPackage(), devDependencies: { typescript: "5.8.2" } }
        const { errors } = await run(pkg)
        expect(errors).toContain(
            "[@roc-db/example] devDependencies should be removed by prepack",
        )
    })

    test("flags a missing version field", async () => {
        const pkg = validPackage()
        delete (pkg as any).version
        const { errors } = await run(pkg)
        expect(errors).toContain("[@roc-db/example] missing version field")
    })

    test("flags workspace: refs in dependencies", async () => {
        const pkg = { ...validPackage(), dependencies: { "roc-db": "workspace:^" } }
        const { errors } = await run(pkg)
        expect(errors).toContain(
            "[@roc-db/example] dependencies.roc-db still has workspace reference: workspace:^",
        )
    })

    test("flags workspace: refs in peerDependencies too", async () => {
        const pkg = {
            ...validPackage(),
            peerDependencies: { "roc-db": "workspace:*" },
        }
        const { errors } = await run(pkg)
        expect(errors).toContain(
            "[@roc-db/example] peerDependencies.roc-db still has workspace reference: workspace:*",
        )
    })

    test("plain semver deps are allowed", async () => {
        const pkg = {
            ...validPackage(),
            dependencies: { "roc-db": "1.0.0" },
            peerDependencies: { zod: ">=4.0.0" },
        }
        const { errors } = await run(pkg)
        expect(errors).toEqual([])
    })

    test("flags a missing types file (broken typings must not ship)", async () => {
        // types path is declared but the file isn't present in the tarball
        const { errors } = await run(validPackage(), {
            "./dist/index.js": 128,
        })
        expect(errors).toContain(
            '[@roc-db/example] export "." types file missing: ./dist/types/index.d.ts',
        )
    })

    test("flags a missing runtime entry file", async () => {
        const { errors } = await run(validPackage(), {
            "./dist/types/index.d.ts": 64,
        })
        expect(errors).toContain(
            '[@roc-db/example] export "." entry file missing: ./dist/index.js',
        )
    })

    test("flags an empty runtime entry file", async () => {
        const { errors } = await run(validPackage(), {
            "./dist/index.js": 0,
            "./dist/types/index.d.ts": 64,
        })
        expect(errors).toContain(
            '[@roc-db/example] export "." entry file is empty: ./dist/index.js',
        )
    })

    test("flags an export missing its types field", async () => {
        const pkg = validPackage()
        pkg.exports = { ".": { import: "./dist/index.js" } } as any
        const { errors } = await run(pkg)
        expect(errors).toContain('[@roc-db/example] export "." missing types field')
    })

    test("flags an export missing its import/default field", async () => {
        const pkg = validPackage()
        pkg.exports = { ".": { types: "./dist/types/index.d.ts" } } as any
        const { errors } = await run(pkg)
        expect(errors).toContain(
            '[@roc-db/example] export "." missing import/default field',
        )
    })

    test("accepts the `default` condition as the runtime entry", async () => {
        const pkg = validPackage()
        pkg.exports = {
            ".": { default: "./dist/index.js", types: "./dist/types/index.d.ts" },
        } as any
        const { errors } = await run(pkg)
        expect(errors).toEqual([])
    })

    test("flags a package with no exports field", async () => {
        const pkg = validPackage()
        delete (pkg as any).exports
        const { errors } = await run(pkg)
        expect(errors).toContain("[@roc-db/example] missing exports field")
    })

    test("warns (does not error) when publishConfig.access is missing", async () => {
        const pkg = validPackage()
        delete (pkg as any).publishConfig
        const { errors, warnings } = await run(pkg)
        expect(errors).toEqual([])
        expect(warnings).toContain("[@roc-db/example] missing publishConfig.access")
    })

    test("checks every export entry, not just the first", async () => {
        const pkg = validPackage()
        pkg.exports = {
            ".": { import: "./dist/index.js", types: "./dist/types/index.d.ts" },
            "./setup": {
                import: "./dist/setup/index.js",
                types: "./dist/types/setup/index.d.ts",
            },
        } as any
        // only the "." entry's files exist; "./setup" files are absent
        const { errors } = await run(pkg)
        expect(errors).toContain(
            '[@roc-db/example] export "./setup" entry file missing: ./dist/setup/index.js',
        )
        expect(errors).toContain(
            '[@roc-db/example] export "./setup" types file missing: ./dist/types/setup/index.d.ts',
        )
    })
})
