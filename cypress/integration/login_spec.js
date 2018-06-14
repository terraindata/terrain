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

/*describe('Terrain login', function() {
  it('should login into the app', function() {
    cy.visit('http://localhost:8080');

    cy.get('#login-email')
      .type('luser@terraindata.com')
      .should('have.value', 'luser@terraindata.com')

    cy.get('#login-password')
      .type('secret')
      .should('have.value', 'secret')


    cy.get('.login-submit-button').click()
  })
})*/

describe('Library Category re-sort', function() {
  it('should re-sort the dragged category to the dropped position', function() {
    cy.visit('http://localhost:8080');

    cy.get('#login-email')
      .type('luser@terraindata.com')
      .should('have.value', 'luser@terraindata.com')

    cy.get('#login-password')
      .type('secret')
      .should('have.value', 'secret')


    cy.get('.login-submit-button').click()

    cy.wait(3000)
    cy.get('a[href="/library/46"]').click({ force:true });
    cy.wait(500)

    const dt = {
      types: []
    }
    cy.get('#item-47')
      .trigger('dragstart', { dataTransfer: dt })
    cy.wait(500)

    cy.get('#item-56')
      .trigger('dragenter', { dataTransfer: dt })
    cy.wait(500)
    cy.get('#item-56')
      .trigger('dragover', { dataTransfer: dt })
    cy.wait(500)

    cy.get('#item-56')
      .trigger('drop')

    cy.get('#item-47')
      .trigger('dragend', { dataTransfer: dt })
  })
})

/*describe('Builder query', function() {
  it('should add cards to the builder query', function() {
    cy.visit('http://localhost:8080');

    cy.get('#login-email')
      .type('luser@terraindata.com')
      .should('have.value', 'luser@terraindata.com')

    cy.get('#login-password')
      .type('secret')
      .should('have.value', 'secret')


    cy.get('.login-submit-button').click()

    cy.get('a[href="/library/46"]').click({ force:true });
    cy.get('a[href="/library/46/47"]').click({ force:true });
    cy.get('a[href="/library/46/47/49"]').dblclick();
    cy.get('.info-area-button').click();
    cy.get('.cards-deck-knob-icon').click();
    cy.get('.cards-deck-card')[]

  })
})*/

