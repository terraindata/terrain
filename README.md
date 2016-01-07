# Terrain Search Front-end

## Standards / Conventions

1. Capitalize all React component names and filenames (applies to style files as well)
	Most `.js` and `.less` files should be capitalized.
2. `{` and `}` are both on their own lines, for legibility.
	Same applies to `[` and `]` when appropriate.
3. Camel case function names. 
	e.g. `doABarrelRoll()`
4. Use JSX optimizations whenever possible, but not at the expense of legibility.
	e.g. `() => { ... }` instead of `function() { }`, `useTheForce(): { ... }` instead of `useTheForce: function() { ... }`
5. Selectors in stylesheets should each go on their own line.
	e.g. Don't do `.first, .second, .third .thirds-kid, .fourth[type=text]`, but rather put a newline after every comma.
6. CSS classes are named with `-`.
	e.g. `blue-and-black` or `white-and-gold`
7. `// TODO` should be treated like poison. 
	Why write `TODO` when you can do it correctly right now? Tech debt is evil. The Death Star was built upon tech debt, and look what happened to it. `Tech Debt == Death Star` is truthy.
	But if you absolutely have to leave something for later or make a reminder note, write `// TODO [something I can't do right now]` so that we can keep track.
8. Optimal directory size is two to five files.
	No directories in `src` with over ten files.
	No objects / namespaces with over ten keys.
9. Say "yes" to whitespace for legibility.
10. Use whatever quotes make you happy but keep it consistent within the same file / piece of code.
11. `{}` should follow every `if`, `for`, `while`, etc.
12. Don't mix `||` and `&&` without `()`.
	Who knows boolean order of operations anyways?
13. Every feature-adding merge should have appropriate test coverage to be accepted.
	Nearly every bug-solving merge should have a test covering the buggy case.
	TDD FTW!
14. Comma after the last line in an object.`,`
	This makes adding new lines to objects easier and allows for a cleaner merge.`,`
	Note: You can't do this in JSON.`,`
15. Every file ends with `module.exports = YourClassyClassName;`. In other words, name your exports.
	Don't do `module.exports = { ... }` because then the Webpack/React/browser won't work together so well and you will see components in the React Chrome plugin that are called `module.exports` and that's not helping anybody.
16. Commits should be solidly incremental and should have a helpful one-line explanation.
	Rebase and squash on your feature branch before merging if you have too many commits, or unhelpful commit messages.
	`git log` in master should always look beautiful and be a helpful history of what has happened.
	Commit to good commits.
17. Code should read like English. Comment when necessary, but try your best to write code that doesn't need comments.
18. Be keen on adding to this README, and keen on trimming it down.
19. None of these standards are set in stone; if you have an idea for a way to improve these, make it known. Coding practices evolve.
20. No code is set in stone, either. Refactor when you find something that you know you could do better.
	Refactor responsibly: test your changes, and apply appropriate cost-benefit-analysis before starting to be certain that your time is well-used.
21. We only deploy from `master`.
22. Use effective markdown syntax in this file.
23. Constants are named with all caps and underscores
	e.g. `var ANSWER_TO_THE_ULTIMATE_QUESTION = 42;`
24. No global variables; every variable must be preceded by `var`.
25. Only one variable per `var`, for legibility. Don't separate variables by commas.
	e.g. Don't do `var first = 4, second = 8, third = 15;` etc. Instead, put each variable on its on line.
11. No not believing in yourself.
24. Linear ordering in ordered lists is overrated.

## Major Dependencies

The Terrain search front-end is built upon these technologies:

- React (tutorial: link forthcoming)
- JSX / ES6 (tutorial: link forthcoming)
- Redux (tutorial: link forthcoming)
- Webpack (tutorial: link forthcoming)

## Directory Overview

### src

Source code for the front-end. There may not need to be any other directories in the `src` folder expect for `app`, so we may want to flatten this level.

### src/app

Contains the React app. 

### src/app/components

Contains all React components and styles.

### src/app/data

Contains Actions / Stores for Redux.

### src/app/util

Utility functions or styles that are used across multiple files.

## Setup

1. Install **Homebrew**
2. Install **Node**
3. Install **npm**
4. `npm install`
5. `npm start` - dev server now running at [localhost:8080]

Whenever new packages are installed from branches merged to master, run `npm install` locally.

## Deploying

From `master` branch:
	npm run deploy

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

The types of actions that we can dispatch are located in `src/app/data/ActionTypes.js`. These are nested / namespaced / categorized (e.g. `ActionTypes.cards.select.moveField => "cards.select.moveField"` or `ActionTypes.inputs.changeKey => "inputs.changeKey"`). More details and helper functions are located in that file.

Redux works well with "action creators" and "action dispatchers". Both are defined in `src/app/data/Actions.js` (though we may need to break them out into separate files later). Action creators are functions that accept structured arguments and return an action with the appropriate type and metadata (e.g. `Actions.create.cards.select.moveField(card, fieldIndex, newIndex)` will return an action with `{type: ActionTypes.cards.select.moveField, card: card, curIndex: fieldIndex, newIndex: newIndex }`). Action dispatchers are functions with the same parameters as the creators that both create the action and dispatch it to the store. For every action creator that we have, a dispatcher is automatically made. In practice, you will probably only need to use the dispatchers, and not the creators, but it may be helpful to have both.

To add a new action:
1. Add the action type to `ActionTypes.js`
2. Add the action creator to `Actions.js`
3. Digest that action in the appropriate reducer in `Store.js`

## Troubleshooting

1. Node or npm errors: `npm install` - you may be missing packages.
2. Assume it's an early sign of the apocalypse. Hide your kids. Run.