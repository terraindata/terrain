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
import * as React from 'react';
import { browserHistory } from 'react-router';
import { IndexRoute, Route, Router } from 'react-router';

import App from './App';
import Builder from './builder/components/Builder';
import Logout from './common/components/Logout';
import Placeholder from './common/components/Placeholder';
import Redirect from './common/components/Redirect';
import TerrainComponent from './common/components/TerrainComponent';
import ControlPage from './control/components/ControlPage';
// import ETLExportDisplay from './etl/components/ETLExportDisplay';
import ETLImportPage from './etl/components/ETLImportPage';
import ETLPage from './etl/components/ETLPage';
import TemplateEditorDisplay from './etl/components/TemplateEditorDisplay';
import FileImport from './fileImport/components/FileImport';
import Library from './library/components/LibraryDnd';
import ManualWrapper from './manual/components/ManualWrapper';
import SchemaPage from './schema/components/SchemaPage';
import Account from './users/components/Account';
import Connections from './users/components/Connections';
import EditProfile from './users/components/EditProfile';
import Notifications from './users/components/Notifications';
import Profile from './users/components/Profile';
import Settings from './users/components/Settings';
import Team from './users/components/Team';
import X from './x/components/X';

class AppRouter extends TerrainComponent<{}> {
  public render()
  {
    const libraryLibrary = (props) => <Library basePath={'library'} {...props} />;
    const analyticsLibrary = (props) => (<Library
      basePath={'analytics'}
      canPinAlgorithms={true}
      singleColumn={true}
      {...props}
    />);

    return (
      <Router history={browserHistory}>
        <Route path='/' component={App}>
          <IndexRoute component={Redirect} />

          <Route path='/builder' component={Builder} />
          <Route path='/builder/:config' component={Builder} />
          <Route path='/builder/:config/:splitConfig' component={Builder} />

          <Route path='/library'>
            <IndexRoute component={libraryLibrary} />
            <Route path=':categoryId' component={libraryLibrary}>
              <IndexRoute component={libraryLibrary} />
              <Route path=':groupId' component={libraryLibrary}>
                <IndexRoute component={libraryLibrary} />
                <Route path=':algorithmId' component={libraryLibrary}>
                  <IndexRoute component={libraryLibrary} />
                </Route>
              </Route>
            </Route>
          </Route>

          <Route path='/account' component={Account}>
            <IndexRoute component={Profile} />
            <Route path='/account/profile' component={Profile} />
            <Route path='/account/profile/edit' component={EditProfile} />
            <Route path='/account/settings' component={Settings} />
            <Route path='/account/notifications' component={Notifications} />
            <Route path='/account/connections' component={Connections} />
            <Route path='/account/team' component={Team} />
          </Route>

          <Route path='/manual' component={ManualWrapper} />
          <Route path='/manual/:term' component={ManualWrapper} />

          <Route path='/users/:userId' component={Profile} />

          <Route path='/reporting' component={Placeholder} />

          <Route path='/logout' component={Logout} />

          <Route path='/x' component={X} />
          <Route path='/x/:x' component={X} />

          <Route path='/browser' component={Redirect} />
          <Route path='/browser/:a' component={Redirect} />
          <Route path='/browser/:a/:b' component={Redirect} />
          <Route path='/browser/:a/:b/:c' component={Redirect} />

          <Route path='/schema' component={SchemaPage} />

          <Route path='/control' component={ControlPage} />

          <Route path='/import' component={FileImport /*TODO get rid of this once ETL is merged*/} />
          <Route path='/etl' component={ETLPage}>
            <Route path='/etl/import' component={ETLImportPage} />
            {/*<Route path='/etl/export' component={ETLExportPage} />*/}
            {/*<Route path='/etl/export/edit/algId=:algorithmId' component={ETLExportDisplay} />*/}
            <Route path='/etl/edit/algorithmId=:algorithmId' component={TemplateEditorDisplay} />
            {/*<Route path='/etl/edit/templateId=:templateId' component={TemplateEditorDisplay} />*/}
          </Route>
          <Route path='/analytics'>
            <IndexRoute component={analyticsLibrary} />
            <Route path=':categoryId' component={analyticsLibrary}>
              <IndexRoute component={analyticsLibrary} />
              <Route path=':groupId' component={analyticsLibrary}>
                <IndexRoute component={analyticsLibrary} />
                <Route path=':algorithmId' component={analyticsLibrary}>
                  <IndexRoute component={analyticsLibrary} />
                </Route>
              </Route>
            </Route>
          </Route>
        </Route>
      </Router>
    );
  }
}

export default AppRouter;
