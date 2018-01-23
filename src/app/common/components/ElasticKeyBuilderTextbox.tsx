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

// tslint:disable:strict-boolean-expressions member-ordering

import './BuilderTextbox.less';

import * as React from 'react';
import { Display } from '../../../blocks/displays/Display';
import { CardString } from '../../../blocks/types/Card';
import { BuilderState } from '../../builder/data/BuilderStore';
// import { AllBackendsMap } from '../../../../shared/database/AllBackends';
import TerrainComponent from '../../common/components/TerrainComponent';
import BuilderTextbox from './BuilderTextbox';
import Util from 'util/Util';

export interface Props
{
  value: CardString | number;
  keyPath: KeyPath; // keypath of value
  onChange?: (value: string | number) => void;
  language: string;

  id?: string; // TODO remove

  canEdit?: boolean;
  placeholder?: string;
  help?: string;
  ref?: string;
  className?: string;
  type?: string;
  rel?: string;
  textarea?: boolean;

  acceptsCards?: boolean;
  top?: boolean;
  parentId?: string;

  autoDisabled?: boolean;
  getAutoTerms?: (schemaState, builderState) => List<string>;

  isOverCurrent?: boolean;
  connectDropTarget?: (Element) => JSX.Element;

  isNumber?: boolean;
  typeErrorMessage?: string;

  options?: List<string | El>;
  showWhenCards?: boolean;
  display?: Display;

  onFocus?: (comp: React.Component<any, any>, value: string, event: React.FocusEvent<any>) => void;
  onBlur?: (comp: React.Component<any, any>, value: string, event: React.FocusEvent<any>) => void;

  builder?: BuilderState;
}

class ElasticKeyBuilderTextbox extends TerrainComponent<Props>
{
  public state: {
    shouldRender: boolean;
  } = {
      shouldRender: this.computeShouldRender(this.props),
    };

  private findParentCardKeyPath(storeState, keyPath: KeyPath)
  {
    do
    {
      keyPath = keyPath.skipLast(1).toList();
    } while (
      keyPath.size &&
      storeState.getIn(keyPath)
      && !storeState.getIn(keyPath)._isCard
    );
    return keyPath;
  }

  private computeShouldRender(props: Props): boolean
  {
    // TODO this is a hacky approach, find a better one
    const state = this.props.builder;
    const parentCardKeyPath = this.findParentCardKeyPath(state, this.findParentCardKeyPath(state, props.keyPath));
    // find the parent card's key path. Requires double, since the first
    //  will hit the card this textbox is in.

    if (!parentCardKeyPath.size)
    {
      // top level cards don't have keys
      return true;
    }

    return state.getIn(parentCardKeyPath) && state.getIn(parentCardKeyPath).get('childrenHaveKeys');
  }

  public componentWillReceiveProps(newProps)
  {
    // TODO this is a hacky approach, find a better one
    if (newProps.keyPath !== this.props.keyPath)
    {
      this.setState({
        shouldRender: this.computeShouldRender(newProps),
      });
    }
  }

  public render()
  {
    if (this.state.shouldRender)
    {
      return <BuilderTextbox
        {...this.props}
      />;
    }

    return <div style={PLACEHOLDER_STYLE} />;
  }
}

const PLACEHOLDER_STYLE = {
  'height': 32,
  'margin-left': 75,
};

export default Util.createTypedContainer(
  ElasticKeyBuilderTextbox,
  ['builder'],
  {}
);
