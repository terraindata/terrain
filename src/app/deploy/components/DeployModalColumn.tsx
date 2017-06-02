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

import * as classNames from 'classnames';
import * as React from 'react';
import UserThumbnail from '../../users/components/UserThumbnail';
import Util from  '../../util/Util';
import PureClasss from './../../common/components/PureClasss';
import { ItemStatus } from '../../../../shared/items/types/Item';

import LibraryStore from '../../library/data/LibraryStore';
import LibraryTypes from '../../library/LibraryTypes';

const GroupIcon = require('./../../../images/icon_badgeGroup.svg');
const AlgorithmIcon = require('./../../../images/icon_badgeAlgorithm.svg');
const VariantIcon = require('./../../../images/icon_badgeVariant.svg');

const TEXT =
{
  live:
  {
    main: 'You are deploying the following variant to Live. Its TQL will be stored on production servers, and it will be accessible for production queries.',
    confirm: 'I approve of deploying this TQL to Live for this variant.',
    button: 'Deploy to Live',
  },

  default:
  {
    main: 'You are deploying the following variant to Live. Its TQL will be stored on production servers, it will be indexed, and it will be accessible for production queries.',
    confirm: 'I approve of deploying this TQL to Live for this variant, and making it the Default for this algorithm.',
    button: 'Deploy to Live and Make Default',
  },

  notLive:
  {
    main: 'You are removing the following variant from Live. Its TQL will be removed from production servers, and it will not be accessible for production queries.',
    confirm: 'I approve of removing this TQL from Live for this variant.',
    button: 'Remove from Live',
  },
};

export interface Props {
  variant: LibraryTypes.Variant;
  status: ItemStatus;
  defaultChecked: boolean;
  defaultVariant: LibraryTypes.Variant;
  onDefaultCheckedChange(defaultChecked: boolean);
  onDeploy();
}

class DeployModalColumn extends PureClasss<Props>
{
  state: {
    confirmChecked: boolean;
  } = {
    confirmChecked: false,
  };

  componentWillReceiveProps(nextProps: Props)
  {
    if (nextProps.variant !== this.props.variant || nextProps.status !== this.props.status)
    {
      this.setState({
        confirmChecked: false,
      });
    }
  }

  handleDefaultCheckedChange(c)
  {
    this.props.onDefaultCheckedChange(!this.props.defaultChecked);
    this.setState({
      confirmChecked: false,
    });
  }

  handleConfirmCheckedChange(c)
  {
    this.setState({
      confirmChecked: !this.state.confirmChecked,
    });
  }

  handleDeploy()
  {
    this.props.onDeploy();
  }

  render()
  {
    const {variant, status} = this.props;
    const state = LibraryStore.getState();
    const group = state.getIn(['groups', variant.groupId]) as LibraryTypes.Group;
    const algorithm = state.getIn(['algorithms', variant.algorithmId]) as LibraryTypes.Algorithm;

    // let title = 'Deploy "' + name + '" to Live';
    // if(changingStatusTo !== ItemStatus.Live)
    // {
    //   title = 'Remove "' + name + '" from Live';
    // }

    let text = status === ItemStatus.Live ? TEXT.live : TEXT.notLive;
    if (this.props.defaultChecked)
    {
      text = TEXT.default;
    }

    return (
      <div
        className="deploy-modal-deploy-column"
      >
        <div className="deploy-modal-message">
          {
            text.main
          }
        </div>
        <div className="deploy-modal-info">
          <div className="deploy-modal-info-row">
            <GroupIcon
              className="deploy-modal-info-icon"
            />
            <div className="deploy-modal-info-name">
              {
                group.name
              }
            </div>
          </div>
          <div className="deploy-modal-info-row">
            <AlgorithmIcon
              className="deploy-modal-info-icon"
            />
            <div className="deploy-modal-info-name">
              {
                algorithm.name
              }
            </div>
          </div>
          <div className="deploy-modal-info-row">
            <VariantIcon
              className="deploy-modal-info-icon"
            />
            <div className="deploy-modal-info-name">
              {
                variant.name
              }
            </div>
          </div>
          <div className="deploy-modal-info-row-lower">
            <span className="deploy-modal-info-bold">
              <UserThumbnail
                userId={variant.lastUserId}
                showName={true}
              />
            </span>
          </div>
          <div className="deploy-modal-info-row-lower">
            <span className="deploy-modal-info-bold">
              {
                Util.formatDate(variant.lastEdited)
              }
            </span>
          </div>
          <div className="deploy-modal-info-row-lower deploy-modal-info-status-row">
            <span>
              Current status:
            </span>
            <span className="deploy-modal-info-bold">
              {
                ItemStatus[variant.status]
              }
            </span>
          </div>
          <div className="deploy-modal-info-row-lower">
            <span>
              Changing to status:
            </span>
            <span className="deploy-modal-info-bold">
              {
                ItemStatus[status]
              }
            </span>
          </div>
        </div>
        {
          false && /* temp disable */
          status === ItemStatus.Live &&
            <div>
              <div
                className={classNames({
                  'deploy-modal-check-wrapper': true,
                  'deploy-modal-check-wrapper-checked': this.props.defaultChecked,
                })}
              >
                <input
                  type="checkbox"
                  checked={this.props.defaultChecked}
                  onChange={this.handleDefaultCheckedChange}
                  id="deploy-modal-default-check"
                />
                <label
                  htmlFor="deploy-modal-default-check"
                >
                  Make default for algorithm <b>{algorithm.name}</b>
                </label>
              </div>
              {
                this.props.defaultChecked &&
                  <div
                    className="info"
                  >
                    <b>{variant.name}</b> will be served for any requests to algorithm <b>{algorithm.name}.</b> &nbsp;
                    {
                      this.props.defaultVariant
                      ?
                        <span>
                          This will replace the current default variant <b>{this.props.defaultVariant.name}</b>,
                          which will remain Live.
                        </span>
                      :
                        <span>
                          There is not currently a default variant for algorithm <b>{algorithm.name}</b>.
                        </span>
                    }
                  </div>
              }
            </div>
        }
        <div
          className={classNames({
            'deploy-modal-check-wrapper': true,
            'deploy-modal-check-wrapper-checked': this.state.confirmChecked,
          })}
        >
          <input
            type="checkbox"
            checked={this.state.confirmChecked}
            onChange={this.handleConfirmCheckedChange}
            id="deploy-modal-confirm-check"
          />
          <label
            htmlFor="deploy-modal-confirm-check"
          >
            {
              text.confirm
            }
          </label>
        </div>

        <div
          className={classNames({
            'deploy-modal-button': true,
            'deploy-modal-button-lit': this.state.confirmChecked,
          })}
          onClick={this.handleDeploy}
        >
          {
            text.button
          }
        </div>
      </div>
    );
  }
}

export default DeployModalColumn;
