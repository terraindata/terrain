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

require('./UserThumbnail.less');
import * as React from 'react';
import Classs from './../../common/components/Classs.tsx';
import { Link } from 'react-router';
import * as classNames from 'classnames';
import UserTypes from './../UserTypes.tsx';
import UserStore from './../data/UserStore.tsx';
import ColorManager from './../../util/ColorManager.tsx';

type User = UserTypes.User;

interface Props
{
  username: string;
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
}

class UserThumbnail extends Classs<Props>
{
  state: { user: User } = {
    user: null,
  }
  unsubscribe = null;
  
  constructor(props:Props)
  {
    super(props);
  }
  
  componentDidMount()
  {
    this._subscribe(UserStore, {
      stateKey: 'user',
      storeKeyPath: this.getStoreKeyPath(),
      isMounted: true,
    });
  }
  
  getStoreKeyPath()
  {
    return ['users', this.props.username];
  }
  
  componentWillReceiveProps(nextProps)
  {
    if(nextProps.username !== this.props.username)
    {
      this._update(UserStore, {
        stateKey: 'user',
        storeKeyPath: this.getStoreKeyPath(),
      });
    }  
  }
  
  shouldComponentUpdate(nextProps, nextState)
  {
    return nextState.user !== this.state.user;
  }
  
  render()
  {
    let { user } = this.state;
    let name: string = user ? user.name() : 'Loading...';
    let src: string = UserTypes.profileUrlFor(user);
    let tip = this.props.showName ? null : 
      '<div class="user-thumbnail-tip-name">' + name + '</div>' +
      '<div class="user-thumbnail-tip-details">' + this.props.extra + '</div>';
    let text: string = this.props.showName ? name : null;
    let thumbnail = (
      <div
        className={classNames({
          'user-thumbnail': true,
          'user-thumbnail-largest': this.props.largest,
          'user-thumbnail-large': this.props.large,
          'user-thumbnail-medium': this.props.medium,
          'user-thumbnail-small': this.props.small,
          'user-thumbnail-smallest': this.props.smallest,
          'user-thumbnail-square': this.props.square,
          'user-thumbnail-admin': user && user.isAdmin && !this.props.hideAdmin,
        })}
        data-tip={tip} 
        data-html={true}
      >
        <div
          className='user-thumbnail-image'
          style={{
            backgroundImage: `url(${src})`,
          }}
        />
        { 
          text &&
            <div className='user-thumbnail-text'>
              {
                text
              }
            </div>
        }
      </div>
    );
    
    if(this.props.link && user)
    {
      return (
        <Link to={`/users/${user.username}`}>
          { thumbnail }
        </Link>
      );
    }
    
    return thumbnail;
  }
}

export default UserThumbnail;
