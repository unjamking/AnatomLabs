const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withPickerFix(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    const injection = `project.ext.REACT_NATIVE_NODE_MODULES_DIR = new File(["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim()).getParentFile().getAbsolutePath()\n\n`;
    if (!contents.includes('REACT_NATIVE_NODE_MODULES_DIR')) {
      config.modResults.contents = contents.replace(
        /apply plugin: "com\.facebook\.react"\n/,
        `apply plugin: "com.facebook.react"\n\n${injection}`
      );
    }
    return config;
  });
};
