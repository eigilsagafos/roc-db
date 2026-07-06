export interface FileProbe {
    exists: boolean
    /** Byte size; only inspected when `exists` is true. */
    size: number
}

/** Resolves a package-relative path to whether it exists and its size. */
export type ProbeFile = (relativePath: string) => Promise<FileProbe> | FileProbe

export interface CheckResult {
    errors: string[]
    warnings: string[]
}

/**
 * Runs the publishability checks against a single prepacked package.json:
 *   1. Exports point to real, non-empty files (resolved via `probeFile`)
 *   2. Types files exist for each export
 *   3. No `workspace:` refs in dependencies / peerDependencies / optionalDependencies
 *   4. No `scripts` or `devDependencies` (prepack strips them)
 *   5. `version` is present
 *   6. `publishConfig.access` is present (warning only)
 *
 * File existence is resolved through `probeFile` so this stays pure and
 * unit-testable: verify-publish.ts passes a `Bun.file`-backed probe, tests pass
 * an in-memory map. Returns messages prefixed with `[pkgName]` to match the
 * verify-publish report format.
 */
export const checkPublishablePackage = async (
    pkgName: string,
    packageJson: any,
    probeFile: ProbeFile,
): Promise<CheckResult> => {
    const errors: string[] = []
    const warnings: string[] = []
    const error = (msg: string) => errors.push(`[${pkgName}] ${msg}`)
    const warn = (msg: string) => warnings.push(`[${pkgName}] ${msg}`)

    if (packageJson.scripts) {
        error("scripts should be removed by prepack")
    }

    if (packageJson.devDependencies) {
        error("devDependencies should be removed by prepack")
    }

    if (!packageJson.version) {
        error("missing version field")
    }

    for (const depField of [
        "dependencies",
        "peerDependencies",
        "optionalDependencies",
    ]) {
        const deps = packageJson[depField]
        if (!deps) continue
        for (const [dep, version] of Object.entries(deps)) {
            if (typeof version === "string" && version.includes("workspace:")) {
                error(
                    `${depField}.${dep} still has workspace reference: ${version}`,
                )
            }
        }
    }

    if (packageJson.exports) {
        for (const [exportPath, exportValue] of Object.entries(
            packageJson.exports,
        )) {
            const exp = exportValue as {
                import?: string
                default?: string
                types?: string
            }

            const runtimeField = exp.import ?? exp.default
            if (runtimeField) {
                const probe = await probeFile(runtimeField)
                if (!probe.exists) {
                    error(
                        `export "${exportPath}" entry file missing: ${runtimeField}`,
                    )
                } else if (probe.size === 0) {
                    error(
                        `export "${exportPath}" entry file is empty: ${runtimeField}`,
                    )
                }
            } else {
                error(`export "${exportPath}" missing import/default field`)
            }

            if (exp.types) {
                const probe = await probeFile(exp.types)
                if (!probe.exists) {
                    error(
                        `export "${exportPath}" types file missing: ${exp.types}`,
                    )
                }
            } else {
                error(`export "${exportPath}" missing types field`)
            }
        }
    } else {
        error("missing exports field")
    }

    if (!packageJson.publishConfig?.access) {
        warn("missing publishConfig.access")
    }

    return { errors, warnings }
}
