const mock = require('mock-require');

describe('SKY UX mock assets Webpack loader', function () {
  let loader;

  beforeEach(function () {
    loader = mock.reRequire('../loader/sky-assets/mock-loader');
  });

  afterEach(function () {
    mock.stopAll();
  });

  it('should replace assets URL with an empty string', function () {
    const html = '<div><img src="~/assets/image.jpg"></div>';
    const modified = loader(html);
    expect(modified).toEqual('<div><img src=""></div>');
  });
});
