'use strict';

const genResizeHandler = (waveformSection, pstate) =>
  (width, height) => {
    let {xScale, yStep, yOffset, time, sidebarWidth, numLanes} = pstate;

    // Update waveform section dimensions
    waveformSection.style.width = width + 'px';
    waveformSection.style.height = height + 'px';

    pstate.width = width;
    pstate.height = height;

    const yOffsetMax = (numLanes + 2) * yStep / height - 2;
    if (yOffsetMax < 0) { yOffset = 0; } else
    if (yOffset > yOffsetMax) { yOffset = yOffsetMax; }
    pstate.yOffset = yOffset;

    const xScaleMin = pstate.xScaleMin = (2 * (width - sidebarWidth)) / time;
    if (xScale < xScaleMin) { xScale = xScaleMin; }
    pstate.xScale = xScale;

    pstate.sidebarOffset = 0;
    pstate.xOffset = 0;

    const canvas = waveformSection.querySelector('canvas');
    console.log('canvas:', canvas);
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
    }
  };

module.exports = genResizeHandler;
