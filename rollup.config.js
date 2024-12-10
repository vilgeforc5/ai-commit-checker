import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

export default [
	{
		input: './src/cli.ts',
		output: {
			dir: 'dist',
			format: 'module',
		},
		plugins: [typescript(), nodeResolve(), commonjs({include: 'node_modules/**'}), terser()],
	},
];
