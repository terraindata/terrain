# Terrain and Redux: The Definitive Guide

## Overview
This guide explains how to create new redux actions and reducers in Terrain and how to merge existing single stores to the global store.

## Merge an existing store into the global store 

### Keep things working until the merge is complete
While the single store is being merged, there will be parts of the code that will be using the single store and others the global store. In order to keep all working and be able to test the changes that we are making, we can tweak the `$` function present in every xxxActions.tsx file to make it keep the single and global store in sync, like this:

```
// We change it from this
-const $ = (type: string, payload: any) => Store.dispatch({ type, payload });
// to this
+const $ = (type: string, payload: any) =>
+{
+  Store.dispatch({ type, payload });
+  return { type, payload }
+}
```

In this way, we're making sure that every actions is dispatch to the single store and the global store, so no matter where the code is trying to read the data from, it will be there.

### Find and replace
In order to completely remove a single store, we need to remove all references to it and replace every action call in components and every store import and direct access. The final result is that every action dispatched from a component will cause a change of the state in the global store and also that the component will be notified about any store value updates.

#### Single store removal example
Old way:
```
...
import AuthStore from '../../auth/data/AuthStore';
...

class SomeComponent extends TerrainComponent...
{
  ...
  public renderAddConnection()
  {
    const userId = AuthStore.getState().id;
  ...
}
```

New way:
```
...
-import AuthStore from '../../auth/data/AuthStore';
import AuthActions from 'auth/data/AuthActions';
...

class SomeComponent extends TerrainComponent...
{
  ...
  public renderAddConnection()
  {
-    const userId = AuthStore.getState().id;
+    const userId = this.props.auth.id;
  ...
}

export default Util.createContainer(
  // The component we want to turn into a container
  SomeComponent,
  // The key in global store we want to subscribe to (see TerrainStore.tsx)
  ['auth'],
  // Make the actions accessible through this.props.authActions
  { authActions: AuthActions },
);
```

What happened here?? First, the import of the single store was removed, since  it will not exist anymore in favor of the global store. Then, to replace it, we are going to create what's commonly known as Smart Component or Container Component. The difference with a regular react component is that:

1) It's connected to store, which means that when the component is created, it receives in its props the current state of the store, and also, any time the store is updated, the component will receive the new updated state in its  `componentWillReceiveProps` method.

2) Actions will also be passed as component props and they can be called like this: `this.props.authActions.login(accessToken, id)`. No need to call dispatch, that is handled automatically.

#### Action call replacement example

Old way:
```
AuthActions.login(accessToken, id);
```

New way:
```
this.props.authActions.login(accessToken, id);
```

## Make the reducer and actions type-safe.

#### One file to rule them all
* Create a xxxRedux.tsx file into the data folder of the corresponding module (example: src/app/Auth/data/AuthRedux.tsx)
This file will contain all redux related structures, this is, actions types, reducers and actions creators.

#### The ActionTypes

The action types are defined as an object in the following way:

```
export interface xxxActionTypes
{
  <action-1-name>: {
    actionType: '<action-1-name>';
    <action-param-1>: <action-param-1-type>;
    <action-param-2>: <action-param-2-type>;
    ...
    <action-param-n>: <action-param-n-type>;
  };
  <action-2-name>: {
    actionType: '<action-2-name>';
    <action-param-1>: <action-param-1-type>;
    ...
  };
  ...
}
```

Example:

```
export interface AuthActionTypes
{
  login: {
    actionType: 'login';
    accessToken: string;
    id: number;
  };
  logout: {
    actionType: 'logout';
  };
}
```

#### The Redux Class
A main class name xxxRedux (example: AuthRedux) will declare the reducer and the action creators. It will extend the base TerrainRedux class which handles the common functionality shared by most of the action creators / reducers in the system.

In this class, each method is an action creator. There is also a property called `reducers`  that defines a Map in which each key is an action name and the value for that key is a function that handles the changes to the store produced by an action.

## Glosary

**Action Creator**: a function that returns an action object that can be send as an argument of the redux store `dispatch` method.

**Reducer**: a function that is bound to a certain piece of the redux store and that registers handlers for any actions that fire a change in the state of that piece of the store.

## Improvements

* Action creator arguments order
