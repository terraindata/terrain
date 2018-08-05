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

// tslint:disable:no-var-requires

// A page to show all of the different UI elements and their states

import * as Immutable from 'immutable';
import { noop } from 'lodash';
import * as React from 'react';
import { Colors, getStyle } from '../colors/Colors';
import { ColorsActions } from '../colors/data/ColorsRedux';
import TerrainComponent from './../common/components/TerrainComponent';
import './UIComponentsPageStyle.less';

import Button from './components/Button';
import CRONEditor from './components/CRONEditor';
import Dropdown from './components/Dropdown';
import Foldout from './components/Foldout';

import FormSandbox from './components/dynamic-form/FormSandbox';

const TrashIcon = require('../../images/icon_trash.svg?name=TrashIcon');

const dropdownOptions = Immutable.List([
  'Apples',
  'Oranges',
  'Peaches',
  'Grapes',
  'Strawberries',
  'Blueberries',
  'Pears',
]);

export interface Props
{
  params?: any;
}

class UIComponentsPage extends TerrainComponent<Props>
{
  public state = {
    cron: '* * * * *',
    itemA: 'Apples',
    itemB: 'Apples',
  };

  public handleItemAChange(index)
  {
    this.setState({
      itemA: dropdownOptions.get(index),
    });
  }

  public handleItemBChange(index)
  {
    this.setState({
      itemB: dropdownOptions.get(index),
    });
  }

  public render()
  {
    const space = <div className='space' />;
    return (
      <div
        className='ui-page'
      >
        <FormSandbox />
        {space}
        <Button
          text='Standard Button'
          onClick={noop}
        />
        {space}
        <Button
          text='Disabled Button Small'
          onClick={noop}
          disabled={true}
          size='small'
          icon='next'
        />
        {space}
        <Button
          text='Active Large'
          onClick={noop}
          size='large'
          theme='active'
          icon='check'
        />
        {space}
        <Button
          text='Hidden (should not show up)'
          onClick={noop}
          hidden={true}
        />
        {space}
        <Button
          text='Back'
          onClick={noop}
          icon='back'
        />
        {space}
        <Button
          text='Custom Icon, After'
          onClick={noop}
          icon={
            <div style={{ position: 'relative', width: 10, height: 10 }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 1,
                width: 3,
                height: 3,
                background: '#000',
                opacity: 0.5,
              }} />
              <div style={{
                position: 'absolute',
                top: 0,
                left: 6,
                width: 3,
                height: 3,
                background: '#000',
                opacity: 0.5,
              }} />
              <div style={{
                position: 'absolute',
                top: 7,
                left: 0,
                width: 10,
                height: 3,
                background: '#000',
                opacity: 0.5,
              }} />
            </div>
          }
          iconComesAfter={true}
        />
        {space}
        <Dropdown
          options={dropdownOptions}
          selectedIndex={dropdownOptions.indexOf(this.state.itemA)}
          onChange={this.handleItemAChange}
          canEdit={true}
          iconLabel={<TrashIcon className='icon' style={{ fill: Colors().mainSectionTitle }} />}
          iconTooltip='Trash'
          labelClass='icon-label-class'
        />
        {space}
        <Dropdown
          options={dropdownOptions}
          selectedIndex={dropdownOptions.indexOf(this.state.itemB)}
          onChange={this.handleItemBChange}
          canEdit={true}
          textLabel='Trash'
          labelClass='icon-label-class'
        />
        {space}
        <CRONEditor
          cron={this.state.cron}
          onChange={this._setStateWrapper('cron')}
          canEdit={true}
        />
        {space}
        <div
          style={{
            background: '#f5f5f5',
            width: '100%',
            height: '309px',
            border: '2px solid #eee',
            display: 'flex',
          }}
        >
          <div
            style={{
              flexGrow: 1,
            }}
          >
            I'm just a grassy field
          </div>

          <Foldout
            direction='right'
            width={230}
          >
            {space}
            Oh me oh my it's a snake!
            {space}
            Go away you snake!
          </Foldout>
        </div>
      </div>
    );
  }

  // private renderSection()
}

// const SECTIONS: {
//   component: React.Component,
//   propSets: object[],
// }[] = [
//   {
//     component:
//   },
// ];

export default UIComponentsPage;
