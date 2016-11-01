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

import * as Immutable from 'immutable';
import BrowserTypes from './../../browser/BrowserTypes.tsx';
import BuilderTypes from './../BuilderTypes.tsx';
import Ajax from './../../util/Ajax.tsx';
import ActionTypes from './BuilderActionTypes.tsx';
import Actions from './BuilderActions.tsx';
import * as _ from 'underscore';
import {BuilderState} from './BuilderStore.tsx';
import {_IResultsConfig} from './../components/results/ResultsConfig.tsx';
import Util from '../../util/Util.tsx';

const BuidlerReducers: ReduxActions.ReducerMap<BuilderState> =
{
  
[ActionTypes.fetch]:
  (state: BuilderState, action) =>
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
              item.cards = BuilderTypes.recordFromJS(item.cards || []);
              item.inputs = BuilderTypes.recordFromJS(item.inputs || []);
              item.resultsConfig = _IResultsConfig(item.resultsConfig);
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
  (state: BuilderState, action:
  {
    payload?: { variantId: string, variant: any},
  }) =>
    state.setIn(['queries', action.payload.variantId],
      new BrowserTypes.Variant(action.payload.variant)
    ),

[ActionTypes.setVariantField]: 
  (state: BuilderState, action:
  {
    payload?: { variantId: string, field: string, value: any},
  }) =>
    state.setIn(['queries', action.payload.variantId, action.payload.field],
      action.payload.value
    ),

[ActionTypes.change]:  
  (state: BuilderState, action) =>
    state.setIn(action.payload.keyPath, action.payload.value),
  
[ActionTypes.create]:  
  (state: BuilderState, action: {
    payload?: { keyPath: KeyPath, index: number, factoryType: string, data: any }
  }) =>
    state.updateIn(action.payload.keyPath, arr =>
      {
        let item = action.payload.data ? action.payload.data :
            BuilderTypes.make(BuilderTypes.Blocks[action.payload.factoryType]);
            
        if(action.payload.index === null)
        {
          return item; // creating at that spot
        }
        
        return arr.splice
        (
          action.payload.index === undefined || action.payload.index === -1 ? arr.size : action.payload.index,
          0, 
          item
        )
      }
    )
  ,
    
[ActionTypes.move]:  
  (state: BuilderState, action: {
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

     // first check original keypath
[ActionTypes.nestedMove]: // a deep move
  (state: BuilderState, action: {
    payload?: { itemKeyPath: KeyPath, itemIndex: number, newKeyPath: KeyPath, newIndex: number }
  }) =>
  {
    let { itemKeyPath, itemIndex, newKeyPath, newIndex } = action.payload;
    
    if(itemKeyPath.equals(newKeyPath))
    {
      if(itemIndex === newIndex)
      {
        return state;
      }
      
      // moving within same list
      return state.updateIn(itemKeyPath, arr =>
      {
        let item = arr.get(itemIndex);
        var indexOffset = 0;
        if(itemIndex < newIndex)
        {
          // dragging down
          indexOffset = -1;
        }
        return arr.splice(itemIndex, 1).splice(newIndex + indexOffset, 0, item);
      });
    }
    
    let itemReferenceKeyPath = itemIndex === null ? itemKeyPath : itemKeyPath.push(itemIndex);
    let item = state.getIn(itemReferenceKeyPath);
    let tempId = '' + Math.random(); // mark with a temporary ID so we know where to delete
    state = state.setIn(itemReferenceKeyPath.push('id'), tempId);
    
    state = state.updateIn(newKeyPath, obj => {
      if(Immutable.List.isList(obj))
      {
        return obj.splice(newIndex, 0, item);
      }
      return item;
    });
    
    if(state.getIn(itemReferenceKeyPath.push('id')) === tempId)
    {
      // location remained same, optimized delete
      state = state.deleteIn(itemReferenceKeyPath);
    }
    else
    {
      // search and destroy
      // NOTE: if in the future the same card is open in multiple places, this will break
      state = state.deleteIn(Util.keyPathForId(state, tempId) as (string | number)[]);
      // Consider an optimized search if performance becomes an issue.
    }
    
    state = trimParent(state, itemKeyPath);
    
    return state;
  },

[ActionTypes.remove]:  
  (state: BuilderState, action: {
    payload?: { keyPath: KeyPath, index: number }
  }) =>
  {
    let {keyPath, index} = action.payload;
    if(index !== null)
    {
      keyPath = keyPath.push(index);
    }
    
    state = state.removeIn(keyPath);
    state = trimParent(state, keyPath);
    
    return state;
  },

[ActionTypes.hoverCard]:
  (state: BuilderState, action: {
    payload?: { cardId: ID },
  }) =>
  {
    if(action.payload.cardId !== state.hoveringCardId)
    {
      return state.set('hoveringCardId', action.payload.cardId);
    }
    return state;
  },

[ActionTypes.selectCard]:
  (state: BuilderState, action: {
    payload?: { cardId: ID, shiftKey: boolean, ctrlKey: boolean },
  }) =>
  {
    let {cardId, shiftKey, ctrlKey} = action.payload;
    if(!shiftKey && !ctrlKey)
    {
      state = state.set('selectedCardIds', Immutable.Map({}));
    }
    if(ctrlKey)
    {
      return state.setIn(['selectedCardIds', cardId],
        !state.getIn(['selectedCardIds', cardId]));
    }
    return state.setIn(['selectedCardIds', cardId], true);
  },

  [ActionTypes.dragCardOver]:
    (state: BuilderState, action: {
      payload?: { keyPath: KeyPath, index: number }
    }) =>
    {
      let {keyPath, index} = action.payload;
      return state
        .set('draggingOverKeyPath', keyPath)
        .set('draggingOverIndex', index);
    },
  
  [ActionTypes.dropCard]:
    (state) => state
      .set('draggingOverKeyPath', null)
      .set('draggingOverIndex', null)
      .set('draggingCardItem', null),
};

function trimParent(state: BuilderState, keyPath: KeyPath): BuilderState
{
  let parentKeyPath = keyPath.splice(keyPath.size - 1, 1).toList();
  let parentListKeyPath = parentKeyPath.splice(parentKeyPath.size - 1, 1).toList();
  let st = state.getIn(parentKeyPath.push('static'));
  
  if( st && st.removeOnCardRemove
      && state.getIn(parentListKeyPath).size > 1 // only remove if there are multiple items
    )
  {
    return state.removeIn(parentKeyPath);
  }
  
  return state;
}



export default BuidlerReducers;
