#!/usr/bin/env node
'use strict';

const { runIntegration } = require('../../dist/scripts/integration');

runIntegration({
  fixture: './test/integration/fixtures/framework-integration.dsa.ts',
  requireContent: true,
}, process.env, process.cwd()).catch((error) => {
  console.error(`[dazscript integration] ${error.message}`);
  process.exitCode = 1;
});
