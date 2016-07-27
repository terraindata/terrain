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
import Actions from "../../../data/BuilderActions.tsx";
import Util from '../../../../util/Util.tsx';
import LayoutManager from "../../layout/LayoutManager.tsx";
import Dropdown from "../../../../common/components/Dropdown.tsx";
import CardField from './../CardField.tsx';
import { BuilderTypes } from './../../../BuilderTypes.tsx';
import BuilderTextbox from "../../../../common/components/BuilderTextbox.tsx";
import Classs from './../../../../common/components/Classs.tsx';

var BORDER_RADIUS = '5px';
var SCORE_COLORS = 
{
  POSITIVE: ["#DFDE52", "#AFD364", "#9DCF66", "#88C33E"],
  NEGATIVE: ["#F8B14A", "#FF735B", "#DD333C", "#A50808"],
};

interface Props {
  card: BuilderTypes.IScoreCard;
  parentId: string;
  canEdit?: boolean;
  keys: string[];
}

var methods = ['weightedSum'];

class ScoreCard extends Classs<Props>
{
  constructor(props:Props)
  {
    super(props);

    this.state = 
    {
      seed: Math.random()
    };    
  }
  
  handleWeightsChange(value, event)
  {
    Actions.cards.score.changeWeights(this.props.card, _.range(0, this.props.card.weights.size).map(
      index => ({
        key: this.refs[index]['value'],
        weight: parseFloat(this.refs[index + '-weight']['value']),
      })
    ));
  }
  
  removeWeight(index)
  {
    var weights = Util.deeperCloneArr(this.props.card.weights);
    weights.splice(index, 1)[0];
    
    Actions.cards.score.changeWeights(this.props.card, weights);
    this.setState({
      seed: Math.random(),
    })
  }
  
  addWeight(index)
  {
    Actions.cards.score.create(this.props.card, index + 1);
  }
  
  renderWeight(weight, index) 
  {
    var layout = 
    {
      colPadding: 12,
      columns:
      [
        {
          colSpan: 3,
          content:
            <BuilderTextbox
              {...this.props}
              ref={index}
              value={weight.key}
              placeholder='Variable or field name'
              id={this.props.card.id}
              keyPath={this._keyPath('weights', index, 'key')}
              options={this.props.keys}
            />
        },
        {
          colSpan: 1,
          content:
            <BuilderTextbox
              {...this.props}
              ref={index + '-weight'}
              value={weight.weight + ""}
              id={this.props.card.id}
              keyPath={this._keyPath('weights', index, 'weight')}
              placeholder='0'
              help='Weight for this field or variable'
            />
        },
        {
          colSpan: 4,
          content: this.renderWeightGraph(weight)
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
      <CardField
        key={this.state.seed + index}
        index={index}
        removable={this.props.canEdit}
        onDelete={this.removeWeight}
        addable={this.props.canEdit}
        onAdd={this.addWeight}
      >
        <LayoutManager layout={layout} />
      </CardField>
    );
  }
  
  renderWeightGraph(weight)
  {
    // TODO don't recalc max every time
    let {weights} = this.props.card;
    var max = 0;
    weights.map(weight => max = Math.max(Math.abs(weight.weight), max));
    
    var perc = Math.abs(weight.weight) / max * 100;
    var style:React.CSSProperties = {
      width: perc / 2 + '%',
    };
    
    if(weight.weight > 0)
    {
      style.left = '50%';
      style['background'] = SCORE_COLORS.POSITIVE[Math.floor((perc - 1) / 25)];
      style.borderTopRightRadius = BORDER_RADIUS;
      style.borderBottomRightRadius = BORDER_RADIUS;
    }
    else if(weight.weight < 0)
    {
      style.right = '50%';
      style['background'] = SCORE_COLORS.NEGATIVE[Math.floor((perc - 1) / 25)];
      style.borderTopLeftRadius = BORDER_RADIUS;
      style.borderBottomLeftRadius = BORDER_RADIUS;
    }
    
    return (
      <div className='weight-graph'>
        <div className='weight-graph-inner'>
          <div className='weight-graph-bar' style={style} />
        </div>
        <div className='weight-graph-line' />
      </div>
    );
  }
  
  handleMethodChange(index: number)
  {
    Actions.cards.score.change(this.props.card, methods[index]);
  }
  
  renderHeader()
  {
    // we only have one option for now, so we won't show the header
    return null;
    // return (
    //   <CardField>
    //     <Dropdown 
    //       onChange={this.handleMethodChange}
    //       options={methods}
    //       selectedIndex={methods.indexOf(this.props.card.method)} />
    //   </CardField>
    // );
  }

  render()
  {
    return (
      <div>
        {
          this.renderHeader()
        }
        {
          this.props.card.weights.size === 0 && 
            <div className='info-message info-message-clickable'
              onClick={this.addWeight}>Add a weight</div>
        }
        {
          this.props.card.weights.map(this.renderWeight)
        }
      </div>
    );
  }
};

export default ScoreCard;