# Terrain Search Front-end

## Standards / Conventions

- Capitalize all React component names and filenames (applies to style files as well)
	Most `.js` and `.less` files should be capitalized.
- `{` and `}` are both on their own lines, for legibility.
	Same applies to `[` and `]` when appropriate.
- Camel case function names. 
	e.g. `doABarrelRoll()`
- Use JSX optimizations whenever possible, but not at the expense of legibility.
	e.g. `() => { ... }` instead of `function() { }`, `useTheForce(): { ... }` instead of `useTheForce: function() { ... }`
- Selectors in stylesheets should each go on their own line.
	e.g. Don't do `.first, .second, .third .thirds-kid, .fourth[type=text]`, but rather put a newline after every comma.
- CSS classes are named with `-`.
	e.g. `blue-and-black` or `white-and-gold`
- `// TODO` should be treated like poison. 
	Why write `TODO` when you can do it correctly right now? Tech debt is evil. The Death Star was built upon tech debt, and look what happened to it. `Tech Debt == Death Star` is truthy.
	But if you absolutely have to leave something for later or make a reminder note, write `// TODO [something I can't do right now]` so that we can keep track.
- Optimal directory size is two to five files.
	No directories in `src` with over ten files.
	No objects / namespaces with over ten keys.
- Say yes to whitespace for legibility.
- Break up template rendering when it makes sense. Name functions that return HTML `render[Description]`
- Use 'single quotes' in Javascript, "double quotes" in HTML
- `{}` should follow every `if`, `for`, `while`, etc.
- Don't mix `||` and `&&` without `()`.
	Who knows boolean order of operations anyways?
- Name props that accept event handlers `on[EventName]`, and name the handler functions `handle[EventName]`
  e.g. `onTransformToSuperSaiyan={this.handleTransformToSuperSaiyan}`
- Every feature-adding merge should have appropriate test coverage to be accepted.
	Nearly every bug-solving merge should have a test covering the buggy case.
	TDD FTW!
- Comma after the last line in an object.`,`
	This makes adding new lines to objects easier and allows for a cleaner merge.`,`
	Note: You can't do this in JSON.`,`
- Commits should be solidly incremental and should have a helpful one-line explanation.
	Rebase and squash on your feature branch before merging if you have too many commits, or unhelpful commit messages.
	`git log` in master should always look beautiful and be a helpful history of what has happened.
	Commit to good commits.
- Code should read like English. Comment when necessary, but try your best to write code that doesn't need comments.
- Be keen on adding to this README, and keen on trimming it down.
- None of these standards are set in stone; if you have an idea for a way to improve these, make it known. Coding practices evolve.
- No code is set in stone, either. Refactor when you find something that you know you could do better.
	Refactor responsibly: test your changes, and assess cost-benefit-analysis before starting to be certain that your time is well-used.
- We only deploy from `master`.
- Use effective markdown syntax in this file.
- Constants are named with all caps and underscores
	e.g. `var ANSWER_TO_THE_ULTIMATE_QUESTION = 42;`
- No global variables; every variable must be preceded by `var`.
- Only one variable per `var`, for legibility. Don't separate variables by commas.
	e.g. Don't do `var first = 'Luke', second = 'Leia', third = 'Han';` etc. Instead, put each variable on its on line.
- No not believing in yourself.

## Major Dependencies

The Terrain search front-end is built upon these technologies:

