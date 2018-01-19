# Terraformer: Terrain Search Front-end

## Overview

### What Terraformer Does

Terraformer is the front-end web app that configures search in TerrainDB. Using Terraformer, customers can interact with
their TerrainDB stack via a friendly web interface. Users use Terraformer to create and manage their TerrainDB search
algorithms, run ad-hoc queries, see basic analytics and server performance data, set up error alerting and reporting,
and implement A/B tests.

Each customer (aka "team") will have Terraformer running on their stack alongside TerrainDB. The team's employees
(aka "users") who work with TerrainDB will have individual user accounts within Terraformer. Users can have different
privileges within Terraformer.

In Terraformer, a team can have multiple "groups." A group contains two things: a set of "algorithms" and a set of
"members" (more on those later). An algorithm is a process for taking a set of "inputs" (e.g. from a customer's search)
into TerrainDB and returning a set of "results" (e.g. items stored in TerrainDB). For example, an algorithm for Airbnb's
apartment search might take inputs like "location," "number of guests," and "max price," search through Airbnb's
apartment listings table for any matching listings, and then sort them in some order. Each algorithm has one or more
"variants." A variant specifies the exact process in TQL ("TerrainDB Query Language") that an algorithm should take to
go from inputs to results. Variants are configured in the "Builder" (more on that later). Variants can have one of four
statuses: "Build" (the variant is being worked on), "Approve" (the variant is ready for an admin to review and promote
to Live), "Live" (the variant is being used in production), and "Archive" (the variant is no longer pertinent and is
stashed away). Only variants in Build status can be changed in Terraformer. There can be multiple variants in each
status, or none.

The group's members are users who have certain privileges within that group. Each group member has one of three "roles"
in that group: "admin," "builder," or "viewer" (multiple members can have the same role). Viewers can see everything
within a group, but can't make any changes. Builders can create new Variants within Algorithms and change any Variants
that aren't in Live status (nor can they promote a Variant to Live). Group admins can do all that Builders can do, and
can move variants to/from the Live status, create new Algorithms, and edit the roles for all users within a group.

The heart of Terraformer is the "Builder," where users can compose Variants and preview their results. The Builder works
by creating, editing, nesting, and re-arranging "Cards" -- objects which represent certain TQL statements. The list of
Cards in the builder compiles to the Variant's TQL. You can set up sample inputs into the Variant and also view sample
results that are actually returned by TerrainDB.

In the future, we will expand Terraformer by adding new apps for analytics, server performance, TQL editing, error
monitoring and reporting, set up A/B tests, and more.

One last note: a team has one or more "System Admins" (aka sysadmins) who can create new users, create new groups,
disable existing users, and promote other users to be sysadmins. Sysadmins can also give themselves any role within any
group.

### How Terraformer Is Built

Terraformer is built in Javascript. It runs on the user's browser. The user's browser downloads all of the code for
Terraformer when they first navigate to Terraformer's URL. Though the URL in the browser will change as they use the
app, they are not actually navigating to a different webpage; Terraformer is modifying the URL via Javascript to reflect
where the user is in the app.

The back-end for Terraformer is called "midway." Midway stores and serves all of Terraformer's data (user accounts,
groups, algorithms, variants, etc.), authenticates users when they log in, and passes queries from Terraformer to
the backing DB (Elastic, MySQL) and returns the results. Midway is built in Node and has a CRUD-like API.

## README Purpose

Any specific guidelines for Terraformer JS code should be documented in this README and any appropriate sub-READMEs in
nested folders. Do not add wiki pages for anything that is specific to Terraformer code. Use proper Markdown syntax in
this README.

General coding standards for Javascript are located in the TechDocs repo, not in this README.


## Setup


