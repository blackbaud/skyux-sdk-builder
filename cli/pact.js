/*jslint node: true */
'use strict';

/**
 * Spawns the skyux pact command.
 * @name pact
 */
function pact(command, argv) {
  const http = require('http');
  const httpProxy = require('http-proxy');
  const logger = require('@blackbaud/skyux-logger');
  const portfinder = require('portfinder');
  const url = require('url');

  const pactServers = require('../utils/pact-servers');
  const karmaUtils = require('./utils/karma-utils');
  const tsLinter = require('./utils/ts-linter');

  const skyPagesConfigUtil = require('../config/sky-pages/sky-pages.config');

  const skyPagesConfig = skyPagesConfigUtil.getSkyPagesConfig(command);

  argv = argv || process.argv;
  argv.command = command;

  // get a free port for every config entry, plus one for the proxy
  if (!skyPagesConfig.skyux.pacts) {
    logger.error('skyux pact failed! pacts does not exist on configuration file.');
    return;
  }

  portfinder.getPorts(skyPagesConfig.skyux.pacts.length + 1, {}, (err, ports) => {
    if (err) {
      logger.error(err);
      process.exit();
      return;
    }

    // saving pact server information so it can carry over into karma config
    skyPagesConfig.skyux.pacts.forEach((instance, index) => {
      pactServers.savePactServer(
        skyPagesConfig.skyux.pacts[index].provider,
        skyPagesConfig.skyux.pacts[index].host || 'localhost',
        skyPagesConfig.skyux.pacts[index].port || ports[index]
      );
    });

    const proxy = httpProxy.createProxyServer({});

    // proxy requests to pact server to contain actual host url rather than the karma url
    proxy.on('proxyReq', req => req.setHeader(
      'Origin',
      (skyPagesConfig.skyux.host || {}).url || 'https://host.nxt.blackbaud.com'
    ));

    // revert CORS header value back to karma url so that requests are successful
    proxy.on('proxyRes', (res, req) => {
      res.headers['Access-Control-Allow-Origin'] = req.headers.origin;
    });

    // provider is part of path so that consuming app can make requests to multiple pact
    // servers from one proxy server.  Use that value to identify proper pact server and then
    // remove from request url.
    const server = http.createServer((req, res) => {
      const provider = url.parse(req.url).pathname.split('/')[1];
      req.url = req.url.split(provider)[1];

      if (Object.keys(pactServers.getAllPactServers()).indexOf(provider) !== -1) {
        proxy.web(req, res, {
          target: pactServers.getPactServer(provider).fullUrl
        });
      } else {
        logger.error(
          `Pact proxy path is invalid.  Expected format is base/provider-name/api-path.`
        );
      }
    });

    server.on('connect', () => logger.info(
      `Pact proxy server successfully started on http://localhost:${ports[ports.length - 1]}`
    ));

    server.listen(ports[ports.length - 1], 'localhost');

    // for use by consuming app
    pactServers.savePactProxyServer(`http://localhost:${ports[ports.length - 1]}`);

    karmaUtils.run(command, argv, 'src/app/**/*.pact-spec.ts')
      .then(exitCode => {
        const tsLinterExitCode = tsLinter.lintSync(argv).exitCode;
        process.exit(exitCode || tsLinterExitCode);
      });
  });
}

module.exports = pact;
