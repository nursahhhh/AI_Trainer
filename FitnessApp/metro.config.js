const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("tflite");
config.resolver.sourceExts = config.resolver.sourceExts.filter(
  (ext) => ext !== "tflite",
);

module.exports = config;

// Learn more https://docs.expo.io/guides/customizing-metro
/*const { getDefaultConfig } = require('expo/metro-config');


const config = getDefaultConfig(__dirname);

module.exports = config;*/