* For Mac:
  * Install Homebrew: `ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"`
  * Install Node: `brew install node`
  * Install yarn: `brew install yarn`
  * Install parallel: `brew install parallel`
  * `brew install mysql`
  * [Download and install](https://docs.docker.com/docker-for-mac/install/) docker for Mac
  * `docker login` (ask for access on dockerhub)
* For Linux:
  * Make sure package lists are up to date: `sudo apt-get update`
  * Install parallel, bash, curl: `sudo apt-get install -y parallel bash curl`
  * Install nodejs v7  repo: `sudo curl -sL https://deb.nodesource.com/setup_7.x | bash -`
  * Update package lists again: `sudo apt-get update`
  * Install nodejs: `sudo apt-get install -y nodejs`
  * Install yarn: `sudo npm -g install yarn`
* Generate ssh keys for your computer (if you don't already have them)
    * https://help.github.com/articles/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent/
* Add these keys to your gitlab key set: https://git.terrain.int/profile/keys
* Checkout our repo somewhere that makes sense, like `~/terrain/` by using git: `git clone git@git.terrain.int:terrain/Search.git`
* `yarn` installs and updates dependencies
* `yarn global add webpack-dev-server`
* `yarn test-back-setup` - starts a local elastic instance
    * NOTE: you need to re-run this every time you restart your computer
    * NOTE: this will clear out any deployed variants/algorithms that you have
* `yarn start` - starts the Midway server, now running at localhost:3000
* `yarn run start-front` - starts the front-end in a Node-Midway compatible way. TODO: Make Midway automatically start the
                        dev front-end server on start (and kill it on end)
* When you want to stop the local elastic instance: `yarn test-back-teardown`
* Default user login: `admin@terraindata.com` / `secret`
* Install Open Sans on your machine: [https://www.fontsquirrel.com/fonts/open-sans] - helps things go faster because
  your browser won't have to fetch Open Sans on each load
* To get the Analytics side running, run the `/sigint` directory. This can run a demo website at localhost:3001 if you pass `--demo`
* To get Analytics dummy data, clone the `Docker` repo and run `analytics/convert.py`

Whenever new packages are installed by other devs / on other branches, run `yarn add` to get the new package locally.

### Auto Styling

To apply the auto styling / formatting, use `yarn run fix` - a combination of `yarn run style` and `yarn run lint`

### Configuring Webstorm IDE

To setup a node project using typescript for debugging inside webstorm:
* Download and extract Webstorm to somewhere like ~/programs/webstorm
  [https://www.jetbrains.com/webstorm/download/#section=linux]
* Run Webstorm and select 'Open existing project...'
  * Select the root directory of the Search repo, for example ~/terrain/Search/
* To run one of the configured scripts via yarn:
  * From the 'Run' menu, select 'Run/Debug Configurations'
  * Click '+' to add a configuration
  * Select 'yarn' from the list of configuration types
  * Put a name in for this configuration
  * Set the command to 'run'
  * Set the script to one of the options listed in package.json, like 'test-back'
  * Make sure the node intepreter is set correctly
  * Set any other args or options you like
  * Now you can run the script inside Webstorm!
  * To debug an npm script add `$NODE_DEBUG_OPTION` to the command line: http://pavelpolyakov.com/2016/05/01/webstorm-npm-tasks-debug/
  * To run & debug jest tests with the integrated jest runner, add a run/debug configuration of type `jest` in the root source directory
  * To debug frontline in webstorm, follow the steps here: https://blog.jetbrains.com/webstorm/2017/01/debugging-react-apps/


## Major Dependencies

You should familiarize yourself with these technologies before pursuing any whole-hearted foray into Terraformer
development. (Of course, a pursuer of a half-assed foray need not bother him/herself.)

Links are to relevant overviews and tutorials.

### Full Stack

- [JSX / ES6](http://ccoenraets.github.io/es6-tutorial/), the newest version of Javascript
- [Typescript](https://www.typescriptlang.org/docs/tutorial.html)
- [Immutable](https://facebook.github.io/immutable-js/)
- [yarn](https://yarnpkg.com/en/), for package managment (primary)
- [npm](https://www.npmjs.com/), for package managment (secondary)

### Front-End

- [React](https://facebook.github.io/react/)
- [Redux](http://redux.js.org/)
- [LESS](http://lesscss.org/)
- [ReactRouter](https://github.com/ReactTraining/react-router)
- [Webpack](https://webpack.github.io/)

### Back-End

- [Node](https://nodejs.org/en/), for running
- [Koa](http://koajs.com/), for routing
- [Jest](https://facebook.github.io/jest/), for testing (primary)
- [Sinon](http://sinonjs.org/), for testing
- [Chai](http://chaijs.com/), for testing (deprecated)


## Coding Standards

Coding standards are in the TechDocs repo under `JS Coding Guidelines.md`. Please familiarize yourself with them and
contribute to them.

## Directory Overview

### src

Source code for the front-end. Has directories for `app`, `images`, `test`, `typings`

### src/app

Contains the React app. The `app` directory splits many smaller apps by function, e.g. `builder`, `library`, `auth`
(for login / authorization), `common` (shared components), `util` (utility functions)

### src/app/[smaller_app]

Contains one or more of:
- `[SmallerApp]Types.tsx`: defines any interfaces, classes, enums, etc. relevant to that app
- `components/`: contains React components and styles
- `data/`: contains Redux data files

### src/app/[smaller_app]/components

Contains the following files:
- React Components saved with `.tsx` extensions, sometimes appending "Component" to the file name, if there is a potential for filename conflicts
- Stylesheets for each component, if needed, which are saved with the `.less` extension, and should have the word "Style" appended to the filename (note: not all files currently have this word appending, but any new files should o)

### src/app/[smaller_app]/data

Contains Actions and Stores for Redux.
- `[SmallerApp]ActionTypes.tsx`: a static object of strings. Add new action types here.
- `[SmallerApp]Actions.tsx`: an object of functions that dispatch Actions to that app's Store.
- `[SmallerApp]Store.tsx`: the Store that defines that app's default state and its reducers
- `[SmallerApp]Reducers.tsx`: defines reducers relating to a common function in that smaller app.

### midway

Contains the code for midway, which acts as Terraformer's middleware.

### midway/src

Contains the source code for midway

### midway/src/app

Contains App.ts, Router.ts, route handlers and other app-related sources. Each route handler is in its own directory.

### midway/src/database

Contains database-specific implementations of various interfaces, such as the TastyORM and the /query route handler.

### midway/src/tasty

Contains the TastyORM, a simple ORM used to abstract database queries from the specific database beign queried. Used to store and retrieve terraformer state data.

### midway/test

Contains unit tests for Midway. test's directory structure mirrors that of midway/src. Unit tests for a particular file in midway/src will be found in the same location in midway/test. Test files must be suffixed with 'Tests' in order to be run by jest. 


## Packages and Imports

### To install a package from yarn

`yarn add [package-name]`

This will install the package and also add a reference to it in your `package.json` file. You should commit the change
to the `package.json` file and advise other developers to run `yarn` once they pull in your commit.

You will then need to try to install any Typescript types that are available for the package:
`yarn add @types/[package-name] --dev` (`--dev` marks that this is a development dependency, not a production one).

If this succeeds, Typescript types are available and you can import this
package with `import * as PackageName from 'package-name';` or `import { ThingOne, ThingTwo } from 'package-name';` syntax. 

If this does not succeed, then there are no publicly
available types, and you have to use `import Package = require('package');`.

For example, to add `truffle-oil` to my app, I would:
* `cd ~/git/Search`
* `yarn add truffle-oil`
* `yarn add @types/truffle-oil --dev`
* `git add package.json`
* Commit the changes


### Importing / requiring files

To include another `.tsx` file from within the Terraformer codebase (`/src`), use
`import [ClassName] from '[relative path]'`, e.g.
`import DarAdalComponent from './DarAdalComponent';`
`import NapoleonDynamite from '../../movies/NapoleonDynamite';`

To include any file that's not a `.tsx` from within the Terraformer codebase, use
`const [ClassName] = require('[relative path]')` 
e.g.  
`require('./Pay.less');`  
`import FreddyAnd = require('../../data/FreddyAnd.json');`  
`import CarrieMathison = require('./CarrieMathison.js');` (again, don't forget `./`)  

To include a package from `node_modules`, use `import * as [ClassName] from '[package_name]';` if there are typings
available, and `import [ClassName] = require('[package_name]');` if not. e.g.
`import * as TheForce from 'the-force';`  
`import UnpopularLibrary = require('unpopular-library');`  

## Testing

### Back-end

Included in the `midway/test` folder.

Run the `yarn run test-back` command to run the back-end tests.

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

### Front-end

We are using Jest for front-end unit testing.

#### How do I run front-end tests?

To run all front-end tests, use:

`yarn test-front`

If you want to run an individual unit test, you can use:
`./node_modules/.bin/jest <path/to/your/test/file>`

#### Where are the test files?

You can find them at `src/test`. It mirrors the structure of `src/app`.

#### Writing your first test

When you add a new feature in the front-end, you will have to test every new component, action creator and reducer. For examples of how to test each of these you can take a look at `src/test/analytics/`

* In Component tests, you will be asserting on the component structure -make sure it renders the correct children in all variantions of component state and props- and also on the component interactions -event handlers and react lifecycle methods-
* In redux action creator tests, you will be asserting that it dispatches all the actions that it is supposed to, to the redux store .
* In redux reducer tests, you will be asserting that the state change is the expected.

#### Test helpers

In `src/test/test-helpers` you can find helper classes and functions that you can use to aid the creation of fake environments to isolate your unit tests and prevent duplicated code.

#### Techonologies

We combine [Jest](https://facebook.github.io/jest/) along with [Enzyme](http://airbnb.io/enzyme/) to fake the component render in unit tests.

## Running in Production

1. `yarn run build-prod` generates production `bundle.js` into `/midway/src/assets/bundle.js`
1. Run midway with `NODE_ENV=production`

## Useful Tutorials and Articles

- [http://jaysoo.ca/2015/09/26/typed-react-and-redux/] -- React + TypeScript + Redux
- [A long Node tutorial covering basics, testing, and some advanced topics](https://blog.risingstack.com/node-hero-tutorial-getting-started-with-node-js/)
- [https://blog.risingstack.com/node-hero-node-js-unit-testing-tutorial/] -- great testing overview for Javascript
- [https://hackernoon.com/avoiding-accidental-complexity-when-structuring-your-app-state-6e6d22ad5e2a#.5mvnsgidm] --
  outlines guidelines to use when structuring Redux state models
- [https://gist.github.com/paulirish/5d52fb081b3570c81e3a] --
  list of JS operations that trigger layout and can cause force synchronous reflow


## Debugging

### Front-end

* Make sure you install the [React Dev Tools for Chrome](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi?hl=en)
* For debugging in the browser, you'll want to use the browser's JS Consle (CMD + Shift + J on Mac)
* Writing `console.log` in your JS code will log output to this console -- this can be useful for basic debugging
* Writing `debugger;` in your code will insert a breakpoint and cause Chrome to pause at that point of execution,
  allowing you to inspect variable values and step forward / into functions. (You have to have the Chrome Console open in order for the breakpoint to catch.)
* If you want to inspect the state and props of React components, you can use the React tab in the Chrome Dev Tools to
  find the component and see its props and state. Tip: Use the element selection tool (top left corner of your dev
  tools) to quickly select the component you care about.
* If you are getting React errors about setting state in the wrong place (e.g. inside of a render method, or after the
  component has unmounted), you can find the code that is causing the error by going into the Source dev tab, enabling
  the Pause on Exceptions and Pause on Caught Exceptions options (top right of the pane), triggering the error, and then
  going a few levels up the stack into the class that caused the error. (Note that on page load there will be a good
  dozen of these caught exceptions that you will need to skip over).


### Back-end

* Anything from `winston.info` will logged to your terminal in the same process (you will need to
  `import * as winston from 'winston';`).
* Please post any other debugging tips here.


## ES6 Tips

### && and || Evaluation and Short Circuiting

The actual result of a logical `&&` or `||` operation is going to be the last value that the comparator examined. So, `3 && 4 === 4` (not simply `true`, but rather, a truthy value) and `false || 4 === 4` (again, not simply `true`).

Javascript also uses “short circuiting,” meaning that it stops looking at parameters once a final truthy/falsy value is certain. So, `&&` will stop and “return” the first falsy value (or the last truthy value, if all are truth), and `||` will stop and “return” the first truthy value (or the last fasly value, if all are falsy)

This means that `3 || 4 === 3` and `0 && 4 === 0`.

It also means you can write `item.name = name || "";` instead of `item.name = name ? name : "";` (fewer characters)
and can write `func && func()` instead of `if (func) { func() }`

You’ll commonly see in the code things like `item && item.fetch && item.fetch()` (if `fetch` doesn't exist, stop trying to make `fetch` happen) or `item.name = name || defaultName || "Gretchen Weiners";` (basically, multiple defaults / failsafes)

This can also cause problems when getting falsy values: `null && false === null !== false`. If you are passing the result of one of these expressions into `if`, your best bet is to leave out the `=== / !==` comparators, and simply write something like `if (null && false)`.

Another example of this problem is: `if ("monica" && "chandler" == true) { log('true'); }` will not log anything (`"monica" && "chandler" == "chandler" != true`).

### Falsy Empty String

The empty string (`""`) is falsy, so `if ("")` will not run the `if`, and `if (!"")` will.

This is important to remember if you are checking for the presence of a string where the empty string is actually allowed. You'll want to write something like `if (str || str === "")` or `if (str !== null && str !== undefined)` or `if (typeof str === 'string')`.

## Gotchas

A list of common programming gotchas in this codebase

#### Scope for let and var

`let` scope is different than `var` (thankfully) but can cause unexpected errors. If you're not used to it. For example:
```javascript
if(isJoey)
{
  var catchphrase = "How you doin'?";
}
console.log(catchphrase); // either the string or undefined```  

Versus:  

if(isPhoebe)
{
  let catchphrase = "Oh no.";
}
console.log(catchphrase); // ERROR: cannot find name catchphrase
```

#### Redux and React gotchas

- Subscribe to Redux stores within the `componentDidMount` method. Do not subscribe in the constructor, or else you will likely see many React `setState` warnings
- Do not call any methods that fetch data from the server and then update a redux store (e.g. `Actions.fetch()`) from within a constructor or you may see similar warnings (React thinks that state changes are happening from a higher component's `render` method). You can put these in `componentDidMount`
- `key` is a reserved name in props, so you can't use it as a prop in your component.

#### ES6 gotchas

Inline functions in ES6 don't like comments if you don't include `{...}`:

```javascript
let works = () =>
  console.log('success');
  // log something
works(); // logs 'success';

let doesntWork = () =>
  // log something
  console.log('success'); // executed and logged at runtime
doesntWork(); // nothing is logged
```

## Troubleshooting

* Don't panic.
* Node or npm errors: `yarn` - you may be missing packages.
* Infinite logo spinning and 401 errors in the console: try in dev tools, go to Application -> Local Storage -> http://localhost:8080/ -> clear local storage and refresh
* Importing something and it comes up as `undefined`?
  - Check to make sure you don't have a circular dependency (importing something that imports itself)
  - Make sure you are `export`ing and `export default`ing from the file
