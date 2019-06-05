const webpack = require('webpack');
const path = require('path');
const CustomThemesGenerationPlugin = require('./plugins/customThemesGenerationPlugin');
const CopyIndexHTMLPlugin = require('./plugins/copyIndexHTML');
const CopyFaviconPlugin = require('./plugins/copyFaviconPlugin');

module.exports = {
  mode: 'production',
  performance: {
    maxEntrypointSize: 2097152,
    maxAssetSize: 4194304
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.SERVER_URL': JSON.stringify(process.env.SERVER_URL || '%SERVER_URL%'),
      'process.env.WEBSOCKET_SERVER_URL': JSON.stringify(process.env.WEBSOCKET_SERVER_URL || '%WEBSOCKET_SERVER_URL%')
    }),
    new CustomThemesGenerationPlugin(path.resolve(__dirname, 'src/assets/themes')),
    new CopyIndexHTMLPlugin(path.resolve(__dirname, 'src/index.html')),
    new CopyFaviconPlugin(path.resolve(__dirname, 'src/assets/images/favicon.png'))
  ],
  entry: {
    'app': [
      './src/index'
    ]
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
      {
        test: /\.scss|\.css$/,
        loaders: ['style-loader', 'css-loader', 'sass-loader']
      },
      {
        test: /\.(eot|ttf|woff|woff2)([\?]?.*)$/,
        loader: 'file-loader',
      },
      {
        test: /\.(jpe?g|png|gif|svg)([\?]?.*)$/i,
        loader: 'url-loader?limit=25000'
      }
    ]
  }
};
