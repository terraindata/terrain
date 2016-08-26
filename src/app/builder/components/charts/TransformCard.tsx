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
let {Map, List} = Immutable;
import * as _ from 'underscore';
import * as React from 'react';
import Actions from "../../data/BuilderActions.tsx";
import Util from '../../../util/Util.tsx';
import { BuilderTypes } from './../../BuilderTypes.tsx';
import PureClasss from './../../../common/components/PureClasss.tsx';
import TransformCardChart from './TransformCardChart.tsx';
import TransformCardPeriscope from './TransformCardPeriscope.tsx';

interface Props
{
  key: string;
  keyPath: KeyPath;
  data: any; // transform card
  
  canEdit?: boolean;
  spotlights?: any;  
}

class TransformCard extends PureClasss<Props>
{
  state: {
    domain: List<number>;
    range: List<number>;
  };
  
  constructor(props:Props)
  {
    super(props);
    this.state = {
      domain: List(props.data.domain as number[]),
      range: List([0,1]),
    };
  }
  
  handleDomainChange(domain: List<number>)
  {
    this.setState({
      domain,
    });
  }
  
  handleUpdatePoints(points)
  {
    Actions.change(this.props.keyPath, points);
  }
  
  render()
  {
    let {data} = this.props;
    return (
      <div className='transform-card'>
        <TransformCardChart
          canEdit={this.props.canEdit}
          points={data.scorePoints}
          bars={data.bars}
          domain={this.state.domain}
          range={this.state.range}
          spotlights={this.props.spotlights}
          inputKey={data.input}
          updatePoints={this.handleUpdatePoints}
        />
        <TransformCardPeriscope
          onDomainChange={this.handleDomainChange}
          barsData={data.bars}
          domain={this.state.domain}
          range={this.state.range}
          maxDomain={data.domain}
        />
      </div>
    );
  }
};

export default TransformCard;