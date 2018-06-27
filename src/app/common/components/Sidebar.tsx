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

// tslint:disable:no-var-requires restrict-plus-operands interface-name

import * as classNames from 'classnames';
import AccountDropdown from 'common/components/AccountDropdown';
import Button from 'common/components/Button';
import CheckBox from 'common/components/CheckBox';
import Modal from 'common/components/Modal';
import PopUpForm from 'common/components/PopUpForm';
import { tooltip } from 'common/components/tooltip/Tooltips';
import TemplateList, { AllowedActions } from 'etl/templates/components/TemplateList';
import * as html2canvas from 'html2canvas';
import * as Radium from 'radium';
import * as React from 'react';
import { Link } from 'react-router-dom';
import * as request from 'request';
import { Ajax } from 'util/Ajax';
import { AuthState } from '../../auth/AuthTypes';
import { backgroundColor, Colors, fontColor, getStyle } from '../../colors/Colors';
import { ColorsActions } from '../../colors/data/ColorsRedux';
import TerrainComponent from '../../common/components/TerrainComponent';
import * as UserTypes from '../../users/UserTypes';
import Util from '../../util/Util';
import './Sidebar.less';
type User = UserTypes.User;
const ExpandIcon = require('./../../../images/icon_expand_12x12.svg?name=ExpandIcon');
const linkHeight = 50; // Coordinate with Sidebar.less
const TerrainIcon = require('images/logo_terrainLong_blue@2x.png');
const TerrainSmallIcon = require('images/logo_terrain_mountain.png');
const BugSmallIcon = require('images/icon-bug.png');
const FeedbackSmallIcon = require('images/icon-feedback.png');
const linkOffsetExpanded = 207;
const linkOffsetCollapsed = 133;
const topBarItemStyle = [backgroundColor(Colors().bg3, Colors().bg2), fontColor(Colors().active)];
const topBarRunStyle = [backgroundColor(Colors().activeHover, Colors().active), fontColor(Colors().activeText)];
const Color = require('color');

export interface ILink
{
  icon: any;
  text: string;
  route: string;
  enabled?: boolean;
}

export interface Props
{
  links: ILink[];
  colorsActions: typeof ColorsActions;
  selectedIndex: number;
  expandable?: boolean;
  expanded?: boolean;
  onExpand?: () => void;
  users?: UserTypes.UserState;
}

@Radium
export class Sidebar extends TerrainComponent<Props>
{
  public state: {
    linkOffset: number,
    reportBugModalOpen: boolean,
    reportFeedbackModalOpen: boolean,
  } =
    {
      linkOffset: 0,
      reportBugModalOpen: false,
      reportFeedbackModalOpen: false,
    };

  public renderRootLevelModals(): any[]
  {
    const modals = [];
    // const bugForm =
    // <BugFeedbackForm
    // title='REPORT A BUG'
    // formDescription='Please describe your bug in as much detail as possible below. Your email address will be recorded.'
    // textboxPlaceholder='Put your bug description here.'
    // isBug={true}
    // checkboxLabel= 'Check to include screenshot.'> </BugFeedbackForm>;

    // const feedbackForm =
    // <BugFeedbackForm
    // title='GENERAL FEEDBACK'
    // formDescription='Please submit any feedback you have below. Your email address will be recorded.'
    // textboxPlaceholder='Feedback description here.'
    // isBug={false}
    // checkboxLabel= 'Check to include screenshot.'> </BugFeedbackForm>;

    if (this.state.reportBugModalOpen)
    {
      modals.push(
        <PopUpForm

          key='reportBug'
          formDescription='Please describe your bug in as much detail as possible below. Your email address will be recorded.'
          textboxPlaceholder='Put your bug description here.'
          isBug={true}
          className='bug-report'
          open={this.state.reportBugModalOpen}
          onClose={this.closeTemplateUI}
          wide={true}
          showTextbox={true}
          closeOnConfirm={true}
          confirm={true}
          >
        </PopUpForm>,
      );
    }
    if (this.state.reportFeedbackModalOpen)
    {
      modals.push(
        <PopUpForm
          title='GENERAL FEEDBACK'
          formDescription='Please submit any feedback you have below. Your email address will be recorded.'
          textboxPlaceholder='Feedback description here.'
          isBug={false}
          key='giveFeedback'
          className='feedback-report'
          open={this.state.reportFeedbackModalOpen}
          onClose={this.closeTemplateUI}
          wide={true}
          showTextbox={true}
          closeOnConfirm={true}
          confirm={true}
        >
        </PopUpForm>,
      );
    }
    return modals;
  }

  // public handleDescriptionChange(newValue: string)
  // {
  //   this.setState({
  //     description: newValue,
  //   });
  // }

  // public handleSendReportClicked(): void
  // {
  //   const data = {
  //     bug: this.state.isBug,
  //     description: this.state.description,
  //     user: this.props.users.currentUser.email,
  //     browserInfo: navigator.appVersion,
  //   };
  //   this.takeScreenshot(data, this.state.screenshotChecked);
  // }

  // public postFeedbackData(data: object)
  // {
  //   const restoreAppOpacity = () => {
  //     if (data['screenshot'] !== undefined)
  //     {
  //       const newApp: HTMLElement = document.getElementsByClassName('app-inner')[0] as HTMLElement;
  //       newApp.style.opacity = 'inherit';
  //     }
  //   };

  //   Ajax.req(
  //     'post',
  //     `feedback/`,
  //     data,
  //     (response) => restoreAppOpacity(),
  //     {
  //       onError: (err) => restoreAppOpacity(),

