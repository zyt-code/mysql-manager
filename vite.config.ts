import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/extension.ts'),
      formats: ['cjs'],
      fileName: () => 'extension.js'
    },
    rollupOptions: {
      external: ['vscode', 'mysql2', 'mysql2/promise'],
      output: {
        sourcemap: true,
        // Ensure the extension is compatible with CommonJS
        format: 'cjs',
        // Maintain the same output structure as webpack
        dir: 'out'
      }
    },
    // Generate source maps for debugging
    sourcemap: true,
    // Ensure the output is compatible with Node.js
    target: 'node14',
    // Don't minify the code for better debugging
    minify: false,
    // Ensure the output is compatible with CommonJS
    outDir: 'out'
  },
  resolve: {
    extensions: ['.ts', '.js']
  }
});