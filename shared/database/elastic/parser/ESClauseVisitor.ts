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

import ESAnyClause from './clauses/ESAnyClause';
import ESArrayClause from './clauses/ESArrayClause';
import ESBaseClause from './clauses/ESBaseClause';
import ESBooleanClause from './clauses/ESBooleanClause';
import ESClause from './clauses/ESClause';
import ESEnumClause from './clauses/ESEnumClause';
import ESFieldClause from './clauses/ESFieldClause';
import ESIndexClause from './clauses/ESIndexClause';
import ESMapClause from './clauses/ESMapClause';
import ESNullClause from './clauses/ESNullClause';
import ESNumberClause from './clauses/ESNumberClause';
import ESObjectClause from './clauses/ESObjectClause';
import ESPropertyClause from './clauses/ESPropertyClause';
import ESReferenceClause from './clauses/ESReferenceClause';
import ESScriptClause from './clauses/ESScriptClause';
import ESStringClause from './clauses/ESStringClause';
import ESStructureClause from './clauses/ESStructureClause';
import ESTypeClause from './clauses/ESTypeClause';
import ESVariantClause from './clauses/ESVariantClause';
import ESWildcardStructureClause from './clauses/ESWildcardStructureClause';
/**
 * A visitor for visiting ESClause objects
 */
abstract class ESClauseVisitor<ReturnType>
{
  public abstract visitESClause(clause: ESClause): ReturnType;

  public visitESAnyClause(clause: ESAnyClause): ReturnType { return this.visitESClause(clause); }

  public visitESArrayClause(clause: ESArrayClause): ReturnType { return this.visitESClause(clause); }

  public visitESBaseClause(clause: ESBaseClause): ReturnType { return this.visitESClause(clause); }

  public visitESBooleanClause(clause: ESBooleanClause): ReturnType { return this.visitESClause(clause); }

  public visitESEnumClause(clause: ESEnumClause): ReturnType { return this.visitESClause(clause); }

  public visitESFieldClause(clause: ESFieldClause): ReturnType { return this.visitESClause(clause); }

  public visitESIndexClause(clause: ESIndexClause): ReturnType { return this.visitESClause(clause); }

  public visitESMapClause(clause: ESMapClause): ReturnType { return this.visitESClause(clause); }

  public visitESNullClause(clause: ESNullClause): ReturnType { return this.visitESClause(clause); }

  public visitESNumberClause(clause: ESNumberClause): ReturnType { return this.visitESClause(clause); }

  public visitESObjectClause(clause: ESObjectClause): ReturnType { return this.visitESClause(clause); }

  public visitESPropertyClause(clause: ESPropertyClause): ReturnType { return this.visitESClause(clause); }

  public visitESReferenceClause(clause: ESReferenceClause): ReturnType { return this.visitESClause(clause); }

  public visitESScriptClause(clause: ESScriptClause): ReturnType { return this.visitESClause(clause); }

  public visitESStringClause(clause: ESStringClause): ReturnType { return this.visitESClause(clause); }

  public visitESStructureClause(clause: ESStructureClause): ReturnType { return this.visitESClause(clause); }

  public visitESTypeClause(clause: ESTypeClause): ReturnType { return this.visitESClause(clause); }

  public visitESVariantClause(clause: ESVariantClause): ReturnType { return this.visitESClause(clause); }

  public visitESWildcardStructureClause(clause: ESWildcardStructureClause): ReturnType { return this.visitESClause(clause); }
}

export default ESClauseVisitor;
