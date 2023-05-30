const { ProvidePlugin } = require("webpack");

module.exports = {
  transpileDependencies: true,
  configureWebpack: {
    resolve: {
      fallback: {
        buffer: require.resolve("buffer/"),
      },
    },
    plugins: [
      new ProvidePlugin({
        Buffer: ["buffer", "Buffer"],
      }),
    ],
  },
};
