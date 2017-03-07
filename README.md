# Terraformer: Terrain Search Front-end

## Overview

### What Terraformer Does

Terraformer is the front-end web app that configures search in TerrainDB. Using Terraformer, customers can interact with their TerrainDB stack via a friendly web interface. Users use Terraformer to create and manage their TerrainDB search algorithms, run ad-hoc queries, see basic analytics and server performance data, set up error alerting and reporting, and implement A/B tests.

Each customer (aka "team") will have Terraformer running on their stack alongside TerrainDB. The team's employees (aka "users") who work with TerrainDB will have individual user accounts within Terraformer. Users can have different privileges within Terraformer.

In Terraformer, a team can have multiple "groups." A group contains two things: a set of "algorithms" and a set of "members" (more on those later). An algorithm is a process for taking a set of "inputs" (e.g. from a customer's search) into TerrainDB and returning a set of "results" (e.g. items stored in TerrainDB). For example, an algorithm for Airbnb's apartment search might take inputs like "location," "number of guests," and "max price," search through Airbnb's apartment listings table for any matching listings, and then sort them in some order. Each algorithm has one or more "variants." A variant specifies the exact process in TQL ("TerrainDB Query Language") that an algorithm should take to go from inputs to results. Variants are configured in the "Builder" (more on that later). Variants can have one of four statuses: "Build" (the variant is being worked on), "Approve" (the variant is ready for an admin to review and promote to Live), "Live" (the variant is being used in production), and "Archive" (the variant is no longer pertinent and is stashed away). Only variants in Build status can be changed in Terraformer. There can be multiple variants in each status, or none.

The group's members are users who have certain privileges within that group. Each group member has one of three "roles" in that group: "admin," "builder," or "viewer" (multiple members can have the same role). Viewers can see everything within a group, but can't make any changes. Builders can create new Variants within Algorithms and change any Variants that aren't in Live status (nor can they promote a Variant to Live). Group admins can do all that Builders can do, and can move variants to/from the Live status, create new Algorithms, and edit the roles for all users within a group.

The heart of Terraformer is the "Builder," where users can compose Variants and preview their results. The Builder works by creating, editing, nesting, and re-arranging "Cards" -- objects which represent certain TQL statements. The list of Cards in the builder compiles to the Variant's TQL. You can set up sample inputs into the Variant and also view sample results that are actually returned by TerrainDB.

In the future, we will expand Terraformer by adding new apps for analytics, server performance, TQL editing, error monitoring and reporting, set up A/B tests, and more.

One last note: a team has one or more "System Admins" (aka sysadmins) who can create new users, create new groups, disable existing users, and promote other users to be sysadmins. Sysadmins can also give themselves any role within any group.

### How Terraformer Is Built

Terraformer is built in Javascript. It runs on the user's browser. The user's browser downloads all of the code for Terraformer when they first navigate to Terraformer's URL. Though the URL in the browser will change as they use the app, they are not actually navigating to a different webpage; Terraformer is modifying the URL via Javascript to reflect where the user is in the app.

The back-end for Terraformer is called "midway." Midway stores and serves all of Terraformer's data (user accounts, groups, algorithms, variants, etc.), authenticates users when they log in, and passes queries from Terraformer to TerrainDB and returns the results. Midway is built in Go and has a CRUD-like API.

## Setup

1. Install and run `midway` (optional)
1. Install Homebrew
  `ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"`
1. Install Node
  `brew install node`
1. Install npm
  `brew install npm`
1. `npm install`
1. `npm install -g tsd`
1. `npm install -g babel`
1. `npm run start-local` (with local midway) or `npm start` (without midway) - dev server now running at [localhost:8080](localhost:8080).
1. Default user login: `luser` / `secret` (for local midway) or ask Luke for your hosted account details (without midway)
1. Install Open Sans on your machine: [https://www.fontsquirrel.com/fonts/open-sans]

Whenever new packages are installed from branches merged to master, run `npm install` locally.

## Major Dependencies

The Terrain search front-end uses these technologies:

- React
- Typescript
- JSX / ES6
- Redux
- Immutable
- LESS
- ReactRouter
- Webpack
- npm
- Tape, for testing (https://github.com/substack/tape)

## Standards / Conventions

- This README is the place where information about building and programming in Terraformer lives. 
  Processes, standards, guides, hints, etc. should be added here and merged into the repo accordingly.
  Do not add wiki pages for anything that is specific to Terraformer code.
  Use proper Markdown syntax in this README.
  Add additional sub-READMEs in sub-folders if necessary, and link to them from this README.
- Capitalize all class names, React component names, and filenames
  e.g. `class MillenniumFalcon {..}`, `MillenniumFalcon.tsx` and `MillenniumFalcon.less`
- Camel case function names. 
  e.g. `doABarrelRoll()`
- `{` and `}` are both on their own lines, for legibility.
  Same applies to `[` and `]` when appropriate.
  e.g.
  ```
  let castSpell = (spell: Spell) =>
  {
    ...
  }
  ```
- Use JSX optimizations whenever possible
  e.g. `() => { ... }` instead of `function() { }`, `useTheForce() { ... }` instead of `useTheForce: function() { ... }`
- Selectors in stylesheets should each go on their own line.
  e.g. instead of `.first, .second, .third .thirds-kid, .fourth[type=text]`, put a newline after every comma.
- CSS classes are named with `-`.
  e.g. `blue-and-black` or `white-and-gold`
- Only use LESS files; don't use CSS files.
- In LESS files, nest classes as much as possible.
- Any component that renders JSX (HTML) with CSS classes should include its own LESS file with appropriate CSS
- The structure and order of LESS files should mimic the structure and order of the JSX
- Avoid `// TODO` at all costs
- Avoid commenting; aim to write code that doesn't need comments
- Interfaces are named with the letter 'I'
  e.g. `IRobot`, `IAyeAye`
- Enums are named with the letter 'E' and are singular
  e.g. `enum ECharacter { MichaelScott, JimHalpert, PamBeesley }; // let myFavoriteCharacter = ECharacter.JimHalpert`
- Name functions that return HTML like: `render[Description]`
  e.g. `renderLizLemon()`, `renderJackDonaghy()`
- Use 'single quotes' in Javascript, "double quotes" in HTML
- `{ ... }` should follow every `if`, `for`, `while`, etc.
- Don't mix `||` and `&&` without `()`.
  Who knows boolean order of operations anyways?
- Comma after the last line in an object.`,`
  This makes adding new lines to objects easier and allows for a cleaner merge.`,`
  Note: You can't do this in JSON.`,`
- Name variables clearly.
  E.g. `user` or `users` for user objects, `userId` or `userIds` for ids
- Booleans should be named clearly with `is` or `can`, e.g. `isWizard` or `canDoTheCanCan`
- Constants are named with all caps and underscores
  e.g. `const ANSWER_TO_THE_ULTIMATE_QUESTION = 42;`
- Only one variable per `var` / `let`, for legibility. Don't separate variables by commas.
  e.g. Don't do `var first = 'Regina George', second = 'Gretchen Wieners', third = 'Glenn Cocoo';` etc. Instead, put each variable on its on line.
- In React, name props that accept event handlers `on[EventName]`, and name the handler functions `handle[EventName]`
  e.g. `onTransformToSuperSaiyan={this.handleTransformToSuperSaiyan}`
- Follow React's paradigm of building smaller apps within apps (decomposition). Try to keep your files under 200 lines of code.
- Be keen on adding to this README, and keen on trimming it down.
- None of these standards are set in stone; if you have an idea for a way to improve these, make it known.
- No code is set in stone, either. Refactor when you find something that you know you could do better.
  Refactor responsibly: test your changes, and before you start be certain that your time will be well-used.
- We only deploy from `master`.
- Believe in yourself.

## Directory Overview

### src

Source code for the front-end. Has directories for `app`, `images`, `test`, `typings`

### src/app

Contains the React app. The `app` directory splits many smaller apps by function, e.g. `builder`, `browser`, `auth` (for login / authorization), `common` (shared components), `util` (utility functions), etc.

### src/app/[smaller_app]/components

Contains one or more of:
- `[SmallerApp]Types.tsx`: defines any interfaces, classes, enums, etc. relevant to that app
- `components/`: contains React components and styles
- `data/`: contains Redux data files

### src/app/[smaller_app]/data

Contains Actions and Stores for Redux.
- `[SmallerApp]ActionTypes.tsx`: a static object of strings. Add new action types here.
- `[SmallerApp]Actions.tsx`: an object of functions that dispatch Actions to that app's Store.
- `[SmallerApp]Store.tsx`: the Store that defines that app's default state and its reducers
- `[SmallerApp || CategoryOfFunctions]Reducers.tsx`: defines reducers relating to a common function in that smaller app. If the smaller app doesn't have many different actions, there may be just one reducers file.

### src/typings

Contains TypeScript typings.

*Note*: When installing new types, make sure to `cd src` before you `tsd install`

## Packages and Imports

### To install a package from npm

`npm install [package-name] --save`

This will install the package and also add a reference to it in your `package.json` file. You should commit the change to the `package.json` file and advise other developers to run `npm install` once they pull in your commit.

If you forget to add `--save`, no line will be added to `package.json`

You will then need to `cd` into `src` and run `tsd install [package_name]` to install any associated typing files. This will add a new directory to `src/typings`, which you should include in your commit.

If there are no public typings available for this package, then `tsd` will tell you that it has written 0 files. In that case, you cannot use the `import` syntax to include the package, but must use the `require` syntax.

For example, to add `truffle-oil` to my app, I would:
1. `cd ~/git/Search`
1. `npm install truffle-oil --save`
1. `git add package.json`
1. `cd src`
1. `tsd install truffle-oil`
1. `cd ..`
1. `git add typings`

### Importing / requiring files

To include another `.tsx` file from within the Terraformer codebase (`/src`), use `import [ClassName] from '[relative path]'`, e.g.
`import DotComponent from './DotComponent.tsx';`
`import NapoleonDynamite from '../../movies/NapoleonDynamite.tsx';`

To include any file that's not a `.tsx` from within the Terraformer codebase, use `const [ClassName] = require('[relative path]')` e.g.
`require('./Pay.less');`
`const FreddyAnd = require('../../data/FreddyAnd.json');`

To include a package install from `npm`, use `import * as [ClassName] from '[package_name]';` if there are typings available, and `let [ClassName] = require('[package_name]');` if not. e.g.
`import * as TheForce from 'the-force';`
`const UnpopularLibrary = require('unpopular-library');`

## Testing

Testing? What testing? Here are some instructions for how to run karma/tape, for which there aren't any useful test cases yet...

`npm run test` - runs tests continually in another copy of Chrome

Sometimes your tests may trigger errors that cause your test browser to crash, and you will see karma report:
`No captured browser.`
When this happens, you need to quit Karma (Ctrl + C) and restart it.

Note: when adding new tests, make sure to include `t.end()` at the end of every test (or `t.plan(x)` at the beginning), or else the test suite will hang.

## Useful Tutorials and Articles

- [http://jaysoo.ca/2015/09/26/typed-react-and-redux/] -- React + TypeScript + Redux
- [https://hackernoon.com/avoiding-accidental-complexity-when-structuring-your-app-state-6e6d22ad5e2a#.5mvnsgidm] -- outlines guidelines to use when structuring Redux state models
- [https://gist.github.com/paulirish/5d52fb081b3570c81e3a] -- list of JS operations that trigger layout and can cause force synchronous reflow

## Gotchas

A list of common programming gotchas in this codebase

- `let` scope is different than `var` (thankfully) but can cause unexpected errors
  ```
  if(someCondition)
  {
    var someVar = "someValue";
  }
  console.log(someVar); // either "someValue" or "undefined"
  
  if(someOtherCondition)
  {
    let someLet = "someOtherValue";
  }
  console.log(someLet); // ERROR: cannot find name someLet
  ```
- Subscribe to Redux stores within the `componentDidMount` method. Do not subscribe in the constructor, or else you will likely see many React `setState` warnings
- Do not call `fetch` from within a constructor or you may see similar warnings (React thinks that state changes are happening from a higher component's `render` method)
- ReactVirtualized: The library uses `shallowCompare` to detect prop changes, so you may need to pass additional props to indicate that data have changed.
  More here: [https://github.com/bvaughn/react-virtualized#pure-components]
- Inline functions in ES6 don't like comments:
  ```
  var works = () =>
     console.log('success');
     // log something
  works(); // logs 'success';

  var doesntWork = () =>
     // log something
     console.log('success');
  doesntWork(); // nothing is logged
  ```

## Troubleshooting

1. Node or npm errors: `npm install` - you may be missing packages.
2. Test suite doesn't run all tests: make sure you have added correct `t.plan(x)` or `t.end()` statements to every test, otherwise the test suite will hang.
3. Assume it's an early sign of the apocalypse. Hide your kids.