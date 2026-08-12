# Event Package Dependency Resolution

Top-level `dependencies` are executable local contract data and are never ignored.

Supported version forms are exact semantic version (`1.2.3`), compatible major (`^1.2.3`), and compatible minor (`~1.2.3`).

Compatibility is deterministic: `~` stays within the requested major/minor, `^1.x` stays within major `1`, `^0.x` stays within the requested minor, and `^0.0.x` matches the exact patch. Prerelease ranges and compound/comparator expressions are outside this local contract and are blocked.

The resolver uses an explicit supplied package catalog. It blocks an unresolved package ID, self-dependency, duplicate dependency, unsupported range syntax, version mismatch, and dependency cycle. Collection validation then propagates invalidity deterministically: a package is valid only when every direct and transitive required dependency is fully schema-valid and semantically valid. Every package in a cycle is invalid, and no dependent graph is partially activatable when a required node fails. Root-cause issues remain attached to the failing dependency; dependents receive an Arabic `invalid-required-package-dependency` issue.

An independent valid package remains valid when another dependency graph fails. The resolver does not download packages, contact a registry, modify dependencies, or implement a package manager.

Reference packages currently have no top-level dependencies and continue to validate independently.
