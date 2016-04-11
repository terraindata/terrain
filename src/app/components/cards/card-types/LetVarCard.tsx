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

require('./LetVarCard.less');
import * as React from 'react';
import Actions from "../../../data/Actions.tsx";
import Util from '../../../util/Util.tsx';
import LayoutManager from "../../layout/LayoutManager.tsx";
import CardField from './../CardField.tsx';
import { CardModels } from './../../../models/CardModels.tsx';
import BuilderTextbox from "../../common/BuilderTextbox.tsx";
import BuilderTextboxCards from "../../common/BuilderTextboxCards.tsx";

var ArrowIcon = require("./../../../../images/icon_arrow_42x16.svg?name=ArrowIcon");
var ExpandIcon = require("./../../../../images/icon_tql_17x14.svg?name=ExpandIcon");

interface Props {
  card: CardModels.ILetCard | CardModels.IVarCard;
  spotlights: any[];
}

class LetVarCard extends React.Component<Props, any>
{
  constructor(props:Props)
  {
    super(props);
    this.state = 
    {
      expanded: false,
    };
    Util.bind(this, 'handleExpand', 'handleChange');
  }
  
  handleExpand()
  {
    this.setState({
      expanded: !this.state.expanded,
    });
  }
    
  handleChange()
  {
    Actions.cards.let.change(this.props.card,
      this.refs['field']['value'],
      this.refs['expression']['value']);
  }

  render() {
    var card = this.props.card;
    
    var expressionInput = <BuilderTextbox
      placeholder='Expression'
      value={this.props.card.expression}
      className='let-card-code-input'
      onChange={this.handleChange}
      textarea={this.state.expanded}
      ref={'expression'}
      acceptsCards={true}
      />;

    var layout = {
      columns: [
        {
          content: (
            <BuilderTextbox
              placeholder='Variable name'
              value={this.props.card.field} 
              onChange={this.handleChange} 
              parentId={this.props.card.id}
              ref={'field'} />
          ),
        },
        {
          content: (
            <div className='card-assignment'>
              =
            </div>
          ),
          width: 50,
        },
      ],
    };
    
    if(!this.state.expanded)
    {
      layout.columns.push({
        content: expressionInput,
      });
    }
    
    var rightContent = typeof this.props.card.expression === 'string' && (
      <div onClick={this.handleExpand} className='let-card-expand'>
        <ExpandIcon />
      </div>
    );

    return (
      <div ref='let'>
        <CardField height={this.state.expanded ? 242 : 30} rightContent={rightContent}>
          <LayoutManager layout={layout} />
          { this.state.expanded ? expressionInput : null }
        </CardField>
        <BuilderTextboxCards
          value={this.props.card.expression}
          spotlights={this.props.spotlights}
          parentId={this.props.card.id}
          />
      </div>
    );
  }
};

export default LetVarCard;