- React
- Typescript
- JSX / ES6
- Redux
- Immutable
- Webpack
- LESS
- Tape, for testing (https://github.com/substack/tape)

## Directory Overview

### src

Source code for the front-end. There may not need to be any other directories in the `src` folder except for `app`, so we may want to flatten this level.

### src/app

Contains the React app. 

### src/app/components

Contains all React components and styles. Directories in here should be self-explanatory.

### src/app/data

Contains Actions and Stores for Redux.

### src/app/util

Utility functions or styles that are used across multiple files.

## src/test

Contains test code.

## src/typings

Contains TypeScript typings.

*Note*: When installing new types, make sure to `cd src` before you `tsd install`

## Setup

1. Install Homebrew
	`ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"`
2. Install Node
	`brew install node`
3. Install npm
	`brew install npm`
4. `npm install`
5. `npm start` - dev server now running at [localhost:8080]

Whenever new packages are installed from branches merged to master, run `npm install` locally.

## Deploying

From `master` branch:
```
npm run deploy
```

## Testing

`npm run test` - runs tests continually in another copy of Chrome

Sometimes your tests may trigger errors that cause your test browser to crash, and you will see karma report:
`No captured browser.`
When this happens, you need to quit Karma (Ctrl + C) and restart it.

Note: when adding new tests, make sure to include `t.end()` at the end of every test (or `t.plan(x)` at the beginning), or else the test suite will hang.

## Running with Midway (via Docker)

1. Install Docker and Docker Compose (these are both included in the [Docker Toolbox for Mac](https://docs.docker.com/mac/step_one/)).
1. Clone [Midway](http://git.terrain.int/terrain/midway).
1. In Midway's directory, run `make docker`.
1. Clone [Tiny](http://git.terrain.int/rbeerman/tiny).
1. In Tiny's directory, run `docker build --tag=tiny .`.
1. In this directory, run `docker-compose up`. (NOTE: This launches a long-running process that takes over your terminal, so subsequent commands must be run in new terminals.)
1. Also in this directory, run `MIDWAY_HOST=$(docker-machine ip default) npm run start-docker` if on OS X. If on Linux, `MIDWAY_HOST=localhost npm run start-docker` may work instead, but I have not tested that.

## Useful Tutorials

- [http://jaysoo.ca/2015/09/26/typed-react-and-redux/]

## Code Overview

### Layout

The `src/app/components/layout` directory contains all files pertinent to layout (i.e. positioning) of HTML components on the page.
* `PanelMixin`: A mixin to include in components that should be treated as drag-and-droppable "panels." Panels accept a variety of props that dictate how they can be dragged, what happens when they're dragged, and what happens when they're dropped.
* `LayoutManager`: Contains a set of panels, passed in as an object through the `layout` prop. The panels are treated either as rows, columns, or cells. The `layout` object can contain nested row/column/cell objects, which will be resolved into LayoutManagers; this allows for short-hand when writing LayoutManager layouts.

### Data / Actions / Redux

Our front-end data layer is powered by Redux. In brief, Redux provides:
1. A "store" which contains the application's data/state, and allows for subscribers to listen to changes in state.
2. "Actions" which are dispatched by the view (anywhere within the React code) and may cause the application to enter a new state.

#### The Store and Reducers

The store is created by a set of "reducers," which are pure functions (no side effects) that accept a state and an action and return either
- a new state object, if the action caused a change in state (do not mutate the state object that is passed)
- the same state object that was passed, if the action did not affect the state

Our set of reducers are contained in `src/app/data/Store.js`, but as the app grows, they should be broken out into separate files and sub-directories. `Store.js` returns our store object, so any JS file can receive the store by including it.

In the future, we may want to have multiple stores, to power different types of data (e.g. builder data versus team/administrative data).

The connection to the back-end will probably listen for changes to the store, send changes via AJAX to the back-end endpoint, and receive the new state of the application (e.g. results and ordering, for the builder).

#### Actions

An action object contains:
1. A string `type` which is unique that type of action
2. Any metadata applicable to that action

The types of actions that we can dispatch are located in `src/app/data/ActionTypes.tsx`. These are nested / namespaced / categorized (e.g. `ActionTypes.cards.select.moveField => "cards.select.moveField"` or `ActionTypes.inputs.changeKey => "inputs.changeKey"`). More details and helper functions are located in that file.

Redux works well with "action creators" and "action dispatchers". Both are defined in `src/app/data/Actions.tsx` (though we may need to break them out into separate files later). Action creators are functions that accept structured arguments and return an action with the appropriate type and metadata (e.g. `Actions.create.cards.select.moveField(card, fieldIndex, newIndex)` will return an action with `{type: ActionTypes.cards.select.moveField, card: card, curIndex: fieldIndex, newIndex: newIndex }`). Action dispatchers are functions with the same parameters as the creators that both create the action and dispatch it to the store. For every action creator that we have, a dispatcher is automatically made. In practice, you will probably only need to use the dispatchers, and not the creators, but it may be helpful to have both.

To add a new action:
1. Add the action type to `ActionTypes.tsx`
2. Add the action creator to `Actions.tsx`
3. Digest that action in the appropriate reducer in `Store.js`

## Troubleshooting

1. Node or npm errors: `npm install` - you may be missing packages.
2. Test suite doesn't run all tests: make sure you have added correct `t.plan(x)` or `t.end()` statements to every test, otherwise the test suite will hang.
3. Assume it's an early sign of the apocalypse. Hide your kids. Run.