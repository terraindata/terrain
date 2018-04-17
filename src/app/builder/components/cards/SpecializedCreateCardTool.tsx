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

// tslint:disable:strict-boolean-expressions member-access

import * as Immutable from 'immutable';
import * as React from 'react';
import { Card, CardConfig } from '../../../../blocks/types/Card';
import { AllBackendsMap } from '../../../../database/AllBackends';
import TerrainComponent from '../../../common/components/TerrainComponent';
import BuilderActions from '../../data/BuilderActions';

import Util from 'util/Util';
import CreateCardTool from './CreateCardTool';

export interface Props
{
  keyPath: KeyPath;
  data: Card;
  canEdit: boolean;
  helpOn: boolean;
  className: string;
  onChange: (keyPath: KeyPath, value: any, notDirty: boolean) => void;
  language: string;
  handleCardDrop: (cardType: string) => any;

  builderActions?: typeof BuilderActions;
}

const emptyList = Immutable.List([]);

const STYLE = {
  marginTop: -2,
  // width: 'calc(100% + 59px)',
  // marginLeft: -55,
};

class SpecializedCreateCardTool extends TerrainComponent<Props>
{
  state: {
    options?: List<{
      text: string;
      type: string;
    }>;
    open: boolean,
  };

  constructor(props: Props)
  {
    super(props);
    this.state = {
      options: this.getOptions(this.props),
      open: false,
    };
  }

  public getOptions(props: Props)
  {
    const options = props.data['getChildOptions'](props.data, AllBackendsMap[this.props.language]);

    if (this.state && options.equals(this.state.options))
    {
      return this.state.options;
    }

    return options;
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (nextProps.data !== this.props.data)
    {
      this.setState({
        options: this.getOptions(nextProps),
      });
    }
  }

  public onClick(index: number)
  {
    const option = this.state.options.get(index);
    const card = this.props.data['childOptionClickHandler'](
      this.props.data, option,
    );

    this.props.builderActions.change(
      this.props.keyPath,
      card,
    );
    this.setState({
      open: false,
    });
  }

  public render()
  {
    // const accepts = this.props.data.static[] !== undefined ? this.props.data.static.accepts : emptyList;
    const st = this.props.data.get('static') as CardConfig['static'];
    const accepts = st.accepts !== undefined ? st.accepts : emptyList;
    return (
      <div style={STYLE} >
        <CreateCardTool
          index={-1 /* TODO this will have to adjust if we use component
           in in more places */ }
          keyPath={this.props.keyPath.push('cards')}
          canEdit={this.props.canEdit}
          language={this.props.language}
          className={this.props.className}
          accepts={accepts}
          data={this.props.data}
          handleCardDrop={this.props.handleCardDrop}

          open={this.state.open}
          onToggle={this._toggle('open')}

          overrideText={this.state.options}
          overrideClick={this.onClick}
        />
      </div>
    );
  }
}

export default Util.createTypedContainer(
  SpecializedCreateCardTool,
  [],
  { builderActions: BuilderActions },
);
