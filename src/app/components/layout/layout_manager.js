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

require('./layout_manager.less');
var React = require('react');
var $ = require('jquery');

// Coordinate these classNames with layout_manager.css/less
var lmClass = 'layout-manager';
var colClass = 'layout-manager-column';
var rowClass = 'layout-manager-row';
var cellClass = 'layout-manager-cell';

var LayoutManager = React.createClass({
	propTypes: {
		layout: React.PropTypes.object.isRequired
	},

	updateDimensions() {
		this.setState({rand: Math.random()});
	},
	componentDidMount() {
        window.addEventListener("resize", this.updateDimensions);
  },
  componentWillUnmount() {
      window.removeEventListener("resize", this.updateDimensions);
  },

	getSumThroughIndex(index) {
		var sum = 0;
		if(this.props.layout.rows) {
			sum = this.props.layout.rows.reduce((sum, row, i) => (((i < index || index === -1) && (row.rowSpan || 1)) + sum), 0);
		} else if(this.props.layout.columns) {
			sum = this.props.layout.columns.reduce((sum, col, i) => (((i < index || index === -1) && (col.colSpan || 1)) + sum), 0);
		}
		return sum;
	},

	renderObj(obj, className, index, style) {
		var content = obj.content; 

		// check for a nested layout
		if(obj.columns || obj.rows || obj.cells)
			content = <LayoutManager layout={obj} />
		
		return (<div className={className} style={style} key={index}>{content}</div>);
	},

	renderRow(row, index) {
		var style = {};
		if(this.props.layout.rowHeight === 'fill') {
			// TODO clean this up
			var total = this.getSumThroughIndex(-1), sum = this.getSumThroughIndex(index);
			style = {
				top: (sum / total) * 100 + '%',
				height: ((row.rowSpan || 1) / total) * 100 + '%',
				position: 'absolute'
			};
		}
		return this.renderObj(row, rowClass, index, style);
	},

	renderColumn(column, index) {
		// TODO clean this up
		var total = this.getSumThroughIndex(-1), sum = this.getSumThroughIndex(index);
		var classToPass = colClass;
		var style = {
			left: (sum / total) * 100 + '%',
			width: ((column.colSpan || 1) / total) * 100 + '%'
		};
		if(this.props.layout.stackAt && this.props.layout.stackAt > $(window).width()) {
			classToPass = "";
			style = {};
		}
		return this.renderObj(column, classToPass, index, style);
	},

	renderCell(cell, index) {
		// todo consider moving this to somehwere not in a loop
		var height = this.props.layout.cellHeight;
		if(typeof height !== 'string')
			height += 'px'; // necessary?

		var width = this.props.layout.cellWidth;
		if(typeof width === 'object') {
			// parse the object
			var docWidth = $(window).width(), curMax = -1;
			$.each(width, function(key, val) {
				// find the largest key smaller than docWidth
				if(docWidth > key && key > curMax)
					curMax = key;
			});
			width = width[curMax];
		}
		// todo parse if not string

		// var x = 

		var style = {
			height: height,
			width: width
		}

		return this.renderObj(cell, cellClass, index, style);
	},

	render() {
		var layoutSum = (this.props.layout.rows ? 1 : 0) + (this.props.layout.columns ? 1 : 0) + (this.props.layout.cells ? 1 : 0);
		if(layoutSum !== 1) {
			// TODO write test for this
			return (
				<div className='error'>
					Error: Must pass one and only one of [cells, rows, columns] to the same level of a LayoutManager. Passed <b>{layoutSum}</b>.
					<pre>{JSON.stringify(this.props.layout)}</pre>
				</div>
				);
		}

		return (
			<div className={lmClass}>
				{ this.props.layout.columns && this.props.layout.columns.map(this.renderColumn) }
				{ this.props.layout.rows && this.props.layout.rows.map(this.renderRow) }
				{ this.props.layout.cells && this.props.layout.cells.map(this.renderCell) }
			</div>
			);
	},
});

module.exports = LayoutManager;