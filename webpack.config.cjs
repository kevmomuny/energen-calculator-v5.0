require('dotenv').config();
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    app: './frontend/js/app.js',
    calculation: './modules/calculation-engine/browser.js'
  },
  output: {
    path: path.resolve(__dirname, 'frontend/dist'),
    filename: '[name].bundle.js',
    library: 'Energen',
    libraryTarget: 'umd',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './frontend/index.html',
      filename: 'index.html',
      chunks: ['app', 'calculation']
    })
  ],
  resolve: {
    extensions: ['.js'],
    alias: {
      '@modules': path.resolve(__dirname, 'modules'),
      '@frontend': path.resolve(__dirname, 'frontend')
    }
  },
  devServer: {
    static: {
      directory: path.join(__dirname),
      serveIndex: true,
      watch: false
    },
    compress: false,
    port: 5176,
    hot: false,
    liveReload: false,
    open: ['/frontend/integrated-ui.html'],
    client: {
      overlay: false
    },
    devMiddleware: {
      writeToDisk: false
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: http: https: ws: wss:; img-src 'self' data: http: https: blob:; font-src 'self' data: http: https:; connect-src 'self' http: https: ws: wss: *.googleapis.com;"
    },
    proxy: [
      {
        context: ['/api'],
        target: `http://localhost:${process.env.PORT || 3002}`,
        changeOrigin: true,
        secure: false
      }
    ]
  }
};