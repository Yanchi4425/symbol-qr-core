var path = require("path");
var webpack = require("webpack");

var PATHS = {
  entryPoint: path.resolve(__dirname, 'index.ts'),
  bundles: path.resolve(__dirname, 'release'),
}

var config = {
  mode: 'production',
  // These are the entry point of our library. We tell webpack to use
  // the name we assign later, when creating the bundle. We also use
  // the name to filter the second entry point for applying code
  // minification via UglifyJS
  entry: {
    'catapult-qr': [PATHS.entryPoint]
  },
  // The output defines how and where we want the bundles. The special
  // value `[name]` in `filename` tell Webpack to use the name we defined above.
  // We target a UMD and name it MyLib. When including the bundle in the browser
  // it will be accessible at `window.MyLib`
  output: {
    path: PATHS.bundles,
    filename: '[name].js',
    libraryTarget: 'umd',
    library: 'CatapultQR',
    umdNamedDefine: true
  },
  // Add resolve for `tsx` and `ts` files, otherwise Webpack would
  // only look for common JavaScript file extension (.js)
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    // Webpack 5 does not automatically polyfill Node.js core modules.
    // Node polyfills have been moved to explicit fallbacks below.
    fallback: {
      fs: false,
      tls: false,
      net: false
    }
  },
  // Activate source maps for the bundles in order to preserve the original
  // source when the user debugs the application
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  performance: { 
    hints: false
  }
}

module.exports = config;
