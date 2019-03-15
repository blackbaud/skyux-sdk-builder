/*jshint node: true*/
'use strict';

const {
  ASSETS_REGEX
} = require('../../lib/assets-processor');

module.exports = function (content) {
  let match = ASSETS_REGEX.exec(content);

  while (match) {
    const matchString = match[0];

    // Replace the URL with an empty string if we're running unit tests.
    // This will prevent 404 warnings appearing in the log.
    content = content.replace(
      new RegExp(matchString, 'gi'),
      ''
    );

    match = ASSETS_REGEX.exec(content);
  }

  return content;
};
