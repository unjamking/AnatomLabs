const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

config.resolver.assetExts.push('glb', 'gltf', 'obj', 'fbx', 'stl');

const NODE_LIBS = ['crypto', 'url', 'http', 'https', 'http2', 'stream', 'buffer', 'util', 'zlib', 'net', 'tls', 'fs', 'path', 'os', 'form-data', 'proxy-from-env', 'follow-redirects'];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (NODE_LIBS.includes(moduleName)) {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
