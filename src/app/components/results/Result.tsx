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

require('./Result.less');
import * as $ from 'jquery';
import * as React from 'react';
import Util from '../../util/Util.tsx';
import PanelMixin from '../layout/PanelMixin.tsx';
import Menu from '../common/Menu.tsx';
import Actions from '../../data/Actions.tsx';
import ColorManager from '../../util/ColorManager.tsx';

// var images = 
// [
//   require('../../../images/sitters/sitters_0000_0.jpg'),
//   require('../../../images/sitters/sitters_0001_1.jpg'),
//   require('../../../images/sitters/sitters_0002_2.jpg'),
//   require('../../../images/sitters/sitters_0003_3.jpg'),
//   require('../../../images/sitters/sitters_0004_4.jpg'),
//   require('../../../images/sitters/sitters_0005_5.jpg'),
//   require('../../../images/sitters/sitters_0006_6.jpg'),
//   require('../../../images/sitters/sitters_0007_7.jpg'),
//   require('../../../images/sitters/sitters_0008_8.jpg'),
//   require('../../../images/sitters/sitters_0009_9.jpg'),
//   require('../../../images/sitters/sitters_0010_10.jpg'),
//   require('../../../images/sitters/sitters_0011_11.jpg'),
//   require('../../../images/sitters/sitters_0012_12.jpg'),
//   require('../../../images/sitters/sitters_0013_13.jpg'),
//   require('../../../images/sitters/sitters_0014_14.jpg'),
//   require('../../../images/sitters/sitters_0015_15.jpg'),
//   require('../../../images/sitters/sitters_0016_16.jpg'),
//   require('../../../images/sitters/sitters_0017_17.jpg'),
//   require('../../../images/sitters/sitters_0018_18.jpg'),
//   require('../../../images/sitters/sitters_0019_19.jpg'),
//   require('../../../images/sitters/sitters_0020_20.jpg'),
//   require('../../../images/sitters/sitters_0021_21.jpg'),
//   require('../../../images/sitters/sitters_0022_22.jpg'),
//   require('../../../images/sitters/sitters_0023_23.jpg'),
//   require('../../../images/sitters/sitters_0024_24.jpg'),
//   require('../../../images/sitters/sitters_0025_25.jpg'),
//   require('../../../images/sitters/sitters_0026_26.jpg'),
//   require('../../../images/sitters/sitters_0027_27.jpg'),
// ];

var PinIcon = require("./../../../images/icon_pin_21x21.svg?name=PinIcon&reactDom=react");
var ScoreIcon = require("./../../../images/icon_terrain_27x16.svg?name=ScoreIcon");

var fields = 
[
  'image',
  'minPrice',
  'numJobs',
  'avgRating',
  'cities',
  'attributes',
  'location',
  'description',
  'avgResponseTime',
];

var Result = React.createClass<any, any>({
	mixins: [PanelMixin],
  
  getInitialState() {
    return {
      score: Math.random(),
      openFields: [],
      expanded: false,
    }
  },

	propTypes:
	{
		data: React.PropTypes.object.isRequired,
		parentNode: React.PropTypes.object,
    onExpand: React.PropTypes.func.isRequired,
	},

	getDefaultProps() 
	{
		return {
			drag_x: true,
			drag_y: true,
			reorderOnDrag: true,
			dragInsideOnly: true,
      data: {},
		};
	},
  
  toggleField(event) {
    var field = $(event.target).attr('rel');
    if(this.state.openFields.indexOf(field) === -1)
    {
      this.setState({
        openFields: this.state.openFields.concat([field]),
      });
    }
    else
    {
      this.state.openFields.splice(this.state.openFields.indexOf(field), 1);
      this.setState({
        openFields: this.state.openFields,
      });
    }
  },
  
  renderField(field, index)
  {
    if(index > 3 && !this.props.expanded)
    {
      return null;
    }
    
    if(field === 'image')
    {
      var id = this.props.data['id'];
      
      if(id === undefined)
      {
        return null;
      }
      
      return (
        <div className="result-field result-field-image" key={field}>
          <div className="result-field-name">
            { field }
          </div>
          <div className='result-field-value result-field-value-image'>
            <img src={'http://lukeknepper.com/alfaromeo/sitters/sitters_00' + (id < 10 ? '0' : '') + id + '_' + id + '.jpg'} />
          </div>
        </div>
      );
    }
    
    if(this.props.data[field] === undefined)
    {
      return null;
    }
    
    return (
      <div className="result-field" key={field}>
        <div className="result-field-name">
          { field }
        </div>
        <div
          className={'result-field-value ' + ((field + this.props.data[field]).length < 15 ? 'result-field-value-short' : '')}
          >
          { this.props.data[field] }
        </div>
      </div>
    );
  },
  
  spotlight()
  {
    Actions.results.spotlight(this.props.data, ColorManager.colorForKey(this.props.data.id));
  },
  
  unspotlight()
  {
    Actions.results.spotlight(this.props.data, false);
  },
  
  pin()
  {
    Actions.results.pin(this.props.data, true);
  },
  
  unpin()
  {
    Actions.results.pin(this.props.data, false);
  },
  
  renderSpotlight()
  {
    if(!this.props.data.spotlight)
    {
      return null;
    }
    
    return <div className='result-spotlight' style={{background: this.props.data.spotlight}}></div>;
  },
  
  getMenuOptions()
  {
    var menuOptions = [];
    
    if(this.props.data.spotlight)
    {
      menuOptions.push({
        text: 'Un-Spotlight',
        onClick: this.unspotlight,
      });
    }
    else
    {
      menuOptions.push({
        text: 'Spotlight',
        onClick: this.spotlight,
      });
    }
    
    if(this.props.data.pinned)
    {
      menuOptions.push({
        text: 'Un-Pin',
        onClick: this.unpin,
      });
    }
    else
    {
      menuOptions.push({
        text: 'Pin',
        onClick: this.pin,
      })
    }
    
    return menuOptions;
  },
  
  expand() {
    this.props.onExpand(this.props.data);
  },
  
	render() {
    var classes = 'result' + (this.props.data.pinned ? ' result-pinned' : '') + (this.state.expanded ? ' result-expanded' : '');
    
		return this.renderPanel((
			<div className={classes}>
				<div className='result-inner' onDoubleClick={this.expand}>
          <div className='result-name'>
            {this.renderSpotlight()}
            <div className='result-pin-icon'>
              <PinIcon />
            </div>
            {this.props.data.name}
          </div>
          <Menu options={this.getMenuOptions()} />
					<div className='result-score'>
            <ScoreIcon className='result-score-icon' />
            Final Score
            <div className='result-score-score'>
              { this.props.data.score }
            </div>
					</div>
          <div className='result-fields-wrapper'>
            { fields.map(this.renderField) }
          </div>
				</div>
			</div>
			));
	},
});

export default Result;