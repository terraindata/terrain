/*
University of Illinois/NCSA Open Source License 

Copyright (c) 2018 Terrain Data, Inc. and the authors. All rights reserved.

Developed by: Terrain Data, Inc. and
              the individuals who committed the code in this file.
              https://github.com/terraindata/terrain
                  
Permission is hereby granted, free of charge, to any person 
obtaining a copy of this software and associated documentation files 
(the "Software"), to deal with the Software without restriction, 
including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software, 
and to permit persons to whom the Software is furnished to do so, 
subject to the following conditions:

* Redistributions of source code must retain the above copyright notice, 
  this list of conditions and the following disclaimers.

* Redistributions in binary form must reproduce the above copyright 
  notice, this list of conditions and the following disclaimers in the 
  documentation and/or other materials provided with the distribution.

* Neither the names of Terrain Data, Inc., Terrain, nor the names of its 
  contributors may be used to endorse or promote products derived from
  this Software without specific prior written permission.

This license supersedes any copyright notice, license, or related statement
following this comment block.  All files in this repository are provided
under the same license, regardless of whether a corresponding comment block
appears in them.  This license also applies retroactively to any previous
state of the repository, including different branches and commits, which
were made public on or after December 8th, 2018.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
CONTRIBUTORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS WITH
THE SOFTWARE.
*/

// Copyright 2017 Terrain Data, Inc.

// tslint:disable:restrict-plus-operands strict-boolean-expressions no-var-requires member-ordering no-console no-unused-expression jsdoc-format max-line-length no-shadowed-variable

/**
 * This is an extension of React.Component that adds extra
 * commonly needed functionality:
 * - shouldComponentUpdate with shallowCompare
 * - helper method for calling instance functions with arguments
 * - helper method for toggling a boolean state value
 * - helper method for subscribing to a Redux state
*/

import * as _ from 'lodash';
import * as React from 'react';
import Util from '../../util/Util';
const shallowCompare = require('react-addons-shallow-compare');

// Defines the configuration options for a Redux subscription
interface SubscriptionConfig
{
  stateKey?: string;
  storeKeyPath?: ID[] | (() => ID[]);
  isMounted?: boolean;
  updater?: (storeState: any) => void;
}

interface Store
{
  subscribe: (any) => () => void;
  getState: () => any;
}

class TerrainComponent<T> extends React.Component<T, any>
{
  public props: T;

  // this is an anti-pattern
  //  change this if you can think of a better way
  public _unmounted = false;

  public subscriptions: Array<() => void> = [];

  public _keyPaths: { [key: string]: Array<string | number> } = {};
  public _ikeyPaths: {
    [key: string]:
    {
      seed: Immutable.List<string | number>,
      keyPath: Immutable.List<string | number>,
    },
  } = {};

  public _fns: {
    [name: string]: Array<{
      args: any[],
      fn: () => void,
    }>,
  } = {};

  public _listeners: {
    [key: string]: Array<string | string[]>,
  } = {};

  public _togMap: { [stateKey: string]: () => void } = {};

  constructor(props: T)
  {
    super(props);

    // copied from https://github.com/sindresorhus/auto-bind
    const self = this;
    for (const key of Object.getOwnPropertyNames(self.constructor.prototype))
    {
      const val = self[key];

      if (key !== 'constructor' && typeof val === 'function')
      {
        self[key] = val.bind(self);
      }
    }

    const unmountFn = this['componentWillUnmount'];
    this['componentWillUnmount'] = () =>
    {
      this._unmounted = true; // antipattern
      this._unsubscribe();
      unmountFn && unmountFn();
    };

    this._setStateWrapper = _.memoize(this._setStateWrapper);
    this._setStateWrapperPath = _.memoize(this._setStateWrapperPath, this.__setStateWrapperPathResolver);
    Util.bind(this, '_keyPath', '_subscribe', 'componentWillUnmount');
  }

  public _setStateWrapper(key: string): (val) => void
  {
    return (val) =>
    {
      this.setState({ [key]: val });
    };
  }

  // avoid having periods in the key or the path, since they are used as delimiters for the cache key.
  public __setStateWrapperPathResolver(key: string, ...path: string[]): string
  {
    return key + path.join('.');
  }

  public _setStateWrapperPath(key: string, ...path: string[]): (val) => void
  {
    return (val) =>
    {
      for (const property of path)
      {
        val = val[property];
      }
      this.setState({ [key]: val });
    };
  }

  public shouldComponentUpdate(nextProps: T, nextState: any)
  {
    // If the key is in listeners, only look at the relevent paths (using util fn)
    for (const key in nextProps)
    {
      if (this._listeners[key] !== undefined)
      {
        if (Util.didStateChange(this.props[key], nextProps[key], this._listeners[key]))
        {
          return true;
        }
      }
      else if (!_.isEqual(this.props[key], nextProps[key]))
      {
        return true;
      }
    }
    for (const key in nextState)
    {
      if (this._listeners[key] !== undefined)
      {
        if (Util.didStateChange(this.state[key], nextState[key], this._listeners[key]))
        {
          return true;
        }
      }
      else if (!_.isEqual(this.state[key], nextState[key]))
      {
        return true;
      }
    }
    return false;
  }

