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
import * as React from 'react';

import * as Immutable from 'immutable';
import TerrainComponent from './../../common/components/TerrainComponent';

export default class Delayer<T>
{
  protected resource: T;
  protected cachedResource: T;
  protected delay: number; // milliseconds
  protected lastTimer;
  protected onUpdate: () => void;

  constructor(initialValue: T, onUpdate: () => void, delay: number = 500)
  {
    this.resource = initialValue;
    this.cachedResource = initialValue;
    this.onUpdate = onUpdate;
    this.delay = delay;
  }

  public set(newValue: T)
  {
    this.clearTimer();
    this.resource = newValue;
    this.lastTimer = setTimeout(this.cacheUpdateTimeout.bind(this), this.delay);
  }

  public isDirty(): boolean
  {
    return this.lastTimer !== undefined;
  }

  public get(): T
  {
    return this.cachedResource;
  }

  public flush(): T
  {
    this.clearTimer();
    this.cacheUpdateTimeout();
    return this.resource;
  }

  protected cacheUpdateTimeout()
  {
    this.cachedResource = this.resource;
    this.onUpdate();
  }

  protected clearTimer()
  {
    if (this.lastTimer)
    {
      clearTimeout(this.lastTimer);
      this.lastTimer = undefined;
    }
  }
}
/*
export interface Props
{
  resource: Imap;
  delay: number;
}

export default class Delayer extends TerrainComponent<Props>
{
  public state:
  {
    lastTimer: number;
    cachedResource: Imap;
  }

  constructor(props: Props)
  {
    super(props)
  }

  public get()
  {
    return this.state.cachedResource;
  }

  public flush()
  {
    clearTimeout(this.state.lastTimer);
    this.setState({
      cachedResource: this.props.resource,
    })
  }

  public render()
  {
    if (this.state.cachedResource !== this.props.resource)
    {
      clearTimeout(this.state.lastTimer);
      this.setState({
        lastTimer: setTimeout(this.handler, this.props.delay),
      });
    }
    return (
      <div />
    );
  }

  private handler()
  {
    this.setState({
      cachedResource: this.props.resource,
    });
  }
}
*/
