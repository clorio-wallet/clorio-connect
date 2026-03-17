import { defineConfig } from 'orval';
import 'dotenv/config';

export default defineConfig({
  clorio: {
    input: {
      target: `${process.env.VITE_API_URL}/docs/json`,
      override: {
        transformer: './src/api/orval-transformer.cjs',
      },
    },
    output: {
      mode: 'tags-split',
      target: 'src/api/generated.ts',
      schemas: 'src/api/model',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/api/axios-instance.ts',
          name: 'customInstance',
        },
      },
    },
  },
});
