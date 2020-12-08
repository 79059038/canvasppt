const webpack = require('webpack');
const path = require('path')
const {CleanWebpackPlugin} = require('clean-webpack-plugin');

module.exports = {
    entry: {
        canvasppt: './src/index.js'
    },

    output: {
        path: path.join(__dirname, '../canvas'),
        filename: "[name].dll.js",
        library: "[name]_[fullhash]"
    },

    plugins: [
        new CleanWebpackPlugin(),
        new webpack.DllPlugin({
            path: path.join(__dirname, "../canvas", "[name]-manifest.json"),
            name: "[name]_[fullhash]"
        }),
    ]
}