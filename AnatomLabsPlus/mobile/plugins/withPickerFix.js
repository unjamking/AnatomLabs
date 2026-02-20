const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function withPickerFix(config) {
  return withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    const injection = `
ext {
    REACT_NATIVE_NODE_MODULES_DIR = new File(["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim()).getParentFile().getAbsolutePath()
}
`;
    if (!contents.includes('REACT_NATIVE_NODE_MODULES_DIR')) {
      config.modResults.contents = contents + injection;
    }
    return config;
  });
};
