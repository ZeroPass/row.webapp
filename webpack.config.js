const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const { WebpackError } = require('webpack');

module.exports = {
    entry: {
        client: ['./src/client/client.ts', 'webpack-hot-middleware/client'],
    },
    module: {
        rules: [
            {
                test: /\.[tj]sx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                use: [
                    { loader: "style-loader" },
                    { loader: "css-loader" }
                ]
            },
            //{ test: /\.(jpe?g|png|gif|woff|woff2|eot|ttf|svg)$/i, loader: 'file-loader'},
            /*{
                test: /\.(png|svg|gif)$/i,
                use: [
                  {
                    loader: 'url-loader',
                    options: {
                      limit: 8192,
                    },
                  },
                ],
              },*/
              {
                test: /\.(jpg|png|gif|svg)$/,
                use: {
                    loader: 'file-loader',
                    options: {
                        esModule: false
                }
            }
              }
        ],
        /*loaders: [
            { test: /\.(png|jpg)$/, loader: 'url-loader?limit=8192' }
        ]*/

    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        alias: {
            util3: require.resolve("util/"),
            utils: path.resolve(__dirname, 'src/client/utils/'),
        }
    },
    devtool: 'inline-source-map',
    devServer: {
        hot: false,
        inline: false,
        contentBase: './dist'
    },
    mode: 'development',
    plugins: [
        new HtmlWebpackPlugin({
            hash: true,
            template: './src/client/index.html',
            filename: 'index.html',
            favicon: "./src/client/screen/images/ROWfavicon.ico"
        }),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoEmitOnErrorsPlugin(),
    ],
    output: {
        libraryExport: 'default', //Nejc's line
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: '/'
    },
    node: {
        fs: "empty",
        net: 'empty'
    }
};
