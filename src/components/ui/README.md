# shadcn/ui

This folder contains vendored code from `shadcn/ui`.

## Regenerating

Regenerate the currently installed components with:

```bash
vp exec shadcn add --overwrite \
  badge button dropdown-menu switch table tooltip
vp check --fix
```

Review the resulting diff and stage only the upstream changes that should be adopted. Keep the component list above synchronised with the installed files.

Note: `mode-toggle` and `theme-provider` started from https://ui.shadcn.com/docs/dark-mode/vite but have diverged and are maintained here (see `docs/planning/dark-mode/`): the provider follows system appearance changes live and validates the stored preference, and the toggle shows the active selection. Do not overwrite them from the shadcn docs.
