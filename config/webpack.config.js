const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const webpack = require('webpack');

module.exports = {
    entry: {
        main: './client/index.js'
    },
    output: {
        filename: '[name].[fullhash:8].js',
        path: path.join(__dirname, '../html_dist')
    },
    mode: 'development',
    target: "web",
    devtool: 'inline-source-map',
    devServer: {
        contentBase: path.join(__dirname, '../html_dist'),
        port: 9000,
        host: '0.0.0.0',
        hot: true
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '../src/'),
            '@canvasppt': path.resolve(__dirname, '../src/index.js'),
            '@util': path.resolve(__dirname, '../src/util/'),
            '@shape': path.resolve(__dirname, '../src/shapes/')
        },
    },
    plugins: [
        new CleanWebpackPlugin(),
        new webpack.HotModuleReplacementPlugin(),
        new HtmlWebpackPlugin({
            template: path.join(__dirname, '../client/index.html'),
            title: 'Development',
        }),
        new webpack.DllReferencePlugin({
            context: path.join(__dirname),
            manifest: require('../canvas/canvasppt-manifest.json')
        }),
        
    ]
};