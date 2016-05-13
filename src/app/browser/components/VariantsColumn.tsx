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
import Classs from './../../components/common/Classs.tsx';
import BrowserColumn from './BrowserColumn.tsx';
import BrowserItem from './BrowserItem.tsx';
import BrowserCreateItem from './BrowserCreateItem.tsx';
import BrowserTypes from './../BrowserTypes.tsx';
import ColorManager from './../../util/ColorManager.tsx';
import InfoArea from './../../components/common/InfoArea.tsx';
import Actions from './../data/BrowserActions.tsx';
type Variant = BrowserTypes.Variant;

interface Props
{
  variants: Immutable.Map<ID, Variant>;
  variantsOrder: Immutable.List<ID>;
  groupId: ID;
  algorithmId: ID;
}

class VariantsColumn extends Classs<Props>
{
  state = {
    rendered: false,
    lastMoved: null,
  }
  
  componentDidUpdate()
  {
    if(!this.state.rendered)
    {
      this.setState({
        rendered: true,
      });
    }
  }
  
  componentWillReceiveProps(nextProps)
  {
    if(nextProps.algorithmId !== this.props.algorithmId)
    {
      this.setState({
        rendered: false,
      });
    }
  }
  
  handleDuplicate(index: number)
  {
    Actions.variants.duplicate(this.props.variants.get(this.props.variantsOrder.get(index)), index);
  }
  
  handleCreate()
  {
    Actions.variants.create(this.props.groupId, this.props.algorithmId);
  }
  
  handleNameChange(id: ID, name: string)
  {
    Actions.variants.change(
      this.props.variants.get(id)
        .set('name', name) as Variant
    );
  }
    
  handleHover(index: number, type: string, id: ID)
  {
    var itemIndex = this.props.variantsOrder.findIndex(v => v === id);
    if(type === 'variant' && itemIndex !== index 
      && this.state.lastMoved !== index + ' ' + itemIndex)
    {
      this.setState({
        lastMoved: index + ' ' + itemIndex,
      });
      Actions.variants.move(itemIndex, index + (itemIndex < index ? 1 : 0), this.props.groupId, this.props.algorithmId);
    }
  }

  
  renderVariant(id: ID, index: number)
  {
    // Sublime gets messed up with the 'var' in 'variant', hence this pseudonym
    const vriant = this.props.variants.get(id);
    return (
      <BrowserItem
        index={index}
        name={vriant.name}
        icon={null}
        onDuplicate={this.handleDuplicate}
        color={ColorManager.colorForKey(this.props.groupId)}
        key={vriant.id}
        to={`/browser/${this.props.groupId}/${this.props.algorithmId}/${id}`}
        className='browser-item-lightest'
        id={id}
        type='variant'
        onNameChange={this.handleNameChange}
        rendered={this.state.rendered}
        onHover={this.handleHover}
      >
      </BrowserItem>
    );
  }
  
  render()
  {
    return (
      <BrowserColumn
        index={3}
        title='Variants'
      >
        { 
          this.props.variants ?
            (
              this.props.variants.size ?
              (
                <div>
                  {
                    this.props.variantsOrder.map(this.renderVariant)
                  }
                  <BrowserCreateItem
                    name='variant'
                    onCreate={this.handleCreate}
                  />
                </div>
              )
              :
              <InfoArea
                large='No variants created, yet.'
                button='Create a variant'
                onClick={this.handleCreate}
              />
            )
          : null
        }
      </BrowserColumn>
    );
  }
}

export default VariantsColumn;