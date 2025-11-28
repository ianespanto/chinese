import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
	base: '/chinese/',
	plugins: [react()],
	build: {
		outDir: 'dist',
		assetsDir: 'assets',
	},
});
