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

// tslint:disable:strict-boolean-expressions no-unused-expression

import AnsiUp from 'ansi_up';
import * as React from 'react';
import Util from 'util/Util';

import TerrainTools from 'app/util/TerrainTools';
import { Colors } from 'colors/Colors';
import { MidwayError } from '../../../../shared/error/MidwayError';
import Ajax from '../../util/Ajax';
import InfoArea from './../../common/components/InfoArea';
import TerrainComponent from './../../common/components/TerrainComponent';

import './Logs.less';

const AU = new AnsiUp();

export interface Props
{
  params?: any;
  history?: any;
  children?: any;
}

interface State
{
  loading: boolean;
  logs: string;
}

class Logs extends TerrainComponent<Props>
{
  public state: State = {
    loading: false,
    logs: '',
  };

  public componentDidMount()
  {
    this.fetchLogs();
  }

  public fetchLogs()
  {
    if (!TerrainTools.isAdmin())
    {
      return;
    }

    this.setState({
      loading: true,
    });
    const log = Ajax.getLogs(
      (logs) =>
      {
        if (this.state.loading)
        {
          this.setState({
            logs,
            loading: false,
          });
        }
      },
      (error) =>
      {
        let readable;
        try
        {
          readable = MidwayError.fromJSON(error as any).getDetail();
        }
        catch {
          readable = error;
        }
        if (this.state.loading)
        {
          this.setState({
            logs: readable,
            loading: false,
          });
        }
      },
    );
  }

  public renderLogs()
  {
    if (TerrainTools.isAdmin())
    {
      return (
        <div className='logs-area' dangerouslySetInnerHTML={{ __html: AU.ansi_to_html(this.state.logs) }} />
      );
    }
    else
    {
      return (
        <div className='logs-error'>
          <InfoArea large='You need administrator privileges to view console logs.' />
        </div>
      );
    }
  }

  public render()
  {
    const loading = this.state.loading;
    return (
      <div>
        <div className='logs'>
          <div className='logs-page-title' style={{ color: Colors().mainSectionTitle }}>
            Console Logs
          </div>
          {
            loading &&
            <InfoArea large='Loading...' />
          }
          {
            !loading && this.renderLogs()
          }
        </div>
      </div>
    );
  }
}

export default Util.createContainer(
  Logs,
  [],
  {},
);
