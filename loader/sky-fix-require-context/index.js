/**
 * Replaces the ng-packagr transpiled `commonjsRequire.context` with the normal `require.context`
 * so that dynamic require statements work as they should. (The ng-packagr package uses rollup
 * behind the scenes, which deliberately removes `require.context` for AoT builds, but we require
 * dynamic requires for testing resource strings in unit tests.)
 * See: https://github.com/rollup/plugins/blob/master/packages/commonjs/src/helpers.js#L40-L42
 * See: https://github.com/blackbaud/skyux-i18n/blob/master/src/app/public/testing/resources-test.service.ts#L42
 */
module.exports = function (content) {
  return content.replace(
    /commonjsRequire\.context/g,
    'require.context'
  );
};
