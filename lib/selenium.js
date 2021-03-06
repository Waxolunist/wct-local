/**
 * @license
 * Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */
var chalk     = require('chalk');
var cleankill = require('cleankill');
var freeport  = require('freeport');
var selenium  = require('selenium-standalone');
var which     = require('which');

function checkSeleniumEnvironment(done) {
  which('java', function(error) {
    if (!error) return done();

    var message = 'java is not present on your PATH.';
    if (process.platform === 'win32') {
      message = message + '\n\n  Please install it: https://java.com/download/\n\n';
    } else if (process.platform === 'linux') {
      try {
        which.sync('apt-get');
        message = message + '\n\n  sudo apt-get install default-jre\n\n';
      } catch (error) {
        // There's not a clear default package for yum distros.
      }
    }

    done(message);
  });
}

function startSeleniumServer(wct, done) {
  wct.emit('log:info', 'Starting Selenium server for local browsers');
  checkSeleniumEnvironment(function(error) {
    if (error) return done(error);
    freeport(function(error, port) {
      if (error) return done(error);

      // See below.
      var log = [];
      function onOutput(data) {
        var message = data.toString();
        log.push(message);
        wct.emit('log:debug', message);
      }

      var config = {
        version: '2.47.1',
        seleniumArgs: ['-port', port],
        // Bookkeeping once the process starts.
        spawnCb: function(server) {
          // Make sure that we interrupt the selenium server ASAP.
          cleankill.onInterrupt(function(done) {
            server.kill();
            done();
          });

          server.stdout.on('data', onOutput);
          server.stderr.on('data', onOutput);
        },
      };

      // Ensure that we have the latest version downloaded.
      selenium.install({version: '2.47.1', logger: onOutput}, function(error) {
        if (error) {
          log.forEach(function(line) { wct.emit('log:info', line) });
          return done(error);
        }
        selenium.start(config, function(error) {
          if (error) {
            log.forEach(function(line) { wct.emit('log:info', line) });
            return done(error);
          }
          wct.emit('log:info', 'Selenium server running on port', chalk.yellow(port));
          done(null, port);
        });
      });
    });
  });
}

module.exports = {
  checkSeleniumEnvironment: checkSeleniumEnvironment,
  startSeleniumServer:      startSeleniumServer,
};
