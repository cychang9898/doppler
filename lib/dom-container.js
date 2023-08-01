'use strict';

const CodeMirror = require('codemirror');
const waveql = require('./waveql.js');

require('codemirror/addon/fold/foldcode.js');
require('codemirror/addon/fold/foldgutter.js');
require('codemirror/addon/fold/brace-fold.js');
// require('codemirror/addon/fold/xml-fold.js');

const genKeyHandler = require('./gen-key-handler.js');
const genRenderWavesGL = require('./gen-render-waves-gl.js');
const genOnWheel = require('./gen-on-wheel.js');
const renderCursor = require('./render-cursor.js');
const renderCursorWheel = require('./render-cursor-wheel.js');
const genResizeHandler = require('./gen-resize-handler.js');

// first default cursor
const mouseMoveHandler = (moveCursor, content, pstate, render) => {
  const xmargin = pstate.sidebarWidth;
  const fontHeight = 20;
  const fontWidth = fontHeight / 2;
  const sidebarTextArea = pstate.sidebarWidth;

  let isStatic = false; // Flag to track if cursor position should be static
  let isInitialClick = true; // Flag to track initial click
  let clickedPoint = null; // Variable to store the clicked point

  const handler = event => {
    if (isStatic) return; // If static flag is set, do not update cursor position

    const x = event.clientX;
    if (x < sidebarTextArea) return;

    pstate.xCursor = x;
    moveCursor.style.left = (x - xmargin) + 'px';

    // Update the cursor SVG representation
    moveCursor.innerHTML = renderCursor({ xmargin, fontWidth, fontHeight }, pstate);
  };

  const initialize = event => {
    const x = event.clientX;
    if (x < sidebarTextArea) return;

    if (isInitialClick) {
      clickedPoint = event.clientX; // Store the clicked point
      isStatic = true; // Set static flag to true
      isInitialClick = false; // Set initial click flag to false

      pstate.xCursor = clickedPoint; // Set the cursor position to the clicked point
      moveCursor.style.left = (clickedPoint - xmargin) + 'px';
      moveCursor.innerHTML = renderCursor({ xmargin, fontWidth, fontHeight }, pstate);
    } else {
      clickedPoint = event.clientX; // Store the clicked point
      isStatic = true; // Set static flag to true

      pstate.xCursor = clickedPoint; // Set the cursor position to the clicked point
      moveCursor.style.left = (clickedPoint - xmargin) + 'px';
      moveCursor.innerHTML = renderCursor({ xmargin, fontWidth, fontHeight }, pstate);
    }

    if (!isStatic) {
      content.addEventListener('mousemove', handler); // Add mousemove event listener
    }
  };


  // Attach the click event listener to the content element
  content.addEventListener('click', initialize);

  // Add the mousemove event listener
  content.addEventListener('mousemove', handler);
};

// second cursor line in red colour
const mouseWheelHandler = (wheelCursor, content, pstate, render) => {
  const xmargin = pstate.sidebarWidth;
  const fontHeight = 20;
  const fontWidth = fontHeight / 2;
  const sidebarTextArea = pstate.sidebarWidth;

  let isStatic = false; // Flag to track if cursor position should be static
  let isSecondClick = false; // Flag to track if it is the second click
  let clickedPoint = null; // Variable to store the clicked point

  const handler = event => {
    if (!isSecondClick || isStatic) return; // If it's not the second click or static flag is set, do not update cursor position

    const x = event.clientX;
    if (x < sidebarTextArea) return;

    pstate.xCursor = x;
    wheelCursor.style.left = (x - xmargin) + 'px';

    // Update the cursor SVG representation
    wheelCursor.innerHTML = renderCursorWheel({ xmargin, fontWidth, fontHeight }, pstate);
  };

  const initialize = event => {
    const x = event.clientX;
    if (x < sidebarTextArea) return;

    if (event.type === 'auxclick') {
      clickedPoint = event.clientX; // Store the clicked point
      isStatic = true; // Set static flag to true

      if (!isSecondClick) {
        // First click on mouse wheel
        isSecondClick = true;
        wheelCursor.style.display = 'block'; // Show the cursor line
      } else {
        // Second click on mouse wheel
        isSecondClick = false;
        wheelCursor.style.display = 'none'; // Hide the cursor line
      }

      pstate.xCursor = clickedPoint; // Set the cursor position to the clicked point
      wheelCursor.style.left = (clickedPoint - xmargin) + 'px';
      wheelCursor.innerHTML = renderCursorWheel({ xmargin, fontWidth, fontHeight }, pstate);
    }

    if (!isStatic) {
      content.addEventListener('mousemove', handler); // Add mousemove event listener
    }
  };

  // Hide the cursor line initially
  wheelCursor.style.display = 'none';

  // Attach the auxclick event listener to the content element
  content.addEventListener('auxclick', initialize);

  // Add the mousemove event listener
  content.addEventListener('mousemove', handler);
};

const createElements = els => {
  const names = Object.keys(els);
  return names.reduce((res, name) => {
    const ml = els[name];
    const el = document.createElement(ml[0]);
    const attr = (typeof ml[1] === 'object') ? ml[1] : {};
    attr.class && el.classList.add(attr.class);
    attr.style && el.setAttribute('style', attr.style);
    res[name] = el;
    return res;
  }, {});
};

