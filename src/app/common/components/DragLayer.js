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

// PerformantDragLayer.js
/* eslint-disable */
import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import shallowEqual from 'react-dnd/lib/utils/shallowEqual';
import shallowEqualScalar from 'react-dnd/lib/utils/shallowEqualScalar';
import isPlainObject from 'lodash/isPlainObject';
import checkDecoratorArguments from 'react-dnd/lib/utils/checkDecoratorArguments';
import hoistStatics from 'hoist-non-react-statics';

function layerStyles(isDragging) {
  return {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 1000,
    left: 0,
    top: 0,
    width: isDragging ? '100%' : 0,
    height: isDragging ? '100%' : 0,
    opacity: isDragging ? 1 : 0
  };
}

export default function DragLayer(collect, options = {}) {
  checkDecoratorArguments('DragLayer', 'collect[, options]', ...arguments);

  return function decorateLayer(DecoratedComponent) {
    const { arePropsEqual = shallowEqualScalar } = options;
    const displayName =
      DecoratedComponent.displayName ||
      DecoratedComponent.name ||
      'Component';

    class DragLayerContainer extends Component {
      static DecoratedComponent = DecoratedComponent;

      static displayName = `DragLayer(${displayName})`;

      static contextTypes = {
        dragDropManager: PropTypes.object.isRequired
      }

      getDecoratedComponentInstance() {
        return this.refs.child;
      }

      shouldComponentUpdate(nextProps, nextState) {
        return !arePropsEqual(nextProps, this.props) ||
          !shallowEqual(nextState, this.state);
      }

      constructor(props, context) {
        super(props);
        this.handleOffsetChange = this.handleOffsetChange.bind(this);
        this.handleStateChange = this.handleStateChange.bind(this);

        this.manager = context.dragDropManager;

        this.state = this.getCurrentState();
      }

      componentDidMount() {
        this.isCurrentlyMounted = true;

        const monitor = this.manager.getMonitor();
        this.unsubscribeFromOffsetChange = monitor.subscribeToOffsetChange(
          this.handleOffsetChange
        );
        this.unsubscribeFromStateChange = monitor.subscribeToStateChange(
          this.handleStateChange
        );

        this.handleStateChange();
      }

      componentWillUnmount() {
        this.isCurrentlyMounted = false;

        this.unsubscribeFromOffsetChange();
        this.unsubscribeFromStateChange();
      }

      handleOffsetChange() {
        if (!this.isCurrentlyMounted) {
          return;
        }

        const monitor = this.manager.getMonitor();
        const offset = monitor.getSourceClientOffset();
        const offsetDiv = this.refs.offset;
        if (offset && offsetDiv) {
          offsetDiv.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
        }
      }

      handleStateChange() {
        if (!this.isCurrentlyMounted) {
          return;
        }

        const nextState = this.getCurrentState();
        if (!shallowEqual(nextState, this.state)) {
          this.setState(nextState);
        }
      }

      getCurrentState() {
        const monitor = this.manager.getMonitor();
        return {
          collected: collect(monitor),
          isDragging: monitor.isDragging()
        };
      }

      render() {
        return (
          <div style={layerStyles(this.state.isDragging)}>
            <div ref='offset'>
              {this.state.isDragging && <DecoratedComponent {...this.props} {...this.state.collected} ref='child' />}
            </div>
          </div>
        );
      }
    }

    return hoistStatics(DragLayerContainer, DecoratedComponent);
  };
}
