await Bun.build({
    entrypoints: ["./src/index.ts"],
    outdir: "./dist",
    external: ["./package.json"],
    packages: "external",
})

await Bun.build({
    entrypoints: ["./src/setup/index.ts"],
    outdir: "./dist/setup",
    external: ["./package.json"],
    packages: "external",
})
