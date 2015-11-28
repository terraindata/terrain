# Terrain Search Front-end

## Standards / Conventions

1. Capitalize all React component names and filenames (applies to style files as well)
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
7. `TODO` should be treated like poison. 
	Why write `TODO` when you can do it correctly right now? Tech debt is evil. The Death Star was built upon tech debt, and look what happened to it. `Tech Debt == Death Star` is truthy.
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
11. No not believing in yourself.
24. Linear ordering in ordered lists is overrated.

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

## Troubleshooting

1. Node or npm errors: `npm install` - you may be missing packages.
2. Assume it's an early sign of the apocalypse. Panic, scream, and run.