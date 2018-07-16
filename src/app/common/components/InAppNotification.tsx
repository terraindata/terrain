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

// tslint:disable:no-invalid-this no-var-requires strict-boolean-expressions

/*
How to use Notifications:
In App.tsx:
import {InAppNotification} from './common/components/InAppNotification'
render()
  ...
  <InAppNotification />
  ...

Anywhere you want to trigger notifications from:
import {notificationManager} from 'path/InAppNotification'

addNotification()
  notificationManager.addNotification("message", type ("info" or "error"), timeOut (optional, 0=no timeout));

render()
  ...
  <div onClick={this.addNotification} >Trigger notification!</div>
  ...
*/

import * as React from 'react';
import TerrainComponent from './../../common/components/TerrainComponent';
const NotificationSystem = require('./notification-system/NotificationSystem');
const styles = require('./notification-system/styles.js');

export interface Props
{
  params?: any;
  history?: any;
  location?: {
    pathname: string;
  };
}

const notificationManager = {
  system: null,

  addNotification(title: string, message: string, level: string, timeOut?: number)
  {
    if (this.system)
    {
      this.system.addNotification({
        uid: `${title}-${message}`,
        title,
        message,
        level,
        autoDismiss: timeOut || 5000,
        dismissible: true,
      });
    }
  },
};

class InAppNotification extends TerrainComponent<Props>
{

  constructor(props)
  {
    super(props);
    this.state = {
      notificationManager: null,
    };
  }

  public componentDidMount()
  {
    notificationManager.system = this.refs['notificationSystem'];
    this.setState({
      notificationManager,
    });
  }

  public render()
  {
    return (
      <div>
        <NotificationSystem allowHTML={true} style={styles} ref='notificationSystem' />
      </div>
    );
  }
}

export { InAppNotification, notificationManager };
