'use strict';

const tt = require('onml/tt.js');
const genSVG = require('onml/gen-svg.js');
const stringify = require('onml/stringify.js');
const formatTime = require('./format-time.js');

const getX = (pstate, time) => {
  const { width, xOffset, xScale } = pstate;
  const x = (time * xScale + xOffset * width) / 2;
  return x;
};



const getLabel = (vPre, mPre, x, w, fmt, radix) => {  // add radix argument
  // const radix = (fmt || {}).radix;
  const base = ({
    b: 2, o: 8, d: 10, h: 16, H: 16
  })[radix] || 16;

  if (mPre) {
    if (vPre) {
      return ['text', {x, class: 'zxviolet'}, '?'];
    } else {
      return ['text', {x, class: 'xred'}, 'x'];
    }
  } else {
    const numPos = (w / 8) |0;
    let txtOrig = vPre.toString(base);
    if (radix === 'H') {
      txtOrig = txtOrig.toUpperCase();
    }

    // ? txtOrig.slice(0, numPos - 1) + '\u22ef' // MSB
    const txtShort = (txtOrig.length > numPos)
      ? ((numPos === 1)
        ? '\u22EE'
        : '\u22EF' + txtOrig.slice(1 - numPos)) // LSB
      : txtOrig;
    return ['text', {x}, txtShort]; // idx.toString(36)]);
  }
};

const tAtX = (x, pstate) => {
  const {xOffset, xScale, width, tgcd } = pstate;
  return Math.round((x / xScale * 2) - (xOffset * width / xScale)) * tgcd;
  // t = ((x / xScale * 2) - (xOffset * width / xScale)) * tgcd;
  // t = (x / xScale * 2) * tgcd - (xOffset * width / xScale) * tgcd;
  // t + (xOffset * width / xScale) * tgcd = (x / xScale * 2) * tgcd;
  // (t / tgcd) + (xOffset * width / xScale) = (x / xScale * 2);
  // (t / tgcd) * xScale / 2 + (xOffset * width / 2) = x;
};

const round10 = n =>
  ([
  /*0  1  2  3  4  5  6  7  8   9 */
    0, 1, 2, 4, 4, 5, 5, 5, 10, 10,
  /*10  11  12  13  14  15  16  17  18  19 */
    10, 10, 10, 15, 15, 15, 15, 20, 20, 20
  ])[Math.round(n)]
  || Math.round(n);

const getTimeGrid = pstate => {
  const { sidebarWidth, width, height, timescale, xScale, tgcd, xOffset } = pstate;
  const fontHeight = 16;
  // const timeLineStart = (xOffset * width / 2) |0;

  const timeGrid = ['g', {}];

  const xStartExact = tAtX(sidebarWidth, pstate);
  const xFinishExact = tAtX(width, pstate);
  const density = 1;
  const xLines = Math.round(density * width / sidebarWidth);

  const xStep = ((xFinishExact - xStartExact) / xLines);
  const xExp = Math.pow(10, Math.log10(xStep) |0);
  const xDelta = round10(xStep / xExp) * xExp;

  const xStart = Math.ceil(xStartExact / xDelta) * xDelta;
  const xFinish = Math.floor(xFinishExact / xDelta) * xDelta;

  for (let t = xStart; t <= xFinish; t += xDelta) {
    const x = Math.round((t / tgcd * xScale + xOffset * width) / 2);
    timeGrid.push(['g', {},
      ['line', {
        class: 'wd-grid-time',
        x1: x,
        x2: x,
        y2: height
      }],
      ['text', {
        class: 'wd-grid-time',
        x: x,
        y: fontHeight
      }, formatTime(t, timescale)],
      ['text', {
        class: 'wd-grid-time',
        x: x,
        y: height
      }, formatTime(t, timescale)]
    ]);
  }

  return timeGrid;
};

const renderValues = function* (desc, pstate, radix) {  // add radix argument
  const { width, height, sidebarWidth, yOffset, yStep } = pstate;
  const ml = genSVG(width, height);
  const i0 = yOffset * (height - 40) / yStep;
  const ilen = (height - 50) / yStep * 2;
  const iDelta = i0 % 1;

  ml.push(getTimeGrid(pstate));
  yield;

  for (let i = 0; i < ilen; i++) {
    const lane = desc.view[i + (i0 |0)];
    if (lane && lane.ref) {
      const chango = desc.chango[lane.ref];
      if (chango && chango.kind === 'vec') {
        const mLane = ['g', tt(0, Math.round((i - iDelta + 1.75) * yStep / 2))];
        const { wave } = chango;
        const jlen = wave.length;

        perLane: {
          let [tPre, vPre, mPre] = wave[0];
          let xPre = getX(pstate, tPre);
          for (let j = 1; j <= jlen; j++) {
            const mark = wave[j];
            const [tCur, vCur, mCur] = (mark || [desc.time, 0, 0]);
            const xCur = getX(pstate, tCur);
            if (vPre || mPre) {
              if (xPre > width && xCur > width) { // both time stamps to the right
                break perLane;
              }
              if (!((xPre < sidebarWidth)  && (xCur < sidebarWidth))) { // both time stamps to the left
                const xPreNorm = ((xPre > sidebarWidth) ? xPre : sidebarWidth) |0;
                const xCurNorm = ((xCur < width) ? xCur : width) |0;
                const w = xCurNorm - xPreNorm;
                if (w > 8) {
                  const x = Math.round((xPreNorm + xCurNorm) / 2);
                  mLane.push(getLabel(vPre, mPre, x, w, lane.format,radix));   // add radix argument
                }
              }
            }
            xPre = xCur;
            vPre = vCur;
            mPre = mCur;
          }
        }
        // console.log(lane.name, i, chango);
        ml.push(mLane);
      }
      yield;
    }
  }
  yield;
  return stringify(ml);
};

module.exports = renderValues;
