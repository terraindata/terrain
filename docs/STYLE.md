# Style in React

## Style Guidelines

Here is the first version of the Terrain Style Guidelines: 
https://docs.google.com/document/d/1GYKH07cD9jLCEfmTi_4FHRqCVPXrtaBuZrSy6S_MseY/edit


## How to Style

### LESS

Use LESS for padding, margin, width, height, positioning.

### Colors

Use `src/app/common/Colors.tsx` for all Colors (Note that we are 
currently in transition from using LESS, don't put colors in LESS)

The `Colors()` function will return the current Theme.

You can key into that Theme to get the color you need.
e.g. `bg1` or `text2` or `active`

The helper functions `getStyle`, `backgroundColor`, `borderColor` etc. offer
a way to cache previously used style objects, which offers some performance and
memory advantages over generating new style objects / arrays in `render`.
Most of them allow an optional second argument which is the hover color.

#### Applying directly to component

Usually you want to apply a style directly to a component.

```
style={backgroundColor(Colors().bg1)}

style={{
	borderColor: Colors().bg2,
	fontColor: Colors().text1,
}}
```

Try to memoize objects and arrays (unlike the example above) when possible,
e.g. `const STYLE = _.extend({}, borderColor(...), fontColor(...));` and using
`style={STYLE}`

##### Radium

If you have hover colors, you need to use Radium

```
import * as Radium from 'radium';

@Radium
export class MyComponent extend TerrainComponent<Props> {
	...
	
	render()
	{
		return (
			<div
				key={'element-' + this.props.id}
				style={backgroundColor(Colors().bg1, Colors().inactiveHover)}
			/>
		);
	}
}
```

You need to give unique `key`s to any elements that have Radium hover styles.

Radium allows hover styles using a ":hover" key. (Same for other selectors like :active)
The style above evaluates to
```
{
  backgroundColor: Colors().bg1,
  ":hover": {
    backgroundColor: Colors().bg2,
  }
}
```

With Radium, you can also specify arrays of styles that it will combine

```
style={[
  backgroundColor(Colors().bg1),
  fontColor(Colors().text1),
]}
```

Again, it is good to memoize these arrays and objects.

#### StyleTag

Sometimes you need to apply colors with CSS, either because the selector
is not available as a React element or because it is much easier or more efficient.

The StyleTag component allows you to programmatically generate CSS Styles.

Pass in an object where the keys are the selectors (e.g. `.some-class` or 
`.parent-class .child-class input`) and the values are React.CSSProperties objects.


