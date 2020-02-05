/*jshint node: true*/
'use strict';

const fs = require('fs-extra');
const logger = require('@blackbaud/skyux-logger');
const skyPagesConfigUtil = require('../../config/sky-pages/sky-pages.config');

function copyFilesToDist() {
  const pathsToCopy = [
    ['README.md'],
    ['CHANGELOG.md'],
    ['src', 'assets']
  ];

  pathsToCopy.forEach(pathArr => {
    const sourcePath = skyPagesConfigUtil.spaPath(...pathArr);
    if (fs.existsSync(sourcePath)) {
      fs.copySync(
        sourcePath,
        skyPagesConfigUtil.spaPath('dist', ...pathArr)
      );
    } else {
      logger.warn(`File(s) not found: ${sourcePath}`);
    }
  });
}

module.exports = () => {
  copyFilesToDist();
};
