import resolve from '@rollup/plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import postcss from 'rollup-plugin-postcss';
import autoprefixer from 'autoprefixer';
import pkg from './package.json';

export default {
    input: {
        index: 'src/index.js',
    },
    plugins: [
        postcss({
            plugins: [
                autoprefixer(),
            ],
            extensions: ['.css', '.less'],
            inject: false,
            extract: true,
        }),
        babel({
            presets: [
                ['@babel/preset-env', {
                    useBuiltIns: 'usage',
                    corejs: pkg.dependencies['core-js']
                }],
                ['@babel/preset-react', {
                    pragma: 'h',
                }],
            ],
            plugins: [
                '@babel/plugin-proposal-class-properties',
                '@babel/plugin-proposal-export-default-from',
            ],
        }),
        resolve({
            extensions: ['.js', '.less'],
            preferBuiltins: true,
        }),
    ],
    external: id =>
        id.startsWith('core-js')
        || id.startsWith('regenerator-runtime')
        || id.startsWith('preact')
        || id.startsWith('events'),
    output: {
        dir: 'dist',
        format: 'esm',
    },
};
