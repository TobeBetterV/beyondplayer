const { join } = require('path');
const webpack = require('webpack');
const { getIfUtils } = require('webpack-config-utils');
const darkTheme = require('@ant-design/dark-theme').default;

const YOUTUBE_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.87 Safari/537.36';

const isProVersion = process.env.PRO_VERSION === 'true';
const enableBundleAnalyzer = process.env.BUNDLE_ANALYZER === 'true';
const { ifProduction } = getIfUtils(process.env.NODE_ENV);
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const addionalPlugins = enableBundleAnalyzer
    ? [new BundleAnalyzerPlugin({ analyzerMode: 'static', reportFilename: '../../../bundle_report.html' })]
    : [];

module.exports = [
    {
        entry: join(__dirname, 'app/js/renderer.jsx'),
        target: 'electron-renderer',
        output: {
            path: join(__dirname, 'app/build'),
            filename: 'renderer.js'
        },
        devtool: ifProduction('', 'source-map'),
        plugins: [
            new webpack.DefinePlugin({
                PRO_VERSION: JSON.stringify(isProVersion),
                'process.type': '"renderer"',
                __YOUTUBE_USER_AGENT__: JSON.stringify(YOUTUBE_USER_AGENT)
            }),
            new webpack.DefinePlugin({
                'process.env.FLUENTFFMPEG_COV': false
            }),
            ...addionalPlugins
        ],
        module: {
            rules: [
                {
                    test: /\.module\.less$/,
                    include: /\.module\.less$/,
                    use: [
                        'style-loader',
                        { loader: 'css-loader', options: { sourceMap: true, modules: true } },
                        {
                            loader: 'less-loader',
                            options: {
                                modifyVars: { ...darkTheme },
                                javascriptEnabled: true
                            }
                        }
                    ]
                },
                {
                    test: /\.less$/,
                    exclude: /\.module\.less$/,
                    use: [
                        'style-loader',
                        { loader: 'css-loader', options: { sourceMap: true } },
                        {
                            loader: 'less-loader',
                            options: {
                                modifyVars: { ...darkTheme },
                                javascriptEnabled: true
                            }
                        }
                    ]
                },
                {
                    test: /\.jsx?$/,
                    exclude: /node_modules/,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: {
                                presets: [['@babel/preset-react']],
                                plugins: ['@babel/plugin-proposal-class-properties', '@babel/plugin-proposal-optional-chaining']
                            }
                        }
                    ]
                },
                {
                    test: /node_modules[\/\\](iconv-lite)[\/\\].+/,
                    resolve: {
                        aliasFields: ['main']
                    }
                },
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader']
                },
                {
                    test: /\.(eot|jpg|jpeg|svg|ttf|woff|woff2)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                    use: [
                        {
                            loader: 'file-loader',
                            options: {
                                publicPath: './build/'
                            }
                        }
                    ]
                }
            ]
        }
    },
    {
        entry: join(__dirname, 'app/main.js'),
        target: 'electron-main',
        output: {
            path: join(__dirname, 'app'),
            filename: 'main_packed.js'
        },
        externals: ['fsevents'],
        node: {
            __dirname: false
        },
        optimization: {
            minimize: true,
            namedModules: false
        },
        plugins: [
            new webpack.DefinePlugin({
                PRO_VERSION: JSON.stringify(isProVersion),
                'process.type': '"browser"'
            })
        ],
        module: {
            rules: [
                {
                    test: /\.js?$/,
                    exclude: [/node_modules/],
                    use: [
                        {
                            loader: 'babel-loader',
                            options: {
                                presets: [['@babel/preset-env']],
                                plugins: ['@babel/plugin-proposal-class-properties', '@babel/plugin-proposal-optional-chaining']
                            }
                        }
                    ]
                }
            ]
        }
    }
];