  //     });
  // }

  // public takeScreenshot(data: object, screenshotChecked: boolean): void
  // {
  //   if (screenshotChecked)
  //   {
  //       const app: HTMLElement = document.getElementsByClassName('app-inner')[0] as HTMLElement;
  //       app.style.opacity = '1.0';
  //       html2canvas(app).then((canvas) => {
  //         const dataUrl = canvas.toDataURL();
  //         data['screenshot'] = dataUrl;
  //         this.postFeedbackData(data);
  //       });
  //   }
  //   else
  //   {
  //     this.postFeedbackData(data);
  //   }
  // }

  public componentWillMount()
  {
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.sidebar-expand-icon',
      style: { fill: Colors().text2 },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.sidebar-expand:hover .sidebar-expand-icon',
      style: { fill: Colors().text1 },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.sidebar-link svg',
      style: { fill: Colors().iconColor, stroke: Colors().iconColor },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.sidebar-link .sidebar-link-inner-selected svg',
      style: { fill: Colors().active, stroke: Colors().active },
    });
    this.setState({
      linkOffset: this.props.expanded ? linkOffsetExpanded : linkOffsetCollapsed,
    });
  }

  public componentWillReceiveProps(nextProps)
  {
    if (nextProps.expanded !== this.props.expanded)
    {
      this.setState({
        linkOffset: nextProps.expanded ? linkOffsetExpanded : linkOffsetCollapsed,
      });
    }
  }

  public handleLinkDisabled(link)
  {
    return (e) =>
    {
      e.preventDefault();
      alert(`You have not set up ${link.text}`);
    };
  }

public render()
  {
    // console.log(this.props.users);
    return (
      <div
        className={classNames({
          'sidebar-container': true,
          'sidebar-container-expanded': this.props.expanded,
        })}
        style={backgroundColor(Colors().sidebarBg)}
      >
      {this.renderRootLevelModals()}
        {
          this.props.expanded ?
            <img
              src={TerrainIcon}
              className='sidebar-logo'
            />
            :
            <img src={TerrainSmallIcon}
              className='sidebar-logo-small'
            />
        }
        <AccountDropdown small={!this.props.expanded} />
        {
          // <div
          //        className={classNames({
          //          'sidebar-selected-square': true,
          //          'sidebar-selected-square-hidden': this.props.selectedIndex === -1,
          //        })}
          //        style={{
          //          top: (this.props.selectedIndex * linkHeight + this.state.linkOffset) + 'px',
          //          backgroundColor: Colors().active,
          //        }}
          //      />
        }
        <div className='sidebar-links'>
          {
            this.props.links.map((link, index) =>
              <Link
                to={link.route}
                key={index}
                onClick={link.enabled === false ? this.handleLinkDisabled(link) : null}
              >
                <div
                  className={Util.objToClassname({
                    'sidebar-link': true,
                    'xr': index === this.props.selectedIndex,
                  })}
                  key={'sidebar-link-' + index}
                >

                  {tooltip(<div
                    className={classNames({
                      'sidebar-link-inner': true,
                      'sidebar-link-inner-selected': index === this.props.selectedIndex,
                    })
                    }
                    style={getStyle('fill', index === this.props.selectedIndex ? Colors().active : Colors().text1)}
                  >
                    {
                      link.icon
                    }
                    <div
                      className={classNames({
                        'sidebar-link-text': true,
                        'sidebar-link-text-hidden': !this.props.expanded,
                      })}
                      style={fontColor(index === this.props.selectedIndex ? Colors().active : Colors().text1)}
                    >
                      {
                        link.text
                      }
                    </div>
                  </div>,
                    {
                      title: (!this.props.expanded ? link.text : ''),
                      position: 'right',
                    })}
                </div>
              </Link>,
            )
          }
        </div>

        {
          this.props.expandable ?
            (
              <div
                className='sidebar-expand' onClick={this.props.onExpand}
              // style={backgroundColor(Colors().bg1, Colors().inactiveHover)}
              >
                <div className='dead-center'>
                  <ExpandIcon
                    className='sidebar-expand-icon'
                    style={{
                      'fill': Colors().text2,
                      ':active': {
                        fill: Colors().active,
                      },
                    }}
                  />
                </div>
              </div>
            )
            : null
        }
        { this.props.expanded ?
       <div className='sidebar-button sidebar-bug-button'>
       <Button
       text='BUGS'
       onClick={this._toggle('reportBugModalOpen')}> </Button>
       </div>
       :
               <img
              src={BugSmallIcon} className='sidebar-button-collapsed sidebar-bug-button-collapsed'
          onClick={this._toggle('reportBugModalOpen')}
          key='reportImage'
            />
     }

{ this.props.expanded ?
  <div className='sidebar-button sidebar-feedback-button'>
       <Button
       text='FEEDBACK'
       onClick={this._toggle('reportFeedbackModalOpen')}
       > </Button>
       </div>

       :
       <img className='sidebar-button-collapsed sidebar-feedback-button-collapsed' src={FeedbackSmallIcon}
          onClick={this._toggle('reportFeedbackModalOpen')}
          key='feedbackImage'/>

     }

      </div>

    );
}

    public closeTemplateUI()
  {
    this.setState({
      reportBugModalOpen: false,
      reportFeedbackModalOpen: false,
    });
  }

}

export default Util.createContainer(
  Sidebar,
  ['users'],
  {
    colorsActions: ColorsActions,
  },
);
