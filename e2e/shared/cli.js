#!/usr/bin/env node
'use strict';

const rc = require('rc');
const cli = require('../../.e2e-tmp/node_modules/@skyux-sdk/builder/index');
const argv = rc('skyux', {});

cli.runCommand(argv._[0], argv);
