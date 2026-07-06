/**
 * Verifies the publish pipeline produces valid, publishable packages.
 *
 * Runs: build → build:types → prepack for each public package, then checks:
 *   1. Exports point to real files in dist/
 *   2. Types files exist for each export
 *   3. No workspace: references remain in dependencies (after prepack)
 *   4. No scripts or devDependencies in prepacked package.json
 *   5. version field is present
 *
 * Always restores the original package.json (and deletes any leftover
 * package.tmp.json) even on failure.
 *
 * Publishable packages must not use the `workspace:` protocol in
 * dependencies / peerDependencies / optionalDependencies — changesets doesn't
 * rewrite the bare `workspace:^` shortcut, and `changeset publish` shells out
 * to `npm publish` which doesn't understand the protocol, so any leftover
 * `workspace:` would ship verbatim and break consumers. The check below is
 * the regression gate. (devDependencies are stripped by prepack, so they're
 * allowed to use `workspace:^` for ergonomics with non-publishable packages.)
 *
 * The per-package checks live in ./lib/checkPublishablePackage.ts (pure and
 * unit-tested); this script owns the build/prepack/restore orchestration.
 */

import { checkPublishablePackage } from "./lib/checkPublishablePackage"

const PUBLIC_PACKAGES = [
    "packages/roc-db",
    "packages/@roc-db/in-memory",
    "packages/@roc-db/indexed-db",
    "packages/@roc-db/postgres",
    "packages/@roc-db/test-utils",
    "packages/@roc-db/valdres",
]

const errors: string[] = []
const warnings: string[] = []

function error(pkg: string, msg: string) {
    errors.push(`[${pkg}] ${msg}`)
}

function warn(pkg: string, msg: string) {
    warnings.push(`[${pkg}] ${msg}`)
}

const rootDir = import.meta.dir + "/.."
const prepackScript = `${import.meta.dir}/prepack.ts`

// Step 1: Build all packages
console.log("Building all packages...")
const buildResult = Bun.spawnSync(["bun", "run", "build"], {
    cwd: rootDir,
    stdio: ["inherit", "inherit", "inherit"],
})
if (buildResult.exitCode !== 0) {
    console.error("Build failed!")
    process.exit(1)
}

console.log("Building types...")
const typesResult = Bun.spawnSync(["bun", "run", "build:types"], {
    cwd: rootDir,
    stdio: ["inherit", "inherit", "inherit"],
})
if (typesResult.exitCode !== 0) {
    console.error("Type build failed!")
    process.exit(1)
}

// Step 2: For each package: prepack → verify → restore
for (const pkg of PUBLIC_PACKAGES) {
    const pkgDir = `${rootDir}/${pkg}`
    const pkgName = pkg.replace("packages/", "")
    const pkgJsonPath = `${pkgDir}/package.json`

    console.log(`\nVerifying ${pkgName}...`)

    // Save original so we can restore after prepack writes its dist-shaped
    // package.json. Publishable packages must already use plain semver for
    // inter-package deps — prepack only rewrites `exports` and strips
    // scripts/devDependencies; the `workspace:` check below is the gate.
    const originalContent = await Bun.file(pkgJsonPath).text()

    // Run prepack
    const prepackResult = Bun.spawnSync(["bun", "run", prepackScript], {
        cwd: pkgDir,
        stdio: ["inherit", "pipe", "pipe"],
    })

    if (prepackResult.exitCode !== 0) {
        error(pkgName, `prepack failed: ${prepackResult.stderr.toString()}`)
        // prepack may have written package.tmp.json before failing; delete it
        // so the next prepack (this run or a later one) doesn't throw on the
        // "package.tmp.json already exists" guard. Then restore the original.
        const tmpFile = Bun.file(`${pkgDir}/package.tmp.json`)
        if (await tmpFile.exists()) {
            await tmpFile.delete()
        }
        await Bun.write(pkgJsonPath, originalContent)
        continue
    }

    try {
        // Read the prepacked package.json and run the shared checks, resolving
        // export/types paths against this package's directory.
        const packageJson = await Bun.file(pkgJsonPath).json()
        const result = await checkPublishablePackage(
            pkgName,
            packageJson,
            async relativePath => {
                const file = Bun.file(`${pkgDir}/${relativePath}`)
                return { exists: await file.exists(), size: file.size }
            },
        )
        errors.push(...result.errors)
        warnings.push(...result.warnings)
    } finally {
        // postpublish restores from package.tmp.json, so clean up the tmp file
        // and restore the true original.
        const tmpFile = Bun.file(`${pkgDir}/package.tmp.json`)
        if (await tmpFile.exists()) {
            await tmpFile.delete()
        }
        await Bun.write(pkgJsonPath, originalContent)
    }
}

// Report
console.log("\n" + "=".repeat(60))

if (warnings.length > 0) {
    console.log(`\n${warnings.length} warning(s):`)
    for (const w of warnings) {
        console.log(`  ${w}`)
    }
}

if (errors.length > 0) {
    console.log(`\n${errors.length} error(s):`)
    for (const e of errors) {
        console.error(`  ${e}`)
    }
    console.log("")
    process.exit(1)
} else {
    console.log(`\nAll ${PUBLIC_PACKAGES.length} packages verified successfully`)
    console.log("")
}
