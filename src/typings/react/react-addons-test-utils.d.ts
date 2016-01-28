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

// Type definitions for React v0.14 (react-addons-test-utils)
// Project: http://facebook.github.io/react/
// Definitions by: Asana <https://asana.com>, AssureSign <http://www.assuresign.com>, Microsoft <https://microsoft.com>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

/// <reference path="react.d.ts" />

declare namespace __React {
    interface SyntheticEventData {
        altKey?: boolean;
        button?: number;
        buttons?: number;
        clientX?: number;
        clientY?: number;
        changedTouches?: TouchList;
        charCode?: boolean;
        clipboardData?: DataTransfer;
        ctrlKey?: boolean;
        deltaMode?: number;
        deltaX?: number;
        deltaY?: number;
        deltaZ?: number;
        detail?: number;
        getModifierState?(key: string): boolean;
        key?: string;
        keyCode?: number;
        locale?: string;
        location?: number;
        metaKey?: boolean;
        pageX?: number;
        pageY?: number;
        relatedTarget?: EventTarget;
        repeat?: boolean;
        screenX?: number;
        screenY?: number;
        shiftKey?: boolean;
        targetTouches?: TouchList;
        touches?: TouchList;
        view?: AbstractView;
        which?: number;
    }

    interface EventSimulator {
        (element: Element, eventData?: SyntheticEventData): void;
        (component: Component<any, any>, eventData?: SyntheticEventData): void;
    }

    interface MockedComponentClass {
        new(): any;
    }

    class ShallowRenderer {
        getRenderOutput<E extends ReactElement<any>>(): E;
        getRenderOutput(): ReactElement<any>;
        render(element: ReactElement<any>, context?: any): void;
        unmount(): void;
    }

    namespace __Addons {
        namespace TestUtils {
            namespace Simulate {
                export var blur: EventSimulator;
                export var change: EventSimulator;
                export var click: EventSimulator;
                export var cut: EventSimulator;
                export var doubleClick: EventSimulator;
                export var drag: EventSimulator;
                export var dragEnd: EventSimulator;
                export var dragEnter: EventSimulator;
                export var dragExit: EventSimulator;
                export var dragLeave: EventSimulator;
                export var dragOver: EventSimulator;
                export var dragStart: EventSimulator;
                export var drop: EventSimulator;
                export var focus: EventSimulator;
                export var input: EventSimulator;
                export var keyDown: EventSimulator;
                export var keyPress: EventSimulator;
                export var keyUp: EventSimulator;
                export var mouseDown: EventSimulator;
                export var mouseEnter: EventSimulator;
                export var mouseLeave: EventSimulator;
                export var mouseMove: EventSimulator;
                export var mouseOut: EventSimulator;
                export var mouseOver: EventSimulator;
                export var mouseUp: EventSimulator;
                export var paste: EventSimulator;
                export var scroll: EventSimulator;
                export var submit: EventSimulator;
                export var touchCancel: EventSimulator;
                export var touchEnd: EventSimulator;
                export var touchMove: EventSimulator;
                export var touchStart: EventSimulator;
                export var wheel: EventSimulator;
            }

            export function renderIntoDocument(
                element: DOMElement<any>): Element;
            export function renderIntoDocument<P>(
                element: ReactElement<P>): Component<P, any>;
            export function renderIntoDocument<C extends Component<any, any>>(
                element: ReactElement<any>): C;

            export function mockComponent(
                mocked: MockedComponentClass, mockTagName?: string): typeof TestUtils;

            export function isElementOfType(
                element: ReactElement<any>, type: ReactType): boolean;
            export function isDOMComponent(instance: ReactInstance): boolean;
            export function isCompositeComponent(instance: ReactInstance): boolean;
            export function isCompositeComponentWithType(
                instance: ReactInstance,
                type: ComponentClass<any>): boolean;

            export function findAllInRenderedTree(
                root: Component<any, any>,
                fn: (i: ReactInstance) => boolean): ReactInstance[];

            export function scryRenderedDOMComponentsWithClass(
                root: Component<any, any>,
                className: string): Element[];
            export function findRenderedDOMComponentWithClass(
                root: Component<any, any>,
                className: string): Element;

            export function scryRenderedDOMComponentsWithTag(
                root: Component<any, any>,
                tagName: string): Element[];
            export function findRenderedDOMComponentWithTag(
                root: Component<any, any>,
                tagName: string): Element;

            export function scryRenderedComponentsWithType<P>(
                root: Component<any, any>,
                type: ComponentClass<P>): Component<P, {}>[];
            export function scryRenderedComponentsWithType<C extends Component<any, any>>(
                root: Component<any, any>,
                type: ComponentClass<any>): C[];

            export function findRenderedComponentWithType<P>(
                root: Component<any, any>,
                type: ComponentClass<P>): Component<P, {}>;
            export function findRenderedComponentWithType<C extends Component<any, any>>(
                root: Component<any, any>,
                type: ComponentClass<any>): C;

            export function createRenderer(): ShallowRenderer;
        }
    }
}

declare module "react-addons-test-utils" {
    import TestUtils = __React.__Addons.TestUtils;
    export = TestUtils;
}
