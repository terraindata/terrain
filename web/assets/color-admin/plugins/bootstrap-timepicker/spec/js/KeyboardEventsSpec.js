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

describe('Keyboard events feature', function() {
  'use strict';

  var $input1,
    $input2,
    $input3,
    $timepicker1,
    $timepicker2,
    $timepicker3,
    tp1,
    tp2,
    tp3;

  beforeEach(function () {
    loadFixtures('timepicker.html');

    $input1 = $('#timepicker1');
    $timepicker1 = $input1.timepicker();
    tp1 = $timepicker1.data('timepicker');

    $input2 = $('#timepicker2');
    $timepicker2 = $input2.timepicker({
      template: 'modal',
      showSeconds: true,
      minuteStep: 30,
      secondStep: 30,
      defaultTime: false
    });
    tp2 = $timepicker2.data('timepicker');

    $input3 = $('#timepicker3');
    $timepicker3 = $input3.timepicker({
      defaultTime: '23:15:20',
      showMeridian: false,
      showSeconds: true,
      template: false
    });
    tp3 = $timepicker3.data('timepicker');
  });

  afterEach(function () {
    $input1.data('timepicker').remove();
    $input2.data('timepicker').remove();
    $input3.data('timepicker').remove();
    $input1.remove();
    $input2.remove();
    $input3.remove();
  });

  it('should be able to control element by the arrow keys', function() {
    tp1.setTime('11:30 AM');
    tp1.update();

    $input1.trigger('focus');

    if (tp1.highlightedUnit !== 'hour') {
      tp1.highlightHour();
    }

    expect(tp1.highlightedUnit).toBe('hour', 'hour should be highlighted by default');
    // hours
    $input1.trigger({
      'type': 'keydown',
      'keyCode': 38 //up
    });
    expect(tp1.getTime()).toBe('12:30 PM', '1');
    $input1.trigger({
      'type': 'keydown',
      'keyCode': 40 //down
    });
    expect(tp1.getTime()).toBe('11:30 AM', '2');
    expect(tp1.highlightedUnit).toBe('hour', 'hour should be highlighted');

    $input1.trigger({
      'type': 'keydown',
      'keyCode': 39 //right
    });
    expect(tp1.highlightedUnit).toBe('minute', 'minute should be highlighted');

    //minutes
    $input1.trigger({
      'type': 'keydown',
      'keyCode': 38 //up
    });
    expect(tp1.getTime()).toBe('11:45 AM', '3');
    expect(tp1.highlightedUnit).toBe('minute', 'minute should be highlighted 1');

    $input1.trigger({
      'type': 'keydown',
      'keyCode': 40 //down
    });
    expect(tp1.getTime()).toBe('11:30 AM', '4');
    expect(tp1.highlightedUnit).toBe('minute', 'minute should be highlighted 2');

    $input1.trigger({
      'type': 'keydown',
      'keyCode': 39 //right
    });
    expect(tp1.highlightedUnit).toBe('meridian', 'meridian should be highlighted');

    //meridian
    $input1.trigger({
      'type': 'keydown',
      'keyCode': 38 //up
    });
    expect(tp1.getTime()).toBe('11:30 PM', '5');
    expect(tp1.highlightedUnit).toBe('meridian', 'meridian should be highlighted');

    $input1.trigger({
      'type': 'keydown',
      'keyCode': 40 //down
    });
    expect(tp1.getTime()).toBe('11:30 AM', '6');
    expect(tp1.highlightedUnit).toBe('meridian', 'meridian should be highlighted');

    $input1.trigger({
      'type': 'keydown',
      'keyCode': 37 //left
    });
    expect(tp1.highlightedUnit).toBe('minute', 'minutes should be highlighted');

    // minutes
    $input1.trigger({
      'type': 'keydown',
      'keyCode': 40 //down
    });
    expect(tp1.getTime()).toBe('11:15 AM', '7');

    $input1.trigger({
      'type': 'keydown',
      'keyCode': 37 //left
    });
    expect(tp1.highlightedUnit).toBe('hour', 'hours should be highlighted');

    // hours
    $input1.trigger({
      'type': 'keydown',
      'keyCode': 40 //down
    });
    expect(tp1.getTime()).toBe('10:15 AM', '8');

    $input1.trigger({
      'type': 'keydown',
      'keyCode': 37 //left
    });
    expect(tp1.highlightedUnit).toBe('meridian', 'meridian should be highlighted');

    // meridian
    $input1.trigger({
      'type': 'keydown',
      'keyCode': 40 //down
    });
    expect(tp1.getTime()).toBe('10:15 PM', '9');
  });

  it('should be able to change time via widget inputs in a dropdown', function() {
    var $hourInput = tp1.$widget.find('input.bootstrap-timepicker-hour'),
        $minuteInput = tp1.$widget.find('input.bootstrap-timepicker-minute'),
        $meridianInput = tp1.$widget.find('input.bootstrap-timepicker-meridian'),
        eventCount = 0,
        time;


    tp1.setTime('9:30 AM');
    tp1.update();
    $input1.parents('div').find('.add-on').click();

    $input1.timepicker().on('changeTime.timepicker', function(e) {
      eventCount++;
      time = e.time.value;
    });

    expect(tp1.isOpen).toBe(true);

    $hourInput.trigger('focus');
    $hourInput.autotype('{{back}}{{back}}11{{tab}}');

    expect(tp1.hour).toBe(11);
    expect(eventCount).toBe(1, 'incorrect update events thrown');
    expect(time).toBe('11:30 AM');

    $minuteInput.autotype('{{back}}{{back}}45{{tab}}');

    expect(tp1.minute).toBe(45);
    expect(eventCount).toBe(2, 'incorrect update events thrown');
    expect(time).toBe('11:45 AM');

    $meridianInput.autotype('{{back}}{{back}}pm{{tab}}');

    expect(tp1.meridian).toBe('PM');
    expect(eventCount).toBe(3, 'incorrect update events thrown');
    expect(time).toBe('11:45 PM');
  });

  it('should still be empty if input is empty', function() {
		$input1.autotype('{{back}}{{back}}{{back}}{{back}}{{back}}{{back}}{{back}}{{back}}{{tab}}');

		expect($input1.val()).toBe('');
	});
  it('should allow time to be changed via widget inputs in a modal', function() {
    //tp2.setTime('9:30 AM');
    //tp2.update();
    //$input2.parents('div').find('.add-on').click();

    //var $hourInput = $('body').find('input.bootstrap-timepicker-hour'),
        //$minuteInput = $('body').find('input.bootstrap-timepicker-minute'),
        //$secondInput = $('body').find('input.bootstrap-timepicker-second'),
        //$meridianInput = $('body').find('input.bootstrap-timepicker-meridian');

    //$hourInput.autotype('{{back}}{{back}}2');
    //$hourInput.trigger({
      //'type': 'keydown',
      //'keyCode': 9 //tab
    //});

    //expect(tp2.getTime()).toBe('02:30:00 AM');


    //$minuteInput.autotype('{{back}}{{back}}0');
    //$minuteInput.trigger({
      //'type': 'keydown',
      //'keyCode': 9 //tab
    //});

    //expect(tp2.getTime()).toBe('02:00:00 AM');

    //$secondInput.autotype('{{back}}{{back}}30');
    //$secondInput.trigger({
      //'type': 'keydown',
      //'keyCode': 9 //tab
    //});

    //expect(tp2.getTime()).toBe('02:00:30 AM');

    //$meridianInput.autotype('{{back}}{{back}}p');
    //$meridianInput.trigger({
      //'type': 'keydown',
      //'keyCode': 9 //tab
    //});

    //expect(tp2.getTime()).toBe('02:00:30 PM');
  });

  it('should be 12:00 AM if 00:00 AM is entered', function() {
    //$input1.autotype('{{back}}{{back}}{{back}}{{back}}{{back}}{{back}}{{back}}{{back}}0:0 AM');
    //$input1.trigger({
      //'type': 'keydown',
      //'keyCode': 9 //tab
    //});

    //expect(tp1.getTime()).toBe('12:00 AM');
  });

  it('should validate input', function() {
    //var $hourInput = tp1.$widget.find('input.bootstrap-timepicker-hour'),
        //$minuteInput = tp1.$widget.find('input.bootstrap-timepicker-minute'),
        //$meridianInput = tp1.$widget.find('input.bootstrap-timepicker-meridian'),
        //$input3 = tp3.$element;

        //tp1.setTime('11:30 AM');
        //tp1.update();

        //$hourInput.autotype('{{back}}{{back}}13');
        //tp1.updateFromWidgetInputs();
        //expect(tp1.getTime()).toBe('12:30 AM');

        //$minuteInput.autotype('{{back}}{{back}}60');
        //tp1.updateFromWidgetInputs();
        //expect(tp1.getTime()).toBe('12:59 AM');

        //$meridianInput.autotype('{{back}}{{back}}dk');
        //tp1.updateFromWidgetInputs();
        //expect(tp1.getTime()).toBe('12:59 AM');

        //$meridianInput.autotype('{{back}}{{back}}p');
        //tp1.updateFromWidgetInputs();
        //expect(tp1.getTime()).toBe('12:59 PM');

        //$input3.autotype('{{back}}{{back}}{{back}}{{back}}{{back}}{{back}}{{back}}{{back}}25:60:60');
        //tp3.updateFromElementVal();
        //expect(tp3.getTime()).toBe('23:59:59');
  });
});
