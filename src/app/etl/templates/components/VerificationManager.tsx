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
// tslint:disable:no-var-requires import-spacing

import TerrainComponent from 'common/components/TerrainComponent';
import { tooltip } from 'common/components/tooltip/Tooltips';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';
import { instanceFnDecorator } from 'shared/util/Classes';
import LanguageController, { FieldVerification } from 'shared/etl/languages/LanguageControllers';

import Modal from 'common/components/Modal';

import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { TemplateEditorState } from 'etl/templates/TemplateEditorTypes';

import './EditorActionsSection.less';

export interface Props
{
  // below from container
  templateEditor?: TemplateEditorState;
  editorAct?: typeof TemplateEditorActions;
}

const reverifyDelay = 2000;
const sleepTime = 1;

/*
 *  This class follows a bit of an anti-pattern since it is responsible for dealing w/
 *  asynchronous computation which can have adverse affects on app performance
 */
class VerificationManager extends TerrainComponent<Props>
{
  private isComputing = false;

  constructor(props)
  {
    super(props);
  }

  public componentDidMount()
  {
    this.requestCompute();
  }

  public componentWillUnmount()
  {
    this.isComputing = false;
    this.cancel();
  }

  public componentWillReceiveProps(nextProps)
  {
    if (nextProps.templateEditor.template !== this.props.templateEditor.template)
    {
      this.requestCompute();
    }
  }

  public render()
  {
    return (
      <div className='verification-manager'>

      </div>
    );
  }

  private requestCompute()
  {
    if (this.isComputing)
    {
      this.isComputing = false;
    }
    this.computeVerifications();
  }

  private buildVerificationMap(verifications: List<FieldVerification>): Immutable.Map<number, List<FieldVerification>>
  {
    return null;
  }

  @instanceFnDecorator(_.debounce, reverifyDelay)
  private computeVerifications()
  {
    const { templateEditor } = this.props;
    const lang = templateEditor.template.getEdgeLanguage(templateEditor.getCurrentEdgeId());
    const controller = LanguageController.get(lang);
    this.iterateOverVerifications().then((verifications) => {
      const verificationMap = this.buildVerificationMap(verifications);
      this.props.editorAct({
        actionType: 'setDisplayState',
        state: {
          fieldVerifications: verifications,
        }
      });
      this.isComputing = false;
    }).catch((ev) => {
      // this should not happen?
      // tslint:disable-next-line
      console.error(ev);
      this.isComputing = false;
    });
  }

  private iterateOverVerifications(): Promise<List<FieldVerification>>
  {
    return new Promise<List<FieldVerification>>(async (resolve, reject) => {

    });
  }

  private cancel()
  {
    (this.computeVerifications as any).cancel();
  }
}

export default Util.createContainer(
  VerificationManager,
  ['templateEditor'],
  {
    editorAct: TemplateEditorActions,
  },
);
