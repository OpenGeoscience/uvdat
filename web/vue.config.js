const { ProvidePlugin } = require("webpack");

const { gitDescribeSync } = require("git-describe");
const describe = gitDescribeSync();
process.env.VUE_APP_VERSION = describe.dirty ? describe.raw : describe.tag;
process.env.VUE_APP_HASH = describe.hash;

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
