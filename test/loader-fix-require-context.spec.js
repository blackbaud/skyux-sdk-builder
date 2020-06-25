const mock = require('mock-require');

describe('SKY UX fix require context Webpack loader', () => {

  let loader;

  beforeEach(() => {
    loader = mock.reRequire('../loader/sky-fix-require-context/index');
  });

  afterEach(() => {
    mock.stopAll();
  });

  it('should revert transpiled `commonjsRequire` with `require`', () => {
    const content = 'const result = commonjsRequire.context(a + b);';
    const modified = loader.apply({}, [content]);
    expect(modified).toEqual('const result = require.context(a + b);');
  });

});
