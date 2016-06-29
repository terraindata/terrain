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
import Actions from "../../../data/BuilderActions.tsx";
import Util from '../../../../util/Util.tsx';
import LayoutManager from "../../layout/LayoutManager.tsx";
import Dropdown from './../../../../common/components/Dropdown.tsx';
import CardField from './../CardField.tsx';
import { Directions } from './../../../CommonVars.tsx';
import { BuilderTypes } from './../../../BuilderTypes.tsx';
import BuilderTextbox from "../../../../common/components/BuilderTextbox.tsx";
import Classs from './../../../../common/components/Classs.tsx';

interface Props {
  card: BuilderTypes.ISortCard;
  canEdit?: boolean;
  keys: string[];
}

class SortCard extends Classs<Props>
{
  addSort(index)
  {
    Actions.cards.sort.create(this.props.card, index + 1);
  }
  
  moveSort(curIndex, newIndex)
  {
    Actions.cards.sort.move(this.props.card, this.props.card.sorts[curIndex], newIndex);
  }
  
  removeSort(index)
  {
    Actions.cards.sort.remove(this.props.card, index);
  }

  renderSort(sort, index)
  {
    return (
      <CardField
        draggable={this.props.canEdit}
        addable={this.props.canEdit}
        onAdd={this.addSort}
        removable={this.props.canEdit}
        onDelete={this.removeSort}
        drag_y={true}
      >
        <div className='flex-container'>
          <div className='flex-card-field'>
            <BuilderTextbox
              {...this.props}
              value={sort.property}
              id={this.props.card.id}
              keyPath={this._keyPath('sorts', index, 'property')}
              placeholder='Field name'
              help='Field by which to sort.<br />For multiple sort fields,<br />priority goes top to bottom.'
              options={this.props.keys}
            />
          </div>
          <div className='flex-card-field'>
            <Dropdown
              options={Directions}
              selectedIndex={sort.direction}
              id={this.props.card.id}
              keyPath={this._keyPath('sorts', index, 'direction')}
              canEdit={this.props.canEdit}
            />
          </div>
        </div>
      </CardField>
    );
  }
  
  render()
  {
    if(this.props.card.sorts.length === 0)
    {
      return <div className='info-message info-message-clickable' onClick={this.addSort}>Click to add a sort</div>;
    }
    
    return (
    <LayoutManager
      layout={{
        reorderable: true,
        rows: this.props.card.sorts.map((sort, index) => ({
          key: sort.id,
          content: this.renderSort(sort, index)
        }))
      }}
      moveTo={this.moveSort}
    />);
  }
};

export default SortCard;