const getFullView = desc => {
  if (desc.waveql) {
    return;
  }

  const arr = [];

  const rec = obj => {
    Object.keys(obj).map(name => {
      const ref = obj[name];
      if (typeof ref === 'object') {
        arr.push(name);
        rec(ref);
        arr.push('..');
        return;
      }
      if (typeof ref !== 'string') {
        throw new Error();
      }
      arr.push(name);
    });
  };

  rec(desc.wires);

  desc.waveql = arr.join('\n');
};

module.exports = (content, desc, radix /* , opt */) => {   // add radix argument

  getFullView(desc);

  // console.log(desc);

  desc.t0 = desc.t0 || 0;
  desc.xScale |= 8;
  const pstate = {
    width: 1024,
    height: 1024,
    tgcd: desc.tgcd,
    timescale: desc.timescale,
    xScale: desc.xScale,
    xScaleMax: 1000,
    // xScaleMin: 1,
    // xOffset: 0,
    yOffset: 0,
    yStep: 48,
    yDuty: 0.7,
    sidebarWidth: 320,
    numLanes: desc.view.length,
    t0: desc.t0,
    time: desc.time
  };
  // pstate.xOffset = (2 * (pstate.width - pstate.sidebarWidth)) / pstate.time;

  // const {timetopSVG, timebotSVG} = timeline(desc);

  const els = createElements({
    container: ['div', {
      class: 'wd-container'
    }],
    waveformSection: ['div', {
      class: 'waveform-section'
    }],
    sidebarSection: ['div', {
      class: 'sidebar-section'
    }],
    view0: ['div', {
      class: 'wd-view',
      style: 'position: absolute; left: 320px;' // z-index: -10'
    }],
    values: ['div', {
      class: 'wd-values',
      style: 'position: absolute; left: 320px;' // z-index: -9'
    }],
    moveCursor: ['div', {
      class: 'wd-move-cursor',
      // style: 'position: absolute; top: 0px; left: 0px;'
      // style: 'overflow: hidden; position: absolute; top: 0px; left: 0px;'
    }],
    wheelCursor: ['div', {
      class: 'wd-wheel-cursor',
      // style: 'position: absolute; top: 0px; left: 0px;'
      // style: 'overflow: hidden; position: absolute; top: 0px; left: 0px;'
    }],
    sidebar: ['textarea', {}]
  });

  // Append the elements to the container in the desired order
  els.container.appendChild(els.sidebarSection);
  els.container.appendChild(els.waveformSection);
  els.waveformSection.appendChild(els.view0);
  els.waveformSection.appendChild(els.values);
  els.waveformSection.appendChild(els.moveCursor);
  els.waveformSection.appendChild(els.wheelCursor);
  els.sidebarSection.appendChild(els.sidebar);

  content.appendChild(els.container);

  let render2 = genRenderWavesGL(els.view0, els.values, radix); // add radix argument
  let render1 = render2(desc);
  let render = render1(pstate);

  //  => {
  //   const t0 = Date.now();
  //   mainGL(desc, pstate, els.view0);
  //   console.log('render time: ' + (Date.now() - t0));
  // };

  els.sidebar.innerHTML = desc.waveql;

  // console.log(foldGutter); // (CodeMirror);

  waveql.cmMode(CodeMirror, desc);

  const cm = CodeMirror.fromTextArea(els.sidebar, {
    // theme: 'blackboard',
    // mode: 'json',
    theme: 'waveql',
    mode: 'text/x-waveql',
    // lineNumbers: true,
    lineWrapping: false,
    tabSize: 2,
    autofocus: true,
    scrollbarStyle: null,
    styleActiveSelected: true,
    styleActiveLine: true,
//    styleSelectedText: true,
    viewportMargin: Infinity,
    foldGutter: true,
    gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter']
  });

  cm.on('scroll', cm => {
    const info = cm.getScrollInfo();
    // console.log(info);
    pstate.yOffset = 2 * info.top / info.clientHeight;
    render();
  });

  const parser = waveql.parser(desc.wires);

  const onCmChange = cm => {
    const str = cm.getValue();
    desc.view = parser(str);
    render();
  };

  cm.on('change', onCmChange);
  onCmChange(cm);

  els.container.tabIndex = '0';
  els.container.addEventListener('keydown', genKeyHandler(content, pstate, render, cm));
  els.container.addEventListener('wheel', genOnWheel(content, pstate, render, cm));

  // els.container.addEventListener('mousemove', event => {
  //   console.log(event);
  // }, false);

  const resizeHandler = genResizeHandler(els.waveformSection, pstate);

  const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
      const {width, height} = entry.contentRect;
      resizeHandler(width, height);
    }
    render();
  });

  resizeObserver.observe(els.waveformSection);

  // pinchAndZoom(els.container, content, pstate, render);
  resizeHandler(els.waveformSection.clientWidth, els.waveformSection.clientHeight);
  mouseMoveHandler(els.moveCursor, els.container, pstate, render);
  mouseWheelHandler(els.wheelCursor, els.container, pstate, render);
  render();
};

/* eslint-env browser */