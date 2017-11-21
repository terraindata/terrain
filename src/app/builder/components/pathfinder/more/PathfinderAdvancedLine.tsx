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

// tslint:disable:no-var-requires restrict-plus-operands strict-boolean-expressions

import { altStyle, backgroundColor, borderColor, Colors, fontColor } from 'app/colors/Colors';
import TerrainComponent from 'app/common/components/TerrainComponent';
import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
const { List, Map } = Immutable;
import BuilderActions from 'app/builder/data/BuilderActions';
import BuilderTextbox from 'app/common/components/BuilderTextbox';
import Dropdown from 'app/common/components/Dropdown';
import FadeInOut from 'app/common/components/FadeInOut';
import MultiInput from 'app/common/components/MultiInput';
import RadioButtons, { RadioButtonOption } from 'app/common/components/RadioButtons';
import RangesInput from 'app/common/components/RangesInput';
import { tooltip } from 'app/common/components/tooltip/Tooltips';
import { ADVANCED } from '../PathfinderTypes';
import { AdvancedDisplays } from './PathfinderAggregationDisplay';

const ArrowIcon = require('images/icon_arrow.svg?name=ArrowIcon');

export interface Props
{
  advancedType: ADVANCED;
  advancedData: any;
  keyPath: KeyPath;
  canEdit: boolean;
  fieldName: string;
}

export class PathfinderAdvancedLine extends TerrainComponent<Props>
{
  public state: {
    expanded: boolean;
  } = {
    expanded: false,
  };

  public handleMissingChange(index)
  {
    // ignore missing items
    if (index === 0)
    {
      BuilderActions.change(this.props.keyPath, this.props.advancedData.delete('missing'));
    }
    // replace missing items
    else if (index === 1)
    {
      BuilderActions.change(this.props.keyPath, this.props.advancedData.set('missing', 0));
    }
  }

  public renderAdvancedItem(item, i?)
  {
    if (item.component !== undefined)
    {
      return (
        <div key={i} className='pf-advanced-section-item'>
          {item.component(
            this.props.fieldName,
            this.props.keyPath.push(item.key),
            this.handleMissingChange,
            this.props.canEdit,
            this.props.advancedData.get(item.key) !== undefined,
            this.props.advancedData.get(item.key))}
        </div>
      );
    }
    let content = null;
    switch (item.inputType)
    {
      case 'single':
        content =
          <BuilderTextbox
            value={this.props.advancedData.get(item.key)}
            canEdit={this.props.canEdit}
            keyPath={this.props.keyPath.push(item.key)}
            language='elastic'
          />;
        break;
      case 'multi':
        content =
          <MultiInput
            items={this.props.advancedData.get(item.key)}
            keyPath={this.props.keyPath.push(item.key)}
            action={BuilderActions.change}
            isNumber={true} // change ?
            canEdit={this.props.canEdit}
          />;
        break;
      case 'range':
        content =
          <RangesInput
            ranges={this.props.advancedData.get(item.key)}
            keyPath={this.props.keyPath.push(item.key)}
            action={BuilderActions.change}
            canEdit={this.props.canEdit}
          />;
        break;
      case 'boolean':
        content =
          <Dropdown
            canEdit={this.props.canEdit}
            keyPath={this.props.keyPath.push(item.key)}
            options={List(['true', 'false'])}
            selectedIndex={this.props.advancedData.get(item.key) === 'true' ? 0 : 1}
          />;
        break;
      case 'textbox':
        content =
          <BuilderTextbox
            value={this.props.advancedData.get(item.key)}
            keyPath={this.props.keyPath.push('name')}
            language={'elastic'}
            canEdit={this.props.canEdit}
            placeholder={'Name'}
          />;
        break;
      default:
    }

    return tooltip(
      <div className='pf-advanced-section-item' key={i}>
        <span> {item.text}</span>
        {content}
      </div>, item.tooltipText);
  }

  public handleSelectedItemChange(key, otherKeys)
  {
    // remove the other key options from advanced
    // add new key option to advanced
    let advanced = this.props.advancedData;
    otherKeys.forEach((keyToRemove) =>
    {
      advanced = advanced.delete(keyToRemove);
    });
    advanced = advanced.set(key, '');
    BuilderActions.change(this.props.keyPath, advanced);
  }

  public renderAdvancedItems(items, onlyOne)
  {
    if (onlyOne)
    {
      const options = List<RadioButtonOption>(items.map((item, i) =>
      {
        return {
          key: item.key,
          display: this.renderAdvancedItem(item, i),
        };
      }));
      const selected = options.filter((opt) =>
      {
        return this.props.advancedData.get(opt.key) !== undefined;
      }).get(0).key;
      return (
        <RadioButtons
          selected={selected}
          options={options}
          onSelectOption={this.handleSelectedItemChange}
        />
      );
    }
    return (
      <div className='pf-advanced-section-items'>
        {
          items.length ?
            items.map((item, i) => this.renderAdvancedItem(item, i))
            :
            this.renderAdvancedItem(items)
        }
      </div>
    );
  }

  public render()
  {
    const display = AdvancedDisplays.get(String(this.props.advancedType));
    return (
      <div className='pf-advanced-section'>
        <div
          className='pf-advanced-section-title'
          onClick={this._toggle('expanded')}
        >
          <div className={classNames({
            'pf-aggregation-arrow': true,
            'pf-aggregation-arrow-advanced': true,
            'pf-aggregation-arrow-open': this.state.expanded,
          })}
          >
            <ArrowIcon />
          </div>
          {display.title}
        </div>
        <FadeInOut
          open={this.state.expanded}
          children={this.renderAdvancedItems(display.items, display.onlyOne)}
        />
      </div>
    );

  }
}

export default PathfinderAdvancedLine;
