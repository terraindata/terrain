# Fullstack tests

## Overview

The `rr` directory has all fullstack tests including DOM based clicking tests and Redux action record-replay tests.


## Setup the testing environment

### On CI machines

The CI tests are driven by the fullstack stage (.gitlab-ci.yml).

```
fullstack:
  script:
    - rm -rf ./midway/src/assets/.cache || true;
    - MIDWAY_HOST=`hostname`:3000 yarn run build
    - yarn run test-fullstack-setup
    - killall node || true;
    - NODE_ENV=production yarn run start-midway > ./midwayConsole.log 2>&1&
    - sleep 20
    - yarn run test-fullstack-login
    - yarn run test-rr-builder
    - killall node || true;
    - yarn run test-fullstack-teardown
  stage: fullstack
  when: always
```

`yarn run test-fullstack-setup` starts a headless Chrome container, the moviesdb elastic instance, and the moviesdb postgres instance. Because the moviesdb pg instance does not have a built-in `midway` database, the script also creates the midway database.

`yarn run test-fullstack-login` runs a click based test that creates an algorithm. It is important to run this test first if you need the algorithm there before running other tests.

`yarn run test-rr-builder` runs a Redux action replay based test that replays Redux builder actions by dispatching the actions to the TerrainStore Redux store.


### On local machine

You need to create a similar testing environment before starting the fullstack tests.

1. Run `yarn run test-fullstack-setup` to start the containers. You might need to remove existing postgres containers before running this command.
2. Run `rm -rf ./midway/src/assets/.cache/; MIDWAY_HOST=your-machine-ip:3000 yarn run build` to build the front-end. Please remember to replace the `your-machine-ip` with your local machine's IP address, like 192.168.1.12.
3. Run ` ./midway/test/scripts/reset_fullstack_midway.sh` to reset the `midway` database and start the midway. Please notice that because the script drops the midway database then creates a new one and restarts the chrome container, so there won't be any algorithm in the database. After this, you should be able to load the app from http://your-machine-ip:3000
4. Run `yarn run test-fullstack-login` to start the login test. If you want to update the baseline screenshots, run the command with `-u` parameter.
5. Run other tests that needs an algorithm, such as `yarn run test-rr-builder`. Same as the above case, `-u` forces the test to generate the baseline screenshots.


## Record and replay

### Overview

`TerrainStoreLOgger.tsx` implements the record and replay. `TerrainStoreLogger.reduxMiddleWare` is a Redux store middleware, which is invoked before invoking all other actions, so it is able to record all actions. When the flag `TerrainStoreLogger.serializeAction` is true, the middleware stores the action into TerrainStoeLogger.actionSerializationLog. Because payloads of the actions could be Immunity objects, we can't use JSON.stringify to turn the action to a string. The store action is serialized to a string before been pushed to the array via `Classes.tsx::RecordsSerializer`.

`TerrainStoreLogger.tsx::replayAction` can display the action by deserializing the action string, and dispatching the action to the TerrainStore.


## Create new actions with rr.

`yarn run rr --record` opens a new builder Chrome window for you, and records all actions while you use the builder. Before you invoke `yarn run rr`. It would be good that you setup the environment first by following setup 1,2,3,4 in the section of setup testing environment on local machine.

`yarn run rr --record` saves the data in TerraiNStoreLogger.actionSerializationlog into a `actions.json` file. You can replay actions in the `actions.json` file by `yarn run rr --replay`.

## Create new test with the action log

You need to create a new test directory following the pattern of the `rr/test/builder`. Create a new directory such as `rr/test/b2`, then copy `rr/test/builder/ReplayTests.ts` into `rr/test/b2`, and move the recorded actions into the new directory. Then you can create a new yarn command `test-rr-b2: "jest ./rr/test/b2 --forceExit"` in `package.json`. Finally run the `yarn run test-rr-b2` to generate the baseline screenshots. If you want to add the test to CI, just append the `yarn run test-rr-b2` after `yarn run test-rr-builder` in `.gitlab-ci.yml`.

