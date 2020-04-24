module.exports = function (content) {
  return content.replace(/commonjsRequire\.context/g, 'require.context');
};
