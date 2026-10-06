# Agent Instructions

## Agent skills

### Issue tracker

Tickets live as local Markdown files in `docs/planning/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: `docs/context.md` and ADRs in `docs/architecture/`. See `docs/agents/domain.md`.

## Vendor-reported entries

Adding, correcting or reviewing a vendor-reported entry: apply the admission rules in ADR 0009 (`docs/architecture/0009-vendor-reported-entries.md`), and have the maintainer confirm every figure read off a chart before committing it. The PR body carries the evidence that ADR lists.

## Development environment

This project uses mise to manage the development environment.

- Run `mise tasks` to see the available tasks.
- Use `mise run <task>` for standard operations.
- Run `mise ls -l` to see the managed tools.
- When invoking a managed tool directly, use `mise exec -- <command> [args]` rather than invoking the tool by its bare name.

To reach the dev or preview server over Tailscale, pass `--host "$(tailscale ip -4)"` (e.g. `mise run dev --host "$(tailscale ip -4)"`) and open the Network URL it prints.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
