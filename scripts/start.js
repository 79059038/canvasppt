const ora = require('ora')
const webpack = require('webpack');
const chalk = require('chalk')
const config = require('../config/webpack.config');

const spinner = ora('building for dev...')

const compiler = webpack(config);
new Promise((res, rej) => {
    compiler.run((err) => {
        spinner.stop()
        if (err) {
            rej(err)
        }
        res('success')
    })
}).then(res => {
    chalk.green(res)
})
.catch(err => {
    chalk.red(err)
})