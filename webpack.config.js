const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync({
    ...env,
    babel: {
      dangerouslyAddModulePathsToTranspile: [
        // Ensure that all packages starting with @tensorflow are
        // transpiled.
        "@tensorflow/tfjs",
        "@tensorflow-models/face-detection",
        "@tensorflow-models/face-landmarks-detection",
        "@tensorflow/tfjs-backend-webgl",
        "@tensorflow/tfjs-converter",
        "@tensorflow/tfjs-core",
      ],
    },
  }, argv);
  // Customize the config before returning it.
  return config;
};
