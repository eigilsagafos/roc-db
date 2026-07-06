---
"@roc-db/valdres": patch
"@roc-db/test-utils": patch
---

Fix type declaration emit for published packages. `@roc-db/valdres` now emits flat `.d.ts` files (previously nested under `dist/types/@roc-db/valdres/src/` because of deep imports into `roc-db` source), and `@roc-db/test-utils` now emits declarations for its `./setup` entry. The `types` paths declared in each package's `exports` now resolve to real files in the published tarball.
