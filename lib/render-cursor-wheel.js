'use strict';

const genSVG = require('onml/gen-svg.js');
const stringify = require('onml/stringify.js');
const formatTime = require('./format-time.js');

const renderCursorWheel = (cfg, pstate) => {
  const {xmargin, fontWidth, fontHeight} = cfg;
  const {width, height, xScale, xOffset, tgcd, timescale, xCursor} = pstate;

  const xCursorShifted = xCursor - xmargin;
  const xx = Math.round((xCursorShifted - xOffset * width / 2) / xScale * 2) * tgcd;
  const label = formatTime(xx, timescale);
  const lWidth = (label.length + 1) * fontWidth;

  const body = [
    // vertical line
    ['line', {
      class: 'wd-cursor-time_wheel',
      x1: xmargin + 0.5,
      x2: xmargin + 0.5,
      y1: 0,
      y2: height
    }],
    // top time label
    ['rect', {
      class: 'wd-cursor-time_wheel',
      x: xmargin - lWidth / 2,
      y: 0,
      width: lWidth,
      height: fontHeight * 1.25
    }],
    ['text', {
      class: 'wd-cursor-time_wheel',
      x: xmargin,
      y: fontHeight
    }, label],
    // bottom time label
    ['rect', {
      class: 'wd-cursor-time_wheel',
      x: xmargin - lWidth / 2,
      y: height - fontHeight * 1.25,
      width: lWidth,
      height: fontHeight * 1.25
    }],
    ['text', {
      class: 'wd-cursor-time_wheel',
      x: xmargin,
      y: height - fontHeight * .25
    }, label]
  ];
  return stringify(genSVG(2 * xmargin, height).concat(body));
};

module.exports = renderCursorWheel;