  public addListener(key: string, paths?: Array<string | string[]>)
  {
    this._listeners[key] = paths !== undefined ? paths : [];
  }

  // Helpers for debugging React update / perf issues
  // Simply set _debugUpdates to true in a component you're debugging
  //  and give the component a _debugName if helpful.
  protected _debugUpdates = false;
  protected _debugName = 'Not set';

  private _compareSets(first: any, second: any, setName: string)
  {
    const firstKeys = _.keys(first);
    for (const key of firstKeys)
    {
      if (first[key] !== second[key])
      {
        console.log('Update', this._debugName, setName, 'Key: ', key, 'First: ', first[key], 'Second: ', second[key]);
      }
    }
    for (const key in second)
    {
      if (firstKeys.indexOf(key) === -1)
      {
        console.log('Update', this._debugName, setName, 'Key: ', key, 'First: ', first[key], 'Second: ', second[key]);
      }
    }
  }
  public _unsubscribe()
  {
    this.subscriptions.map((cancelSubscription) => cancelSubscription());
  }

  // subscribes to a Redux store
  public _subscribe(
    store: Store,
    config: SubscriptionConfig,
  )
  {
    const update = () =>
    {
      this._update(store, config);
    };

    const subscribe = () =>
      this.subscriptions.push(
        store.subscribe(update),
      );

    if (config.isMounted)
    {
      subscribe();
      update();
    } else
    {
      const mountFn = this['componentDidMount'];
      this['componentDidMount'] = () =>
      {
        subscribe();
        update();
        mountFn && mountFn();
      };
    }
  }

  private _update(store: Store, config: SubscriptionConfig)
  {
    if (this._unmounted)
    {
      return;
    }

    if (config.updater)
    {
      config.updater(store.getState());
      if (!config.stateKey)
      {
        // only using the updater
        return;
      }
    }

    let stateKey = config.stateKey;
    let keyPath: KeyPath | ID[];
    let value: any;

    if (config.storeKeyPath)
    {
      if (typeof config.storeKeyPath === 'function')
      {
        keyPath = config.storeKeyPath();
      }
      else
      {
        keyPath = config.storeKeyPath;
      }

      value = store.getState().getIn(keyPath);

      if (!stateKey)
      {
        stateKey = keyPath[(keyPath['size'] || keyPath['length']) - 1] + '';
      }
    }
    else
    {
      value = store.getState();
    }

    stateKey = stateKey || 'state';

    if (this.state[stateKey] !== value)
    {
      this.setState({
        [stateKey]: value,
      });
    }
  }

  // for the construction of keyPaths for Redux actions,
  //  this function accepts arguments from which to
  //  construct an array keyPath, and memoizes that array
  //  so as to allow for pure rendering
  public _keyPath(...keys: Array<string | number>)
  {
    const key = keys.join('.');
    if (this._keyPaths[key] === undefined)
    {
      this._keyPaths[key] = keys;
    }
    return this._keyPaths[key];
  }

  public _ikeyPath(seed: Immutable.List<string | number>, ...keys: Array<string | number | Array<string | number>>)
  {
    if (Array.isArray(keys[0]))
    {
      keys = keys[0] as any as Array<string | number>;
    }

    const str = seed.toArray().concat(keys as Array<string | number>).join('');
    if (!this._ikeyPaths[str] || this._ikeyPaths[str].seed !== seed)
    {
      this._ikeyPaths[str] = {
        seed,
        keyPath: seed.concat(keys) as Immutable.List<string | number>,
      };
    }

    return this._ikeyPaths[str].keyPath;
  }

  // for the construction of instance functions called with arguments
  public _fn(instanceFn: (...args: any[]) => any, ...args: any[]): (...args: any[]) => any
  {
    if (!instanceFn)
    {
      return undefined;
    }
    const fnName = instanceFn['name'];
    const fns = this._fns[fnName];
    if (!fns)
    {
      const fn = this.__getFn(instanceFn, args);
      this._fns[fnName] = [{
        args,
        fn,
      }];
      return fn;
    }

    for (const obj of fns)
    {
      if (obj.args.length === args.length && obj.args.every((e, i) => args[i] === e))
      {
        return obj.fn;
      }
    }

    const fn = this.__getFn(instanceFn, args);
    this._fns[fnName].push({ args, fn });
    return fn;
  }

  public __getFn(instanceFn: (...args: any[]) => any, args: any[]): (...args: any[]) => any
  {
    switch (args.length)
    {
      case 0:
        return instanceFn.bind(this);
      case 1:
        return instanceFn.bind(this, args[0]);
      case 2:
        return instanceFn.bind(this, args[0], args[1]);
      case 3:
        return instanceFn.bind(this, args[0], args[1], args[2]);
      case 4:
        return instanceFn.bind(this, args[0], args[1], args[2], args[3]);
      default:
        return instanceFn.bind(this, args);
    }
  }

  // return a function that toggles a boolean state variable
  public _toggle(stateKey: string): (() => void)
  {
    return this._togMap[stateKey] || (
      this._togMap[stateKey] = () =>
        this.setState({
          [stateKey]: !this.state[stateKey],
        })
    );
  }

  protected _saveRefToState(stateKey: string, ref)
  {
    this.setState({
      [stateKey]: ref,
    });
  }
}

export default TerrainComponent;
