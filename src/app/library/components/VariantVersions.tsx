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

require('./VariantVersions.less');
const classNames = require('classnames');
import * as React from 'react';
import PureClasss from './../../common/components/PureClasss';
import LibraryTypes from './../LibraryTypes';
import UserThumbnail from './../../users/components/UserThumbnail';
import UserTypes from './../../users/UserTypes';
import UserStore from './../../users/data/UserStore';
import Ajax from './../../util/Ajax';
import Util from './../../util/Util';
// import * as moment from 'moment';
const moment = require('moment');
import RoleTypes from '../../roles/RoleTypes';
import RolesStore from '../../roles/data/RolesStore';
const {browserHistory} = require('react-router');

type Variant = LibraryTypes.Variant;
type User = UserTypes.User;
type UserMap = UserTypes.UserMap;


export interface Props
{
  variant: Variant;
}

class VariantVersions extends PureClasss<Props>
{
  state: {
    users: UserMap,
    versions: any,
    roles: RoleTypes.RoleMap,
  } = {
    users: null,
    versions: null,
    roles: null,
  };

  constructor(props:Props)
  {
    super(props);

    this._subscribe(UserStore,
    {
      stateKey: 'users',
      storeKeyPath: ['users'],
    });
    this._subscribe(RolesStore,
    {
      stateKey: 'roles',
    });
  }

  xhr: XMLHttpRequest = null;
  fetchVariants(props)
  {
    this.xhr = Ajax.getVariantVersions(props.variant.id, (versions) =>
    {
      if(versions)
      {
        versions.reverse();
        this.setState({
          versions: versions,
        })
      }
    });
  }

  componentWillMount()
  {
    this.fetchVariants(this.props);
  }

  componentWillUnmount()
  {
    this.xhr && this.xhr.abort();
    this.xhr = null;
  }

  componentWillReceiveProps(nextProps)
  {
    this.fetchVariants(nextProps);
  }

  showVersion(versionID, i)
  {
    var url = '/builder/?o=' + this.props.variant.id;
    if(i !== 0)
    {
      url += '@' + versionID;
    }
    browserHistory.push(url);
  }

  renderVersion(version, i)
  {
    let {roles} = this.state;
    let groupId = this.props.variant.groupId;
    var role = "Viewer";
    if (roles && roles.getIn([groupId, version.username]))
    {
      if (roles && roles.getIn([groupId, version.username]).admin)
      {
        role = "Admin";
      }
      else if (roles && roles.getIn([groupId, version.username]).builder)
      {
        role = "Builder";
      }
    }

    return (
      <div
        className={classNames({
          "versions-table-row": true,
          "versions-table-row-current": i === 0,
        })}
        key={version.id}
        onClick={
          this._fn(this.showVersion, version.id, i)
        }
      >
        <div className="versions-table-element">
          <UserThumbnail
            username={version.username}
            small={true}
            showName={true}
            extra={role}
          />
        </div>
        <div
          className="versions-table-element"
        >
          {
            Util.formatDate(version.createdAt)
          }
        </div>
      </div>
    );
  }

  render()
  {
    return(
      <div className="versions-table-wrapper">
        <div className="versions-table-title">
          Version History
        </div>
        <div className="versions-table-right-align">
          Current Version
        </div>
        {
          this.state.versions === null ?
            <div className='loading'>
              Loading...
            </div>
          :
            <div className="versions-table">
              {
                this.state.versions.map(this.renderVersion)
              }
            </div>
        }
      </div>
    );
  }
}

export default VariantVersions;
