import { defineConfig } from 'tsup';

export default defineConfig([
  // Main bundle
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    treeshake: true,
    minify: true,
  },
  // React bundle
  {
    entry: ['src/react/index.ts'],
    outDir: 'dist/react',
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    external: ['react'],
    treeshake: true,
    minify: true,
  },
]);
