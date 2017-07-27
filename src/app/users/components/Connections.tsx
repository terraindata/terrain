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

// tslint:disable:strict-boolean-expressions no-unused-expression

import { List } from 'immutable';
import * as React from 'react';
import { Link } from 'react-router';

import BackendInstance from '../../../database/types/BackendInstance';
import AuthStore from '../../auth/data/AuthStore';
import CreateItem from '../../common/components/CreateItem';
import InfoArea from '../../common/components/InfoArea';
import Modal from '../../common/components/Modal';
import TerrainComponent from '../../common/components/TerrainComponent';
import SchemaActionTypes from '../../schema/data/SchemaActionTypes';
import { SchemaActions, SchemaStore } from '../../schema/data/SchemaStore';
import * as SchemaTypes from '../../schema/SchemaTypes';
import Ajax from '../../util/Ajax';
import './Connections.less';

interface Server extends BackendInstance
{
  host: string;
  status: string;
}

export interface Props
{
  params?: any;
  history?: any;
  children?: any;
}

class Connections extends TerrainComponent<Props>
{
  public state: {
    loading: boolean,
    servers: Server[],
    addingUser: boolean,
    errorModalOpen: boolean,
    errorModalMessage: string,
  } = {
    servers: null,
    loading: true,
    addingUser: false,
    errorModalOpen: false,
    errorModalMessage: '',
  };

  public xhr: XMLHttpRequest = null;

  constructor(props)
  {
    super(props);
  }

  public fetchConnections(props)
  {
    this.xhr = Ajax.req(
      'get',
      'database',
      {},
      (servers: Server[]) =>
      {
        if (servers)
        {
          this.setState({
            servers,
          });
        }
      });
  }

  public componentWillMount()
  {
    this.fetchConnections(this.props);
  }

  public componentWillUnmount()
  {
    this.xhr && this.xhr.abort();
    this.xhr = null;
  }

  public componentWillReceiveProps(nextProps)
  {
    this.fetchConnections(nextProps);
  }

  public updateState()
  {
    this.setState({
      servers: SchemaStore.getState().get('servers'),
      loading: SchemaStore.getState().get('loading'),
    });
  }

  public renderServer(server: Server)
  {
    return (
      <Link to={`/connections/${server.id}`} className='connections-link' key={server.id}>
        <div className='connections-row'>
          <div className='connections-item-names'>
            <div className='connections-id'>
              {
                server.id
              }
            </div>
            <div className='connections-name'>
              {
                server.name
              }
            </div>
          </div>
          <div className='connections-item-info'>
            {
              <div className='connections-item-info-row'>
                <div className='team-item-info-label'>
                  Type
                </div>
                <div className='connections-item-info-value'>
                  {
                    server.type
                  }
                </div>
              </div>
            }
            {
              <div className='connections-item-info-row'>
                <div className='team-item-info-label'>
                  Host
                </div>
                <div className='connections-item-info-value'>
                  {
                    server.host
                  }
                </div>
              </div>
            }
            {
              <div className='connections-item-info-row'>
                <div className='team-item-info-label'>
                  Status
                </div>
                <div className='connections-item-info-value'>
                  {
                    server.status
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </Link>
    );
  }

  // public toggleAddingUser()
  // {
  //   this.setState({
  //     addingUser: !this.state.addingUser,
  //   });
  // }

  // public createNewUser()
  // {
  //   const email: string = this.refs['newEmail']['value'];
  //   const password: string = this.refs['newPassword']['value'];
  //   const confirmPassword: string = this.refs['confirmPassword']['value'];

  //   const emailCheck = email.length >= 5 && email.indexOf('@') > 0;
  //   if (!emailCheck)
  //   {
  //     this.setState({
  //       errorModalMessage: 'Not a valid email address.',
  //     });
  //     this.toggleErrorModal();
  //     return;
  //   }

  //   if (password.length < 6)
  //   {
  //     this.setState({
  //       errorModalMessage: 'Passwords should be at least six characters long',
  //     });
  //     this.toggleErrorModal();
  //     return;
  //   }

  //   if (password !== confirmPassword)
  //   {
  //     this.setState({
  //       errorModalMessage: 'Passwords do not match',
  //     });
  //     this.toggleErrorModal();
  //     return;
  //   }

  //   this.refs['newEmail']['value'] = '';
  //   this.refs['newPassword']['value'] = '';
  //   this.refs['confirmPassword']['value'] = '';
  //   this.setState({
  //     addingUser: false,
  //   });

  //   Ajax.createUser(email, password, () =>
  //   {
  //     Actions.fetch();
  //   }, (error) =>
  //     {
  //       this.setState({
  //         errorModalMessage: 'Error creating user: ' + JSON.stringify(error),
  //       });
  //       this.toggleErrorModal();
  //     });
  // }

  // public renderAddUser()
  // {
  //   const userId = AuthStore.getState().id;
  //   const user = Store.getState().getIn(['users', userId]) as User;

  //   if (user && user.isSuperUser)
  //   {
  //     if (this.state.addingUser)
  //     {
  //       return (
  //         <div className='create-user'>
  //           <div className='create-user-cancel' onClick={this.toggleAddingUser} data-tip='Cancel'>
  //             x
  //           </div>
  //           <h3>Create a new user</h3>

  //           <div className='flex-container'>
  //             <div className='flex-grow'>
  //               <b>Email</b>
  //               <div>
  //                 <input ref='newEmail' placeholder='Email' />
  //               </div>
  //             </div>
  //             <div className='flex-grow'>
  //               <b>Temporary Password</b>
  //               <div>
  //                 <input ref='newPassword' placeholder='Password' type='password' />
  //               </div>
  //             </div>
  //             <div className='flex-grow'>
  //               <b>Confirm Password</b>
  //               <div>
  //                 <input ref='confirmPassword' placeholder='Confirm password' type='password' />
  //               </div>
  //             </div>
  //           </div>
  //           <div className='button' onClick={this.createNewUser}>
  //             Create
  //           </div>
  //         </div>
  //       );
  //     }

  //     return (
  //       <CreateItem
  //         name='New User'
  //         onCreate={this.toggleAddingUser}
  //       />
  //     );
  //   }
  //   return null;
  // }

  public toggleErrorModal()
  {
    this.setState({
      errorModalOpen: !this.state.errorModalOpen,
    });
  }

  public render()
  {
    const { servers, loading } = this.state;

    return (
      <div>
        <div className='connections'>
          <div className='connections-page-title'>
            Database Connections
        </div>
          {
            loading &&
            <InfoArea large='Loading...' />
          }
          {servers && servers.map(this.renderServer)}
          {/* {this.renderAddUser()} */}
        </div>
        <Modal
          message={this.state.errorModalMessage}
          onClose={this.toggleErrorModal}
          open={this.state.errorModalOpen}
          error={true}
        />
      </div>
    );
  }
}

export default Connections;
