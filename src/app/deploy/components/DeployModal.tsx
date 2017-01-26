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

require('./DeployModal.less');
import PureClasss from './../../common/components/PureClasss.tsx';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as classNames from 'classnames';
import * as Immutable from 'immutable';

import Modal from '../../common/components/Modal.tsx';
import TQLEditor from '../../tql/components/TQLEditor.tsx';
import TQLConverter from '../../tql/TQLConverter.tsx';
import LibraryStore from '../../library/data/LibraryStore.tsx';
import LibraryActions from '../../library/data/LibraryActions.tsx';
import BuilderTypes from '../../builder/BuilderTypes.tsx';
import LibraryTypes from '../../library/LibraryTypes.tsx';
import DeployModalColumn from './DeployModalColumn.tsx';

let {EVariantStatus} = LibraryTypes;

interface Props {
}

class DeployModal extends PureClasss<Props>   
{
  state: {
    changingStatus: boolean;
    changingStatusOf: LibraryTypes.Variant;
    changingStatusTo: LibraryTypes.EVariantStatus;
    defaultChecked: boolean;
  } = {
    changingStatus: false,
    changingStatusOf: null,
    changingStatusTo: null,
    defaultChecked: false,
  };
  
  componentDidMount()
  {
    this._subscribe(LibraryStore, {
      updater: (state) =>
      {
        let {changingStatus, changingStatusOf, changingStatusTo, changingStatusDefault} = state;
        if(
          changingStatus !== this.state.changingStatus ||
          changingStatusOf !== this.state.changingStatusOf ||
          changingStatusTo !== this.state.changingStatusTo
        ) {
          this.setState({
            changingStatus,
            changingStatusOf,
            changingStatusTo,
            defaultChecked: changingStatusDefault,
          });
        }
      },
      isMounted: true,  
    });
  }
  
  handleClose()
  {
    LibraryActions.variants.status(null, null);
  }
  
  handleDeploy()
  {
    LibraryActions.variants.status(
      this.state.changingStatusOf, this.state.changingStatusTo, true, this.state.defaultChecked
    );
  }
  
  renderTQLColumn(defaultVariant:LibraryTypes.Variant)
  {
    let variant = this.state.changingStatusOf;
    let defaultTql = 
      (this.state.defaultChecked && defaultVariant) ? defaultVariant.query.tql : null;
    let tql = variant ? variant.query.tql : '';
    
    return (
      <div className='deploy-modal-tql'>
        <div className='deploy-modal-tql-wrapper'>
          <TQLEditor
            canEdit={false}
            tql={tql}
            isDiff={this.state.defaultChecked && defaultTql !== null}
            diffTql={defaultTql}
          />
        </div>
      </div>
    );
  }
  
  handleDefaultCheckedChange(defaultChecked: boolean)
  {
    this.setState({
      defaultChecked,
    });
  }
  
  render() 
  {
    if(!this.state.changingStatus)
    {
      return null;
    }
    
    let {changingStatus, changingStatusOf, changingStatusTo} = this.state;
    let name = (changingStatusOf && changingStatusOf.name);
    
    let title = 'Deploy "' + name + '" to Live';
    if(changingStatusTo !== EVariantStatus.Live)
    {
      title = 'Remove "' + name + '" from Live';
    }
    
    if(this.state.defaultChecked)
    {
      let libraryState = LibraryStore.getState();
      var defaultVariant = libraryState.variants.find(
        v => v.algorithmId === changingStatusOf.algorithmId && v.isDefault
      );
    }
    
    return (
      <Modal
        open={this.state.changingStatus} 
        message={null}
        onClose={this.handleClose}
        title={title}
        confirm={false}
        fill={true}
      >
        {
          changingStatusOf &&
            <div
              className={classNames({
                'deploy-modal': true,
              })}
            >
              {
                this.renderTQLColumn(defaultVariant)
              }
              <DeployModalColumn
                variant={changingStatusOf}
                status={changingStatusTo}
                onDeploy={this.handleDeploy}
                defaultChecked={this.state.defaultChecked}
                defaultVariant={defaultVariant}
                onDefaultCheckedChange={this.handleDefaultCheckedChange}
              />
            </div>
        }
      </Modal>
    );
  }
}

export default DeployModal;