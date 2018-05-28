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

import aesjs = require('aes-js');
import sha1 = require('sha1');

import { EncryptionController, Keys, registerEncryptionController } from 'shared/encryption/Encryption';

class MidwayEncryptionController implements EncryptionController
{
  private keymap: { [k in Keys]: string };

  constructor()
  {
    const integrationKey = sha1(
      '0VAtqVlzusw8nqA8TMoSfGHR3ik3dB-c9t4-gKUjD5iRbsWQWRzeL-6mBtRGWV4M' +
      '2A7ZZryVT7-NZjTvzuY7qhjrZdJTv4iGPmcbta-3iLkgfEzY3QufFvm14dqtzfsC' +
      'XhboiOC23idadrMNGlQwyJ783XlGwLBxDeGI01olmhg0oiNCeoGc_4zDrHq3wcgc' +
      'wQ_mpZYAj9mJsv_OI_yDiN83Y_gDQCTzA9u3NdmmxquD2jSrR2fSKRokspxqBjb5',
    ).substring(0, 16);
    const transformationKey = sha1(
      '4Qp7avGH3fsAebV18JOKAWEhQzuex8ipDJskxLx6AorB7CZKJCPij0EfqaTUooG9' +
      '8g2Bu8np-QqhcWWY10-HT8vkwm3zTyI8kgfnpCbEPKYIUpNo3DQrkm1JNbRjcfhB' +
      '2kyW04QZOf6U10rzjMz5CcdxELkv1GgbW-rzl8OHC9P3kpnq1t0XSThNug9hFiZs' +
      'sKvESwKzrW58TrMlMf9rqoOn076Y8BAKCOJsg7NXnNyjKqDIdk0aU0v9musILc_g',
    ).substring(0, 16);
    this.keymap = {
      [Keys.Integrations]: aesjs.utils.utf8.toBytes(integrationKey),
      [Keys.Transformations]: aesjs.utils.utf8.toBytes(transformationKey),
    };
  }

  public encryptStatic(msg: string, namedKey: Keys): string
  {
    const key = this.keymap[namedKey];
    if (key === undefined)
    {
      throw new Error('Could not find key in keymap');
    }
    const msgBytes: any = aesjs.utils.utf8.toBytes(msg);
    const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
    return aesjs.utils.hex.fromBytes(aesCtr.encrypt(msgBytes));
  }

  public decryptStatic(msg: string, namedKey: Keys): string
  {
    const key = this.keymap[namedKey];
    if (key === undefined)
    {
      throw new Error('Could not find key in keymap');
    }
    const msgBytes: any = aesjs.utils.hex.toBytes(msg);
    const aesCtr: any = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
    return aesjs.utils.utf8.fromBytes(aesCtr.decrypt(msgBytes));
  }
}

export function registerMidwayEncryption()
{
  const controller = new MidwayEncryptionController();
  registerEncryptionController(controller);
}
