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

// tslint:disable:strict-boolean-expressions

import * as classNames from 'classnames';
import { tooltip } from 'common/components/tooltip/Tooltips';
import * as React from 'react';
import { Link } from 'react-router';
import Util from 'util/Util';
import { Colors, fontColor } from '../../colors/Colors';
import TerrainComponent from './../../common/components/TerrainComponent';
import * as UserTypes from './../UserTypes';
import './UserThumbnail.less';

type User = UserTypes.User;

export interface Props
{
  userId: ID;
  showName?: boolean;
  largest?: boolean;
  large?: boolean;
  medium?: boolean;
  small?: boolean;
  smallest?: boolean;
  square?: boolean;
  hideAdmin?: boolean;
  link?: boolean;
  extra?: string;
  users?: UserTypes.UserState;
}

class UserThumbnail extends TerrainComponent<Props>
{
  public shouldComponentUpdate(nextProps)
  {
    return nextProps.users !== this.props.users;
  }

  public render()
  {
    const { userId, users } = this.props;
    const user = users.users !== undefined ? users.users.get(userId) : undefined;
    const name: string = user ? (user.name !== undefined && user.name.length > 0 ? user.name : user.email) : 'Loading...';
    const src: string = UserTypes.profileUrlFor(user);
    const tip = this.props.showName ?
      null
      :
      (
        typeof this.props.userId === 'string' ?
          <span> {this.props.userId} </span>
          :
          <span>
            <div className='user-thumbnail-tip-name'> {name} </div>
            <div className='user-thumbnail-tip-details'> {this.props.extra} </div>
          </span>
      );

    const text: string = this.props.showName ? name : null;
    const thumbnail = tooltip(
      <div
        className={classNames({
          'user-thumbnail': true,
          'user-thumbnail-largest': this.props.largest,
          'user-thumbnail-large': this.props.large,
          'user-thumbnail-medium': this.props.medium,
          'user-thumbnail-small': this.props.small,
          'user-thumbnail-smallest': this.props.smallest,
          'user-thumbnail-square': this.props.square,
          'user-thumbnail-admin': user && user.isSuperUser && !this.props.hideAdmin,
        })}
      >
        <div
          className='user-thumbnail-image'
          style={{
            backgroundImage: `url(${src})`,
          }}
        />
        {
          text &&
          <div
            className='user-thumbnail-text'
            style={fontColor(Colors().text1)}
          >
            {
              text
            }
          </div>
        }
      </div>,
      {
        html: tip,
        position: 'left',
      },
    );
    if (this.props.link && user)
    {
      return (
        <Link to={`/users/${user.id}`}>
          {thumbnail}
        </Link>
      );
    }
    return thumbnail;
  }
}

export default Util.createTypedContainer(
  UserThumbnail,
  ['users'],
  {},
);
