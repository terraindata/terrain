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

// Copyright 2018 Terrain Data, Inc.
// tslint:disable:no-var-requires strict-boolean-expressions

import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import * as Radium from 'radium';
import * as React from 'react';
import { browserHistory } from 'react-router';

import FilePicker from 'common/components/FilePicker';
import Loading from 'common/components/Loading';
import Modal from 'common/components/Modal';
import { MultiModal } from 'common/components/overlay/MultiModal';
import { ETLTemplate } from 'shared/etl/immutable/TemplateTypes';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import { ETLActions, ETLReducers } from 'etl/ETLRedux';
import { ETLState } from 'etl/ETLTypes';
import './ETLPage.less';

const { List, Map } = Immutable;

export interface Props
{
  children?: any;

  // injected props
  act?: typeof ETLActions;
  etl?: ETLState;
}

class ETLPage extends TerrainComponent<Props>
{
  public componentDidMount()
  {
    this.props.act({
      actionType: 'fetchTemplates',
    });
    // TODO lock UI until done?
  }

  public setModalRequests(requests)
  {
    this.props.act({
      actionType: 'setModalRequests',
      requests,
    });
  }

  // get unacknowledged template if it exists
  public getRunningTemplate(): ETLTemplate | undefined
  {
    const { runningTemplates, acknowledgedRuns } = this.props.etl;
    return runningTemplates.find((template) => !Boolean(acknowledgedRuns.get(template.id)));
  }

  public renderRunningTemplateModal()
  {
    const { runningTemplates, acknowledgedRuns } = this.props.etl;
    const template = this.getRunningTemplate();
    const showTemplate = template !== undefined && !acknowledgedRuns.get(template.id);
    let message = '';
    if (showTemplate)
    {
      message = `"${runningTemplates.first().templateName}" is currently running`;
    }

    return (
      <Modal
        title={'Task In Progress'}
        open={showTemplate}
        onClose={this.handleCloseRunningTemplateModal}
      >
        <div className='etl-page-loading-modal-content'>
          {message}
          <Loading
            width={150}
            height={150}
            loading={true}
            loaded={false}
          />
        </div>
      </Modal>
    );
  }

  public render()
  {
    const { modalRequests } = this.props.etl;

    return (
      <div className='etl-page-root'>
        {
          this.props.children
        }
        {
          this.renderRunningTemplateModal()
        }
        <MultiModal
          requests={modalRequests}
          setRequests={this.setModalRequests}
        />
      </div>
    );
  }

  public handleCloseRunningTemplateModal()
  {
    const { runningTemplates } = this.props.etl;
    const template = this.getRunningTemplate();
    if (template !== undefined)
    {
      this.props.act({
        actionType: 'setAcknowledgedRun',
        templateId: template.id,
        value: true,
      });
    }
  }
}

export default Util.createContainer(
  ETLPage,
  ['etl'],
  { act: ETLActions },
);
