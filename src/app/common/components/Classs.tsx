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

import * as React from 'react';
import Util from '../../util/Util';

// type StoreKeyPath = string[] | (() => string[]);
interface Config
{
  stateKey?: string;
  storeKeyPath?: string[] | (() => string[]);
  isMounted?: boolean;
  updater?: (storeState:any) => void;
}

interface Store
{
  subscribe: (any) => () => void;
  getState: () => any;
}

class Classs<T> extends React.Component<T, any>
{
  constructor(props: T)
  {
    super(props);

    // copied from https://github.com/sindresorhus/auto-bind
    let self = this;
    for (const key of Object.getOwnPropertyNames(self.constructor.prototype)) 
    {
      const val = self[key];

      if (key !== 'constructor' && typeof val === 'function') {
        self[key] = val.bind(self);
      }
    }

    let unmountFn = this['componentWillUnmount'];
    this['componentWillUnmount'] = () =>
    {
      this._unmounted = true; // antipattern
      this._unsubscribe();
      unmountFn && unmountFn();
    };

    Util.bind(this, '_keyPath', '_subscribe', 'componentWillUnmount');
  }

  _unmounted = false;

  _unsubscribe()
  {
    this.subscriptions.map(cancelSubscription => cancelSubscription());
  }

  // subscribes to a Redux store
  _subscribe(
    store: Store,
    config: Config
  )
  {
    let update = () =>
    {
      this._update(store, config);
    };

    let subscribe = () =>
      this.subscriptions.push(
        store.subscribe(update)
      );

    if(config.isMounted)
    {
      subscribe();
      update();
    } else {
      let mountFn = this['componentDidMount'];
      this['componentDidMount'] = () =>
      {
        subscribe();
        update();
        mountFn && mountFn();
      }
    }
  }
  subscriptions: (() => void)[] = [];

  _update(store: Store, config: Config)
  {
    if(this._unmounted)
    {
      return;
    }

    if(config.updater)
    {
      config.updater(store.getState());
      if(!config.stateKey)
      {
        // only using the updater
        return;
      }
    }

    let stateKey = config.stateKey;

    if(config.storeKeyPath)
    {
      let keyPath = typeof config.storeKeyPath === 'function' ? (config.storeKeyPath as (() => string[]))() : config.storeKeyPath;
      var value = store.getState().getIn(keyPath);
      stateKey = stateKey || keyPath[keyPath.length - 1];
    } else {
      var value = store.getState();
    }

    stateKey = stateKey || 'state';

    if(this.state[stateKey] !== value)
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
  _keyPaths: {[key: string]: (string | number)[]} = {};
  _keyPath(...keys: (string | number)[])
  {
    var key = keys.join(".");
    if(this._keyPaths[key] === undefined)
    {
      this._keyPaths[key] = keys;
    }
    return this._keyPaths[key];
  }

  _ikeyPaths: {
    [key: string]:
    {
      seed: Immutable.List<string | number>,
      keyPath: Immutable.List<string | number>,
    }
  } = {};
  _ikeyPath(seed: Immutable.List<string | number>, ...keys: (string | number | (string | number)[])[])
  {
    if(Array.isArray(keys[0]))
    {
      keys = keys[0] as any as (string | number)[];
    }

    let str = seed.toArray().concat(keys as (string | number)[]).join("");
    if(!this._ikeyPaths[str] || this._ikeyPaths[str].seed !== seed)
    {
      this._ikeyPaths[str] = {
        seed: seed,
        keyPath: seed.concat(keys) as Immutable.List<string | number>,
      }
    }

    return this._ikeyPaths[str].keyPath;
  }

  _fns: {
    [name: string]: {
      args: any[],
      fn: () => void,
    }[],
  } = {};
  _fn(instanceFn: (...args:any[]) => any, ...args: any[]): (...args:any[]) => any
  {
    let fnName = instanceFn['name'];
    var fns = this._fns[fnName];
    if(!fns)
    {
      let fn = this.__getFn(instanceFn, args);
      this._fns[fnName] = [{
        args,
        fn,
      }];
      return fn;
    }

    for(var obj of fns)
    {
      if(obj.args.length === args.length && obj.args.every((e, i) => args[i] === e))
      {
        return obj.fn;
      }
    }

    let fn = this.__getFn(instanceFn, args);
    this._fns[fnName].push({ args, fn });
    return fn;
  }

  __getFn(instanceFn: (...args:any[]) => any, args: any[]): (...args:any[]) => any
  {
    switch(args.length)
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

  _togMap: {[stateKey:string]: () => void} = {};
  _toggle(stateKey: string): (() => void)
  {
    return this._togMap[stateKey] || (
      this._togMap[stateKey] = () =>
        this.setState({
          [stateKey]: !this.state[stateKey],
        })
    );
  }
}

export default Classs;
