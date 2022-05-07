# `react-memo.macro`

[![Babel Macro](https://img.shields.io/badge/babel--macro-%F0%9F%8E%A3-f5da55.svg?style=flat-square)](https://github.com/kentcdodds/babel-plugin-macros)

This [babel macro](https://github.com/kentcdodds/babel-plugin-macros) lets you add `React.memo` to any function component with a single line:

```jsx
import { memo } from "react-memo.macro";

function MyComponent1() {
  memo();

  return <div>...</div>;
}

const MyComponent2 = () => {
  memo();

  return <div>...</div>;
};
```

## Usage

First, [configure `babel-plugin-macros`](https://github.com/kentcdodds/babel-plugin-macros/blob/main/other/docs/user.md). Then install this package:

```sh
npm install react-memo.macro --save-dev
```

### Configuration

Create a macro config file per the [official instructions](https://github.com/kentcdodds/babel-plugin-macros/blob/main/other/docs/user.md#config), and add:

```json5
{
  "react-memo.macro": {
  // if true, the macro will add display names to the React.memo-wrapped components
    "addDisplayNames": true | false // default: false
  }
}
```

## Why is this useful?

### Short version

Use this macro if you want to use `React.memo` and you either: 1) prefer to use plain function declarations for your components, or 2) want your components to have `displayName`s.

### Long version

`React.memo` is a no-brainer performance enhancement for lots of components, but it forces you to write your components in particular ways. For instance, suppose you want to `memo` this component:

```jsx
export function MyComponent() {
  return <div>...</div>;
}
```

What's the best way? We could convert it to an arrow or function expression, but transparent performance optimisations shouldn't dictate what syntax we use. If you prefer plain function declarations for your components then your `memo`-ed ones will have totally different structure to the un-`memo`-ed ones.

It gets worse if you want your components to have meaningful `displayName`s (useful if you minify your app, but have error reporting mechanisms and want them to report the names of error-ing components). The [babel-plugin-add-react-displayname](https://www.npmjs.com/package/babel-plugin-add-react-displayname) plugin will give the above component the correct name, but (at time of writing) fails to do so on either of these:

```jsx
export const MyComponent = React.memo(function MyComponent() {
  return <div>...</div>;
});

export const MyComponent2 = React.memo(function () {
  return <div>...</div>;
});
```

After lots of experimentation, you might end up with something like this:

```jsx
function MyComponent() {
  return <div>...</div>;
}

const MyComponent_Memoed = React.memo(MyComponent);
export { MyComponent_Memoed as MyComponent };
```

...but that's a lot of boilerplate, and it still doesn't work perfectly: if you use the component from inside the file where it's defined, you'll get the un-memo-ed version.

This macro takes care of the boilerplate for you, and also optionally adds a display name to the `memo`-ed component.

## Caveats

### Hoisting

Thanks to hoisting, this function can be referenced before it's defined:

```jsx
function MyComponent() {
  return <div>...</div>;
}
```

The transformed version is no longer a plain function declaration (it's translated to a `const` assignment), so function hoisting no longer applies.

In practice this isn't usually a problem since React components normally aren't executed within the scope where they're defined, but it can cause issues with code like this:

```jsx
import { memo } from "react-memo.macro";

const WrappedComponent = someHoC(MyComponent);

function MyComponent() {
  memo();

  return <div>...</div>;
}
```

In this case, move the line that references the component to below the component declaration.
