const webpack = require('webpack');
const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const pkg = require("./package.json");

module.exports = {
  module: {
    rules: [{
      test: /\.js$/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env']
        }
      }
    }]
  },
  entry: {
    "sky-sphere": "./src/SkySphere.js",
    "sky-sphere.min": "./src/SkySphere.js",
  },
  devtool: "source-map",
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: "[name].js"
  },
  optimization: {
    minimize: true,
    minimizer: [new UglifyJsPlugin({
      include: /\.min\.js$/
    })]
  },
  plugins: [
    new webpack.BannerPlugin({
      banner: () => {
        return `-------------------------------------------------------
Project: ${pkg.title}
Version: ${pkg.version}

Author:  ${pkg.author.name}
Site:    ${pkg.author.url}
Contact: ${pkg.author.email}

Copyright (c) ${new Date().getFullYear()} ${pkg.author.name}
License: ${pkg.licenses[0].url}

Stars data credits: https://edu.kde.org/kstars, http://www.astronexus.com/hyg
-------------------------------------------------------`
      }
    })
  ],
  mode: 'production'
};
