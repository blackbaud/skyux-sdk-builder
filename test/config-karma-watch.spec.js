const mock = require('mock-require');

describe('config karma test', () => {
  let testKarmaSpy;

  beforeEach(() => {
    testKarmaSpy = jasmine.createSpy('sharedKarma').and.returnValue({});
    mock('../config/karma/test.karma.conf', testKarmaSpy);
  });

  afterEach(() => {
    mock.stopAll();
  });

  it('should set autoWatch and singleRun', (done) => {
    mock.reRequire('../config/karma/watch.karma.conf')({
      set: (config) => {
        expect(config.autoWatch).toEqual(true);
        expect(config.singleRun).toEqual(false);
        expect(testKarmaSpy).toHaveBeenCalled();
        done();
      }
    });
  });

});
