# Midway: Terrain Search Back-end

## Overview

### What Midway Does

Midway handles backend requests from Terraformer.

### How Terraformer Is Built

Midway stores and serves all of Terraformer's data (user accounts,
groups, algorithms, variants, etc.), authenticates users when they log in, and passes queries from Terraformer to
the backing DB (Elastic, MySQL) and returns the results. Midway is built in Node and has a CRUD-like API.

## Setup

Follow the Terraformer README instructions to setup the repository. To start midway:
`yarn start` starts Midway.

## Directory Overview

### src

Contains the source code for midway

### src/app

Contains App.ts, Router.ts, route handlers and other app-related sources. Each route handler is in its own directory.

### src/database

Contains database-specific implementations of various interfaces, such as the TastyORM and the /query route handler.

### src/tasty

Contains the TastyORM, a simple ORM used to abstract database queries from the specific database beign queried. Used to store and retrieve terraformer state data.

### test

Contains unit tests for Midway. test's directory structure mirrors that of midway/src. Unit tests for a particular file in midway/src will be found in the same location in midway/test. Test files must be suffixed with 'Tests' in order to be run by jest. 

## Features

### File I/O

#### Import

Imports a csv/json into Midway. Headless cURL request:
```
curl -X POST <midway address>/midway/v1/import/headless -F templateId=<template id> -F persistentAccessToken=<persistent template access token> -F filetype="<csv or json or json [type object]>" -F file="@<filename>"
```

#### Export

Exports results from Terraformer as a csv/json/json [type object] file. Headless cURL request:
```
curl -X POST -H 'Content-Type: application/json' -H 'Accept: application/json' -d '{"templateId":<template id>,"persistentAccessToken":"<persistent template access token>","body":{"dbid":<database id>,"templateId":<template id>, "variantId":<variant id>,"filetype":"<csv or json or json [type object]>"}}' '<midway address>/midway/v1/export/headless'
```

#### Template Creation

Create a template for import/export. Headless cURL request:
```
curl -X POST -H 'Accept: application/json' -H 'Content-Type: application/json' -d '{"id":<user id>,"accessToken":"<access token>","body":{"name":"<template name>","dbid":<database id>,"objectKey":"<export only, string value for json [type object]>","rank":<export only, bool>,"dbname":"<ES index>","tablename":"<ES type>","csvHeaderMissing":<bool>,"originalNames":<array of column names i.e. ["pkey","column1","column2"]>,"columnTypes":<column type object i.e. {"pkey":{"type":"long"},"column1":{"type":"array","innerType":{"type":"text"}},"col2":{"type":"date"}}>,"primaryKeys":"<primary keys>","transformations":<array of transformations i.e. [{"name":"renames","colName":"column2","args":{"newName":"col2"}}]>}}' "<midway address>/midway/v1/<import or export>/templates/create"
```

### Credentials

Stores credentials such as SFTP, SSH, email, etc. for the scheduler. Create a new credential from localhost using a cURL request:
```
curl -X POST -H 'Content-Type: application/json' -H 'Accept: application/json' -d '{"id":<user id>,"accessToken":"<access token>","body":{"name":"<name>","type":"<sftp/ssh/email/etc.>","permissions":1,"meta":"{\"host\":\"<SFTP IP>\",\"port\":<SFTP port, usually 22>,\"username\":\"<username>\",\"password\":\"<password>\"}"}}' 'localhost:3000/midway/v1/credentials'
``` 

### Scheduler

Allows users to schedule persistent jobs within Midway. Headless cURL request:
```
curl -X POST -H 'Content-Type: application/json' -H 'Accept: application/json' -d '{"templateId":<template id>,"persistentAccessToken":"<persistent template access token>","body":{"jobType":"<import or export>","schedule":"<cron format>","sort":"<asc or desc>","transport":{"type":"<sftp/ssh/email/etc.","id":<credentials id>,"filename":"<full path to file in SFTP server>"}, "paramsJob": {<params for headless import or export i.e. "dbid":<database id>,"templateId":<template id>, "variantId":<variant id>,"filetype":"<csv or json or json [type object]>">}}}' '<midway url>/midway/v1/scheduler/create'
```

## Testing

### Back-end

Included in the `midway/test` folder.

Run the `yarn run jest-test` command to run the back-end tests.

#### API Tests in Back-end test files

The existing back-end unit test files (e.g. `midway/test/unit/TastyElasticExecutor.tsx`) may be used for executing
API tests, in addition to just functional unit tests.  API tests are those which call API endpoints of midway in the
same way you might do with `curl`, i.e. using the full HTTP stack to execute requests on the API and checking the
results of those requests.

We use `supertest` to provide this API test functionality, specifically for being able to execute HTTP requests and
checking their results from within our unit test files.  The reason `supertest` is used over e.g. a plain HTTP library
is that `supertest` ensures that midway is running (or it starts it temporarily on its own) before running the test.

Here is an example of how to perform an API test for midway from inside a midway unit test:
```javascript
test('GET /midway/v1/schema', (t) =>
{
  request(App)
      .get('/midway/v1/schema')
      .then((response) => {
        if (response.text !== '')
        {
          t.pass();
        } else
        {
          t.skip('GET /schema request returned empty response body');
        }
      });
  t.end();
});
```

## Debugging

### Back-end

* Anything from `winston.info` will logged to your terminal in the same process (you will need to
  `import * as winston from 'winston';`).
* Please post any other debugging tips here.

## Troubleshooting

* Don't panic.
* Node or npm errors: `yarn` - you may be missing packages.
* Importing something and it comes up as `undefined`?
  - Check to make sure you don't have a circular dependency (importing something that imports itself)
  - Make sure you are `export`ing and `export default`ing from the file
