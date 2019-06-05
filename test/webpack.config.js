const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const autoprefixer = require('autoprefixer');
const path = require('path');

module.exports = env => {
    const prod = env === 'prod';

    return {
        mode: prod ? 'production' : 'development',
        entry: './index.js',
        output: {
            filename: 'bundle.js',
            path: path.resolve(__dirname, 'derived'),
        },
        devtool: prod ? 'source-map' : 'inline-source-map',
        stats: 'minimal',
        plugins: [
            new MiniCssExtractPlugin({
                filename: '[name].css',
            }),
        ],
        resolve: {
            extensions: ['.js', '.json', '.less'],
        },
        module: {
            rules: [
                {
                    test: /\.m?js$/,
                    // exclude all node_modules (except akso-client; see above)
                    exclude: /node_modules\/(?!akso-client)/,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: {
                                presets: [
                                    [
                                        '@babel/preset-react',
                                        {
                                            pragma: 'h',
                                        },
                                    ]
                                ],
                                plugins: [
                                    '@babel/plugin-proposal-class-properties',
                                    '@babel/plugin-proposal-export-default-from',
                                ]
                            }
                        },
                    ],
                },
                {
                    test: /\.(c|le)ss$/,
                    exclude: /node_modules/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader',
                            options: {
                                url: false,
                                sourceMap: true
                            },
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                plugins: [
                                    autoprefixer()
                                ]
                            }
                        },
                        {
                            loader: 'less-loader',
                            options: { sourceMap: true },
                        }
                    ]
                }
            ],
        },
    };
};
