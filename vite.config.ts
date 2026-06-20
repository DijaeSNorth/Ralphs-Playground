import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2018',
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'three-core',
              test: /node_modules[\\/]three[\\/]/,
              priority: 3
            },
            {
              name: 'gym-meshes',
              test: /src[\\/]render[\\/]objects[\\/]/,
              priority: 2
            },
            {
              name: 'game-content',
              test: /src[\\/]game[\\/]content[\\/]/,
              priority: 1
            }
          ]
        }
      }
    }
  }
});
