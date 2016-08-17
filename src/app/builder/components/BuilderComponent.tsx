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

require('./BuilderComponent.less');
import * as React from 'react';
import * as Immutable from 'immutable';
import {BuilderComponents, Display, DisplayType} from './BuilderComponents.tsx';
import PureClasss from '../../common/components/PureClasss.tsx';
import BuilderTextbox from '../../common/components/BuilderTextbox.tsx';
import BuilderTypes from '../BuilderTypes.tsx';
import BuilderActions from '../data/BuilderActions.tsx';
import CardField from './cards/CardField.tsx';

interface Props
{
  keyPath: KeyPath;
  data : any; // record
  type: string;
}

class BuilderComponent extends PureClasss<Props>
{
  _addRow(keyPath: KeyPath, index: number, display: Display)
  {
    return this._fn('addRow', keyPath, index, display, () => {
      BuilderActions.create(keyPath, index, display.factoryType);
    });
  }
  _removeRow(keyPath: KeyPath, index: number, display: Display)
  {
    return this._fn('removeRow', keyPath, index, display, () => {
      BuilderActions.remove(keyPath, index);
    });
  }
  
  renderDisplay(displayArg: Display | Display[], parentKeyPath: KeyPath, data: Map<any, any>): El
  {
    let keySeed = parentKeyPath.join(",");
    if(Array.isArray(displayArg))
    {
      return displayArg.map(di => this.renderDisplay(di, parentKeyPath, data));
      // return (
      //   <div key={keySeed + "-list"}>
      //     {
      //       displayArg.map(di => this.renderDisplay(di, parentKeyPath, data))
      //     }
      //   </div>
      // );
    }
    
    const d = displayArg as Display;
    
    if(d.displayType === DisplayType.LABEL)
    {
      // special type that is unrealted to the data
      return <div 
        className='builder-label'
        key={keySeed + '-label'}
        >
          {d.label}
        </div>
      ;
    }
    
    let keyPath = this._ikeyPath(parentKeyPath, d.key);
    let value = data.get(d.key);
    var isNumber = null, typeErrorMessage = null;
    let key = data.get('id') + ',' + d.key;
    
    var content;
    
    switch(d.displayType)
    {
      case DisplayType.NUM:
        isNumber = true;
        typeErrorMessage = "Must be a number";
        // fall through
      case DisplayType.TEXT:
        content = <BuilderTextbox
          {...this.props}
          isNumber={isNumber}
          typeErrorMessage={typeErrorMessage}
          keyPath={keyPath}
          value={value}
          key={key}
          placeholder={d.placeholder || d.key}
        />
        if(!d.header)
        {
          return content;
        }
        break;
      // case DisplayType.CARDS:
      // break;
      // case DisplayType.CARDTEXT:
      // break;
      // case DisplayType.DROPDOWN:
      // break;
      case DisplayType.ROWS:
        content = (
          <div>
            {
              value.map((v, i) => (
                <CardField
                  index={i}
                  onAdd={this._addRow(keyPath, i + 1, d)}
                  onRemove={this._removeRow(keyPath, i, d)}
                  key={key + ',' + v.get('id')}
                >
                  {
                    this.renderDisplay(
                      d.row,
                      this._ikeyPath(keyPath, i),
                      v
                    )
                  }
                </CardField>
              ))
            }
            {
              value.size ? null :
                <div
                  className='builder-add-row'
                  onClick={this._addRow(keyPath, 0, d)}
                >
                  Add a {d.english}
                </div>
            }
          </div>
        );
        break;
      default:
        content = (
          <div>Data type {DisplayType[d.displayType]} not implemented.</div>
        );
    }
    
    return (
      <div key={key}>
        { ! d.header ? null :
            <div className='builder-card-header'>
              { d.header }
            </div>
        }
        { content }
      </div>
    );
  }
  
  render()
  {
    let {type, data} = this.props;
    let display = BuilderComponents[type];

    if(Array.isArray(display))
    {
      return (
        <div>
          {
            display.map((d, i) => this.renderDisplay(
              d,
              this.props.keyPath,
              this.props.data
              )
            )
          }
        </div>
      );
    }
    else
    {
      return this.renderDisplay(
        display,
        this.props.keyPath,
        this.props.data
      );
    }
  }
}

export default BuilderComponent;