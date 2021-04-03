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
            {
                test: /\.(jpe?g|png|gif|woff|woff2|eot|ttf|svg)(\?[a-z0-9=.]+)?$/,
                loader: 'file-loader'
            }
        
        ]
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
            filename: 'index.html'
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
