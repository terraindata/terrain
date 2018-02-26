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

// Copyright 2018 Terrain Data, Inc.
// tslint:disable:import-spacing

import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;

import { SinkConfig, SourceConfig } from 'etl/EndpointTypes';
import { ConstrainedMap, GetType, TerrainRedux, Unroll, WrappedPayload } from 'src/app/store/TerrainRedux';
import { Ajax } from 'util/Ajax';
import { _WalkthroughState, ViewState, WalkthroughState } from './ETLWalkthroughTypes';

import { getFileType, getSampleRows, guessJsonFileOptions } from 'shared/etl/FileUtil';
import { FileTypes } from 'shared/etl/types/ETLTypes';

export interface WalkthroughActionTypes
{
  setState: {
    actionType: 'setState',
    state: Partial<{
      [k in keyof WalkthroughState]: WalkthroughState[k];
    }>;
  };
  loadFileSample: {
    actionType: 'loadFileSample';
    file: File;
  };
  setPreviewDocuments: {
    actionType: 'setPreviewDocuments';
    documents: object[];
  };
  autodetectFileOptions: {
    actionType: 'autodetectFileOptions';
    file: File;
  };
}

class WalkthroughRedux extends TerrainRedux<WalkthroughActionTypes, WalkthroughState>
{
  public reducers: ConstrainedMap<WalkthroughActionTypes, WalkthroughState> =
    {
      setState: (state, action) =>
      {
        let newState = state;
        const toUpdate = action.payload.state;
        for (const k of Object.keys(toUpdate))
        {
          newState = newState.set(k, toUpdate[k]);
        }
        return newState;
      },
      setPreviewDocuments: (state, action) =>
      {
        return state.set('previewDocuments', action.payload.documents);
      },
      autodetectFileOptions: (state, action) => state, // overriden
      loadFileSample: (state, action) => state, // overriden
    };

  public loadFileSample(action: WalkthroughActionType<'loadFileSample'>, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    const handleResult = (result) => {
      directDispatch({
        actionType: 'setPreviewDocuments',
        documents: result,
      });
    };
    const handleError = (error) => {
      // tslint:disable-next-line
      console.error(error);
    };
    getSampleRows(
      action.file,
      5,
      handleResult,
      handleError,
    );
  }

  public autodetectFileOptions(action: WalkthroughActionType<'autodetectFileOptions'>, dispatch)
  {
    if (getFileType(action.file) === FileTypes.Json)
    {
      const setOptions = (options) => {

      };

      guessJsonFileOptions(action.file, setOptions);
    }
    else
    {
      console.log('hey its a csv');
    }
  }

  public overrideAct(action: Unroll<WalkthroughActionTypes>)
  {
    switch (action.actionType)
    {
      case 'loadFileSample':
        return this.loadFileSample.bind(this, action);
      case 'autodetectFileOptions':
        return this.autodetectFileOptions.bind(this, action);
      default:
        return undefined;
    }
  }
}

const ReduxInstance = new WalkthroughRedux();
export const WalkthroughActions = ReduxInstance._actionsForExport();
export const WalkthroughReducers = ReduxInstance._reducersForExport(_WalkthroughState);
export declare type WalkthroughActionType<K extends keyof WalkthroughActionTypes> =
  GetType<K, WalkthroughActionTypes>;
