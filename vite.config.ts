import { configDefaults, defineConfig, lazyPlugins, mergeConfig, type UserConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const baseConfig: UserConfig = {
  lint: { plugins: ["eslint", "typescript", "unicorn", "oxc"] },
};

const vitePlusConfig: UserConfig = {
  staged: { "*": "vp check --fix" },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
};

const reactConfig: UserConfig = {
  lint: {
    plugins: ["react"],
    rules: {
      "react/rules-of-hooks": "error",
      "react/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  plugins: lazyPlugins(() => [react()]),
};

const shadcnConfig: UserConfig = {
  lint: {
    overrides: [
      {
        files: ["**/components/ui/**"],
        rules: { "react/only-export-components": "off" },
      },
    ],
  },
  plugins: lazyPlugins(() => [tailwindcss()]),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
};

const playwrightConfig: UserConfig = {
  // `e2e/` belongs to Playwright, not Vitest - ensure `vp test` excludes it
  test: { exclude: [...configDefaults.exclude, "e2e/**"] },
};

const projectConfig: UserConfig = {
  fmt: { ignorePatterns: ["docs/", ".github/", ".cruft.json"] },
  // index.html's site URL placeholder. The deploy sets it in the process
  // environment; a build without it gets a relative `/` instead of the literal
  // placeholder.
  // The canonical link is `vite-ignore`, or Vite would read `/` as an asset.
  define: { "import.meta.env.VITE_SITE_URL": JSON.stringify(process.env.VITE_SITE_URL || "/") },
};

function defineMergedConfig(configs: UserConfig[]) {
  return defineConfig(configs.reduce((merged, next) => mergeConfig(merged, next), {}));
}

export default defineMergedConfig([
  baseConfig,
  vitePlusConfig,
  reactConfig,
  shadcnConfig,
  playwrightConfig,
  projectConfig,
]);
