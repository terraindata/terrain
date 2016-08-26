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

const Immutable = require('immutable');
import BrowserTypes from './../../browser/BrowserTypes.tsx';
import BuilderTypes from './../BuilderTypes.tsx';
import Ajax from './../../util/Ajax.tsx';
import ActionTypes from './BuilderActionTypes.tsx';
import Actions from './BuilderActions.tsx';
import * as _ from 'underscore';
import {BuilderState} from './BuilderStore.tsx';

const BuidlerReducers: ReduxActions.ReducerMap<BuilderState> =
{
  
[ActionTypes.fetch]:
  (state, action) =>
  {
    action.payload.variantIds.map(
      variantId =>
        {
          if(variantId.indexOf('@') !== -1) 
          {
            var versionId = variantId.split('@')[1];
            variantId = variantId.split('@')[0];
            Ajax.getVariantVersion(variantId, versionId, (version) =>
              {
                if(!version)
                {
                  return;
                }
                version.cards = Immutable.fromJS(version.cards || []);
                version.inputs = Immutable.fromJS(version.inputs || []);
                //Use current version to get missing fields
                Ajax.getVariant(variantId, (item) => 
                  {
                  if(!item) 
                  {
                    return;
                  }
                  version.id = item.id;
                  version.groupId = item.groupId;
                  version.status = item.status;
                  version.algorithmId = item.algorithmId;
                  version.version = true;
                  Actions.setVariant(variantId + '@' + versionId, version);
                });
              }
            );
          }
          else 
          {
            Ajax.getVariant(variantId, (item) =>
            {
              if(!item)
              {
                return;
              }
              item.cards = BuilderTypes.recordsFromJS(item.cards || []);
              item.inputs = BuilderTypes.recordsFromJS(item.inputs || []);
              item.version = false;
              Actions.setVariant(variantId, item);
            }
          );
        }
      }
    );
    return state.set('loading', true);
  },
  
[ActionTypes.setVariant]: 
  (state, action:
  {
    payload?: { variantId: string, variant: any},
  }) =>
    state.setIn(['queries', action.payload.variantId],
      new BrowserTypes.Variant(action.payload.variant)
    ),

[ActionTypes.setVariantField]: 
  (state, action:
  {
    payload?: { variantId: string, field: string, value: any},
  }) =>
    state.setIn(['queries', action.payload.variantId, action.payload.field],
      action.payload.value
    ),

[ActionTypes.change]:  
  (state, action) =>
    state.setIn(action.payload.keyPath, action.payload.value),
  
[ActionTypes.create]:  
  (state, action: {
    payload?: { keyPath: KeyPath, index: number, factoryType: string }
  }) =>
    state.updateIn(action.payload.keyPath, arr =>
      arr.splice
      (
        action.payload.index === -1 ? arr.size : action.payload.index, 0, 
        BuilderTypes.F[action.payload.factoryType]()
      )
    ),
    
[ActionTypes.move]:  
  (state, action: {
    payload?: { keyPath: KeyPath, index: number, newIndex; number }
  }) =>
    state.updateIn(action.payload.keyPath, arr =>
    {
      let {index, newIndex} = action.payload;
      let el = arr.get(index);
      arr = arr.splice(index, 1);
      arr = arr.splice(newIndex, 0, el); // TODO potentially correct index
      return arr;
    }),

[ActionTypes.remove]:  
  (state, action: {
    payload?: { keyPath: KeyPath, index: number, factoryType: string }
  }) =>
    state.removeIn(action.payload.keyPath.push(action.payload.index))
  ,

[ActionTypes.hoverCard]:
  (state, action: {
    payload?: { cardId: ID },
  }) =>
    state.set('hoveringCardId', action.payload.cardId)
  ,
  
};


export default BuidlerReducers;
