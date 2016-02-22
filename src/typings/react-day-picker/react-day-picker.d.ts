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

// Type definitions for react-day-picker v1.2.0
// Project: https://github.com/gpbl/react-day-picker
// Definitions by: Giampaolo Bellavite <https://github.com/gpbl>, Jason Killian <https://github.com/jkillian>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

/// <reference path="../react/react.d.ts" />

declare module "react-day-picker" {
    import DayPicker = ReactDayPicker.DayPicker;
    export = DayPicker;
}

declare var DayPicker: typeof ReactDayPicker.DayPicker;

declare namespace ReactDayPicker {
    import React = __React;

    interface LocaleUtils {
        formatMonthTitle: (month: Date, locale: string) => string;
        formatWeekdayShort: (weekday: number, locale: string) => string;
        formatWeekdayLong: (weekday: number, locale: string) => string;
        getFirstDayOfWeek: (locale: string) => number;
        getMonths: (locale: string) => string[];
    }

    interface Modifiers {
        [name: string]: (date: Date) => boolean;
    }

    interface CaptionElementProps extends React.Props<any> {
        date?: Date;
        localeUtils?: LocaleUtils;
        locale?: string;
        onClick?: React.MouseEventHandler;
    }

    interface Props extends React.Props<DayPicker>{
        modifiers?: Modifiers;
        initialMonth?: Date;
        numberOfMonths?: number;
        renderDay?: (date: Date) => number | string | JSX.Element;
        enableOutsideDays?: boolean;
        canChangeMonth?: boolean;
        fromMonth?: Date;
        toMonth?: Date;
        localeUtils?: LocaleUtils;
        locale?: string;
        captionElement?: React.ReactElement<CaptionElementProps>;
        onDayClick?: (e: React.SyntheticEvent, day: Date, modifiers: string[]) => any;
        onDayTouchTap?: (e: React.SyntheticEvent, day: Date, modifiers: string[]) => any;
        onDayMouseEnter?: (e: React.SyntheticEvent, day: Date, modifiers: string[]) => any;
        onDayMouseLeave?: (e: React.SyntheticEvent, day: Date, modifiers: string[]) => any;
        onMonthChange?: (month: Date) => any;
        onCaptionClick?: (e: React.SyntheticEvent, month: Date) => any;
        className?: string;
        style?: React.CSSProperties;
        tabIndex?: number;
    }

    class DayPicker extends React.Component<Props, {}> {
        showMonth(month: Date): void;
        showPreviousMonth(): void;
        showNextMonth(): void;
    }

    namespace DayPicker {
        var LocaleUtils: LocaleUtils;
        namespace DateUtils {
            function addMonths(d: Date, n: number): Date;
            function clone(d: Date): Date;
            function isSameDay(d1?: Date, d2?: Date): boolean;
            function isPastDay(d: Date): boolean;
            function isDayBetween(day: Date, startDate: Date, endDate: Date): boolean;
            function addDayToRange(day: Date, range: { from?: Date, to?: Date }): { from?: Date, to?: Date };
            function isDayInRange(day: Date, range: { from?: Date, to?: Date }): boolean;
        }  
    }
}
