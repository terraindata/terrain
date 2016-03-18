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

require('./ScoreCard.less');

import * as _ from 'underscore';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Actions from "../../../data/Actions.tsx";
import Util from '../../../util/Util.tsx';
import LayoutManager from "../../layout/LayoutManager.tsx";
import Dropdown from "../../common/Dropdown.tsx";
import CardField from './../CardField.tsx';
import { CardModels } from './../../../models/CardModels.tsx';
import ThrottledInput from "../../common/ThrottledInput.tsx";

import { Weight, Weighter } from '../../../charts/Weighter.tsx';

interface Props {
  card: CardModels.IScoreCard;
  parentId: string;
}

var methods = ['weightedSum'];

class ScoreCard extends React.Component<Props, any>
{
  constructor(props:Props)
  {
    super(props);

    this.state = 
    {
      seed: Math.random()
    };    
    
    Util.bind(this, ['handleWeightsChange', 'renderWeight', 'renderHeader',
      'handleOutputChange', 'handleMethodChange', 'handleWeightKeyChange',
      'removeWeight']);
  }
  
  handleWeightsChange(newWeights)
  {
    Actions.cards.score.changeWeights(this.props.card, newWeights);
  }
  
  handleWeightKeyChange(value, event)
  {
    var key = event.target.value;
    var index = Util.rel(event.target);
    
    var newWeights = this.props.card.weights;
    newWeights[index]['key'] = key;
    
    Actions.cards.score.changeWeights(this.props.card, newWeights);
  }
  
  removeWeight(index)
  {
    var weights = Util.deeperCloneArr(this.props.card.weights);
    var oldWeight = weights.splice(index, 1)[0];
    if(weights[index])
    {
      weights[index].weight += oldWeight.weight;  
    }
    else if(weights[index - 1])
    {
      weights[index - 1].weight += oldWeight.weight;
    }
    
    Actions.cards.score.changeWeights(this.props.card, weights);
    this.setState({
      seed: Math.random(),
    })
  }
  
  renderWeight(weight, index) 
  {
    var layout = 
    {
      colPadding: 12,
      columns:
      [
        {
          content: <ThrottledInput
            rel={index}
            value={weight.key}
            onChange={this.handleWeightKeyChange}
            placeholder='Variable or field name' />
        },
        {
          content: <Weighter 
            weights={this.props.card.weights} 
            onChange={this.handleWeightsChange}
            weightIndex={index} />  
        }
      ]
    }
    
    // seed is needed to cause a fresh render after the closign animatino,
    // otherwise React re-uses the collapsed div
    // can't use 'weight.key' as the key for the div because that will cause 
    //  multiple rows with the same/blank key to not render
    // and using an 'id' is a pain
    // if you can think of a better way, implement it
    return (
      <CardField key={this.state.seed + index} index={index} removable={true} onDelete={this.removeWeight}>
        <LayoutManager layout={layout} />
      </CardField>
    );
  }
  
  handleOutputChange(value)
  {
    Actions.cards.score.change(this.props.card, this.props.card.method, value);
  }
  
  handleMethodChange(index: number)
  {
    Actions.cards.score.change(this.props.card, methods[index], this.props.card.output); 
  }
  
  renderHeader()
  {
    var headerLayout = 
    {
      colPadding: 12,
      columns: 
      [
        {
          content: <Dropdown 
            onChange={this.handleMethodChange}
            options={methods}
            selectedIndex={methods.indexOf(this.props.card.method)} />
        },
        {
          content: <ThrottledInput value={this.props.card.output} onChange={this.handleOutputChange} />
        }
      ]
    }
    
    return (
      <CardField>
        <LayoutManager layout={headerLayout} />
      </CardField>
    );
  }

  render()
  {
    return (
      <div>
        {
          this.renderHeader()
        }
        {
          this.props.card.weights.map(this.renderWeight)
        }
      </div>
    );
  }
};

export default ScoreCard;