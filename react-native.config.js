/**
 * Autolinking configuration.
 *
 * It tells React Native where the package's native code lives. Without it,
 * autolinking looks in the default locations and finds nothing - the app builds,
 * but no native module is registered, which produces exactly the error
 * `native.ts` works so hard to explain.
 */
module.exports = {
  dependency: {
    platforms: {
      ios: {
        podspecPath: __dirname + '/appwin-react-native.podspec',
      },
      android: {
        sourceDir: './android',
        packageImportPath: 'import io.appwin.reactnative.AppwinReactPackage;',
        packageInstance: 'new AppwinReactPackage()',
      },
    },
  },
}
