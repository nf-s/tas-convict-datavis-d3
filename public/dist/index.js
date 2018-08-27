// Get our canvas element
const canvas = document.getElementById('main-canvas');

const pixelRatio = window.devicePixelRatio;
const width = 3000 / pixelRatio;
const height = 2000 / pixelRatio;

const backgroundCol = [0.03, 0.03, 0.03, 1];

const defaultSickRowHeight = 10;
const defaultSickRowPaddingRatio = 0.25;
const defaultSickRowInversePaddingRatio = 1 - defaultSickRowPaddingRatio;
const defaultVoyageVertPadding = 100;

const sickRowLabelMarginLeft = 10 / pixelRatio;

const xAxisMarginBottom = 80 / pixelRatio;
const yAxisMarginLeft = 10 / pixelRatio;
const yAxisLabelGroupYPadding = 200 / defaultSickRowHeight;
const yAxisLabelGroupXPadding = 15;
const yAxisWidth = 200 / pixelRatio;
const yAxisTickCol = '#fff';

const defaultSickRowYtransitionDuration = 750;

// Create a WebGL 2D platform on the canvas:
const platform = Stardust.platform('webgl-2d', canvas, width, height);

const dateParser = d3.timeParse('%Y-%m-%d %H:%M:%S');

// Declare SVG element for D3
const svg = d3.select('#main-svg')
  .style('border', '0px solid')
  .attr('viewBox', `0 0 ${width} ${height}`);

const overlay = d3.select('#overlay')
  .style('width', `${width}px`)
  .style('height', `${height}px`);

const overlaySvg = d3.select('#overlay-svg')
  .style('border', '0px solid')
  .attr('viewBox', `0 0 ${width} ${height}`);

let currentZoomTransform = {
  x: 0, y: 0, kx: 1, ky: 1
};

// Adapted from d3 rescaleX fn [currentZoomTransformRescale(xAxisScale, 'x')]
function currentZoomTransformRescale(scale, axis = 'x') {
  return scale.copy().domain(scale.range()
    .map(x => (x - currentZoomTransform[axis]) / currentZoomTransform[`k${axis}`], currentZoomTransform)
    .map(scale.invert, scale));
}


/* ------------------------------------------------------------------------------------------
 * X-AXIS
 * ------------------------------------------------------------------------------------------ */

let xAxis = null;
let xAxisScale = null;
let xAxisScaleT = null;
let xAxisG = null;

const setXaxisByNumerical = () => {
  xAxis = d3.axisBottom(xAxisScale);

  xAxis.ticks(5)
    .tickSize(-height)
    .tickPadding(10)
    .tickFormat(d => d);

  if (xAxisG !== null) {
    xAxisG
      .call(xAxis.scale(xAxisScaleT));
  }
};

const setXaxisByDate = () => {
  xAxis = d3.axisBottom(xAxisScale);

  xAxis.tickSize(-height)
    .tickPadding(10)
    .tickFormat(d3.timeFormat('%B %d, %Y'));

  xAxisG
    .call(xAxis.scale(xAxisScaleT));
};

const setXAxisScaleByDay = (data) => {
  xAxisScale = d3.scaleLinear()
    .domain([
      d3.min(data, d => d.OnInDays),
      d3.max(data, d => d.OffInDays)
    ])
    .range([0, width]);

  xAxisScaleT = currentZoomTransformRescale(xAxisScale, 'x');

  setXaxisByNumerical();
};

const setXAxisScaleByPercentage = (data) => {
  xAxisScale = d3.scaleLinear()
    .domain([
      d3.min(data, d => d.OnPercentVoyage),
      d3.max(data, d => d.OffPercentVoyage)
    ])
    .range([0, width]);

  xAxisScaleT = currentZoomTransformRescale(xAxisScale, 'x');

  setXaxisByNumerical();
};

const setXAxisScaleByDate = (data) => {
  xAxisScale = d3.scaleTime()
    .domain([
      d3.min(data, d => d.OnDate),
      d3.max(data, d => d.OffDate)
    ])
    .range([0, width]);

  xAxisScaleT = currentZoomTransformRescale(xAxisScale, 'x');

  setXaxisByDate();
};

const initXAxis = (data) => {
  setXAxisScaleByDay(data);

  xAxisG = overlaySvg.append('g')
    .attr('class', 'axis axis--x axis-no-line')
    .attr('transform', `translate(0,${height - xAxisMarginBottom})`)
    .call(xAxis);
};

/* ------------------------------------------------------------------------------------------
 * Y-AXIS
 * ------------------------------------------------------------------------------------------ */

let yAxisScale = null;
let yAxisScaleT = null;
let yAxisG = null;

// Adapted from https://stackoverflow.com/questions/5667888/counting-the-occurrences-frequency-of-array-elements
const countYBins = (data, yKey, x1Key, x2Key) => data.reduce((acc, curr) => {
  if (typeof acc[curr[yKey]] === 'undefined') {
    acc[curr[yKey]] = { value: 1, minX: curr[x1Key], maxX: curr[x2Key] };
  } else {
    acc[curr[yKey]].value += 1;

    if (curr[x1Key] < acc[curr[yKey]].minX) {
      acc[curr[yKey]].minX = curr[x1Key];
    }

    if (curr[x2Key] > acc[curr[yKey]].maxX) {
      acc[curr[yKey]].maxX = curr[x2Key];
    }
  }

  return acc;
}, {});

// Voyage Label _______________
const setYLabel = (label, y, yBin, transition) => {
  const voyageLabel = {};

  voyageLabel.g = overlaySvg.append('g')
    .attr('class', 'voyage-label');

  voyageLabel.line = voyageLabel.g.append('line')
    .style('stroke', yAxisTickCol)
    .style('stroke-width', 2);

  voyageLabel.text = voyageLabel.g.append('text')
    .attr('opacity', 0)
    .attr('text-anchor', 'end')
    .style('fill', yAxisTickCol)
    .text(label);

  voyageLabel.hidden = false;

  const minXPosition = yAxisMarginLeft + (2 * yAxisLabelGroupXPadding);
  const minYPosition = xAxisMarginBottom;

  voyageLabel.setPosition = (setPositionTransition = false) => {
    const yZoom = currentZoomTransform.ky;

    let yT = yAxisScaleT(y);
    let yHeightT = yAxisScale(yBin.value) * yZoom;

    let xMinT = xAxisScaleT(yBin.minX);
    const xMaxT = xAxisScaleT(yBin.maxX);

    if (yT < minYPosition) {
      if (yT + (yHeightT - minYPosition) > 0) {
        yHeightT += yT - minYPosition;
        yT = minYPosition;
      } else {
        yHeightT = -100;
        yT = -100;
      }
    }

    if (xMinT < minXPosition) {
      if (xMaxT >= minXPosition) {
        xMinT = minXPosition;
      } else {
        xMinT = xMaxT;
      }
    }

    voyageLabel.g
      .attr('transform', `translate(${xMinT - yAxisLabelGroupXPadding},${yT})`);

    if (yHeightT > 8) {
      if (voyageLabel.hidden) {
        voyageLabel.hidden = false;
        voyageLabel.g
          .transition()
          .duration(defaultSickRowYtransitionDuration)
          .attr('opacity', 1);
      }

      if (setPositionTransition) {
        voyageLabel.line
          .attr('y2', 0)
          .transition()
          .delay(defaultSickRowYtransitionDuration)
          .duration(defaultSickRowYtransitionDuration)
          .attr('y2', yHeightT);
      } else {
        voyageLabel.line
          .attr('y2', yHeightT);
      }

      voyageLabel.text
        .attr('font-size', `${10 + Math.min(yZoom * 6, 4)}px`)
        .attr('x', -5)
        .attr('y', 10)
        .attr('transform', 'rotate(0, -10, 5)');

      // Rotate text if label is against y-axis
      if (xMinT > minXPosition) {
        voyageLabel.text
          .attr('transform', 'rotate(0, -10, 5)');
      } else {
        voyageLabel.text
          .attr('transform', 'rotate(-90, -10, 5)');
      }
    } else if (!voyageLabel.hidden) {
      voyageLabel.hidden = true;
      voyageLabel.g
        .attr('opacity', 1)
        .transition()
        .duration(defaultSickRowYtransitionDuration)
        .attr('opacity', 0);
    }
  };

  voyageLabel.remove = () => {
    voyageLabel.g
      .attr('opacity', 1)
      .transition()
      .duration(defaultSickRowYtransitionDuration)
      .attr('opacity', 0)
      .remove();

    voyageLabel.line.transition()
      .duration(defaultSickRowYtransitionDuration).attr('y2', 0).remove();

    voyageLabel.text.transition()
      .duration(defaultSickRowYtransitionDuration).attr('font-size', 0).remove();
  };

  voyageLabel.setPosition(true);

  if (transition) {
    voyageLabel.text.transition()
      .delay(defaultSickRowYtransitionDuration)
      .duration(defaultSickRowYtransitionDuration).attr('opacity', 1);
  }

  return voyageLabel;
};

function hideAllVoyageLabels() {
  d3.selectAll('.voyage-label').transition().duration(defaultSickRowYtransitionDuration).attr('opacity', 0);
}

const yLabels = [];

let oldYGroupBy = '';
const setYLabelAxis = (data, yGroupBy, x1Key, x2Key, transition = false) => {
  yLabels.forEach(label => label.remove());

  if (yGroupBy === '') {
    return false;
  }
  oldYGroupBy = yGroupBy;

  const yBins = countYBins(data, yGroupBy, x1Key, x2Key);

  const yBinKeys = Object.keys(yBins);

  stable.inplace(yBinKeys, (a, b) => a > b);

  yAxisScale = d3.scaleLinear()
    .domain([0, (data.length + (yBinKeys.length * yAxisLabelGroupYPadding))])
    .range([0, (data.length + (yBinKeys.length * yAxisLabelGroupYPadding)) * defaultSickRowHeight]);

  yAxisScaleT = currentZoomTransformRescale(yAxisScale, 'y');

  let index = 0;
  yBinKeys.forEach((key) => {
    let count = index * yAxisLabelGroupYPadding;
    yBinKeys.forEach((previousKey) => {
      if (key > previousKey) {
        count += yBins[previousKey].value;
      }
    });

    yLabels.push(setYLabel(key, count, yBins[key], transition));
    index += 1;
  });

  return true;
};

const setYDensityAxis = (data, yKey) => {
  yAxisScale = d3.scaleLinear()
    .domain([0, data.length])
    .range([0, data.length * defaultSickRowHeight]);

  yAxisScaleT = currentZoomTransformRescale(yAxisScale, 'y');

  const yValues = [];

  data.forEach((row) => {
    if (!isNaN(row[yKey])) { yValues.push(row[yKey]); }
  });

  // KDE adapted from https://github.com/jasondavies/science.js/blob/master/examples/kde/kde.js
  const kde = science.stats.kde().sample(yValues);

  const kdeX = d3.scaleLinear().domain([0, 0.1]).range([yAxisMarginLeft, yAxisMarginLeft + yAxisWidth]);
  const kdeY = d3.scaleLinear().domain([0, 100]).range([xAxisMarginBottom, height - xAxisMarginBottom]);

  const line = d3.line()
    .x(d => kdeX(d[1]))
    .y(d => kdeY(d[0]));

  overlaySvg.append('path')
    .attr('class', 'y-axis-density')
    .attr('fill', 'none')
    .attr('stroke', '#000')
    .attr('stroke-width', 1.5)
    .attr('stroke-linejoin', 'round')
    .attr('opacity', 0)
    .attr('d', line(kde(d3.range(0, 100, 0.1))))
    .transition()
    .delay(defaultSickRowYtransitionDuration)
    .attr('opacity', 1);
};

const removeYDensityAxis = () => {
  overlaySvg.select('path.y-axis-density').transition()
    .delay(defaultSickRowYtransitionDuration).remove();
};

let oldYAxisKey = '';
let densityTimeout = null;
const setYAxis = (data, ySortBy, yGroupBy) => {
  if (yGroupBy !== '') {
    removeYDensityAxis();
  } else if (oldYAxisKey !== ySortBy) {
    oldYAxisKey = ySortBy;

    removeYDensityAxis();

    if (densityTimeout !== null) {
      clearTimeout(densityTimeout);
    }
    densityTimeout = setTimeout(() => setYDensityAxis(data, ySortBy), 1500);
  }
};

const initYAxis = (data, ySortKey, yGroupKey, x1Key, x2Key) => {
  yAxisG = overlaySvg.append('g')
    .attr('class', 'axis axis--y axis-no-line')
    .attr('transform', `translate(${yAxisMarginLeft},0)`);
  // .call(yAxisScale);

  setYAxis(data, ySortKey, yGroupKey);
  setYLabelAxis(data, yGroupKey, x1Key, x2Key, true);
};

/* ------------------------------------------------------------------------------------------
 * MAIN SICKLIST FUNCTION
 * ------------------------------------------------------------------------------------------ */

const initSicklist = (shipyearsData, sicklistData) => {
  /* ------------------------------------------------------------------------------------------
  * SETUP DATA
  * ------------------------------------------------------------------------------------------ */
  const allSicklistData = [];

  const sicklistDataTypes = {
    ShipWithYear: 'Categorical',
    Died: 'CategoricalId',
    Quality: 'Categorical',
    'Disease.Classification.1': 'Categorical',
    'Disease.2.Code': 'CategoricalId',
    OnInDays: 'Numerical',
    OnDate: 'Date',
    OnDateNum: 'Numerical',
    OnPercentVoyage: 'Numerical',
    OffInDays: 'Numerical',
    OffDate: 'Date',
    OffDateNum: 'Numerical',
    OffPercentVoyage: 'Numerical',
    TotalInDays: 'Numerical',
    TotalPercentVoyage: 'Numerical',
    Gender: 'CategoricalId',
    AgeInYears: 'Numerical'
  };

  // shipyearsData.length
  for (let i = 0; i < shipyearsData.length; i += 1) {
    const currentSicklistVoyage = sicklistData.filter(d => d.ShipWithYear === shipyearsData[i].ShipWithYear);

    allSicklistData.push(...currentSicklistVoyage);

    if (currentSicklistVoyage.length === 0) {
      console.log(`${shipyearsData[i].ShipWithYear} is empty`);
    }
  }

  allSicklistData.forEach((d) => {
    d.OnDate = dateParser(d.OnDate);
    d.OffDate = dateParser(d.OffDate);
  });

  // Set date values
  const xScaleDate = d3.scaleTime()
    .domain([
      d3.min(allSicklistData, d => d.OnDate),
      d3.max(allSicklistData, d => d.OffDate)
    ])
    .range([0, width]);

  allSicklistData.forEach((d) => {
    d.OnDateNum = xScaleDate(d.OnDate);
    d.OffDateNum = xScaleDate(d.OffDate);

    // Swap bad dates
    if (d.OnDateNum > d.OffDateNum) {
      const newOnDateNum = d.OffDateNum;
      d.OffDateNum = d.OnDateNum;
      d.OnDateNum = newOnDateNum;

      const newOnDate = d.OffDate;
      d.OffDate = d.OnDate;
      d.OnDate = newOnDate;
    }
  });

  /* ------------------------------------------------------------------------------------------
  * SETUP MARK
  * ------------------------------------------------------------------------------------------ */

  const rectangleCustomSpec = Stardust.mark.compile(`     
    let pan: Vector2;
    let zoom: Vector2;
    
    function clamp01(t: float): float {
        if(t < 0) t = 0;
        if(t > 1) t = 1;
        return t;
    }
    
    // Adapted from https://gist.github.com/gre/1650294
    function quinticEaseInOut(t: float): float {
        if (t<0.5)  {
          t = 16*t*t*t*t*t;
        }
        else {
          t = t-1;
          t = 1+16*t*t*t*t*t ;
        }
        return t;
    }
            
    mark RectangleXY(
        index: float,
        indexSecondary: float,
        maxIndex: float,
        maxIndexSecondary: float,
        x: Vector2 = [ 0, 0 ],
        y: Vector2 = [ 0, 0 ],
        xSecondary: Vector2 = [ 0, 0 ],
        ySecondary: Vector2 = [ 0, 0 ],
        color: Color = [ 0, 0, 0, 1 ],
        
        defaultSickRowPaddingRatio: float,
        tx: float, ty: float, skewing: float
    ) {
    
        x = mix(x, xSecondary, quinticEaseInOut(clamp01(tx*2 - (skewing * index)/maxIndex)));
        y = mix(y, ySecondary, quinticEaseInOut(clamp01(ty*2 - (skewing * index)/maxIndex)));
        
        // Zoom + Pan
        x = x * zoom.x + Vector2(pan.x, pan.x);
        y = y * zoom.y + Vector2(pan.y, pan.y);
        
        // Reduce opacity as bars get smaller
        let opacity = 1;
        
        // Note: all pixel values are twice the half the actual value -> 0.5 is actually 1 pixel width
        if (y.y - y.x + defaultSickRowPaddingRatio/2 < 0.5) {
          y = Vector2(y.x, y.x + 0.5);
          
          opacity = (y.y - y.x) + 0.5;
        }
        
        let col = Color(color.r, color.g, color.b, opacity);
    
        emit [
            { position: Vector2(x.x, y.x), color: col },
            { position: Vector2(x.y, y.x), color: col },
            { position: Vector2(x.y, y.y), color: col }
        ];
        emit [
            { position: Vector2(x.x, y.x), color: col },
            { position: Vector2(x.x, y.y), color: col },
            { position: Vector2(x.y, y.y), color: col }
        ];
    }
`);

  const rectangles = Stardust.mark.create(rectangleCustomSpec.RectangleXY, platform);

  rectangles
    .attr('pan', [0, 0])
    .attr('zoom', [1, 1]);

  rectangles
    .attr('tx', 0)
    .attr('ty', 0)
    .attr('skewing', 1)
    .attr('defaultSickRowPaddingRatio', defaultSickRowPaddingRatio);

  // newvalue = a * value + b. a = (max'-min')/(max-min) and b = min' - (a * min) [adapted from: https://stats.stackexchange.com/questions/70801/how-to-normalize-data-to-0-1-range]
  const xScalePrimary = Stardust.scale.custom(`
  Vector2(
    (a * xStartValue) + b, 
    (a * xEndValue) + b
  )
  `);

  const xScaleSecondary = Stardust.scale.custom(`
  Vector2(
    (a * xStartValue) + b, 
    (a * xEndValue) + b
  )
  `);

  // Set X scale to normalise x values to width of screen
  function setXScale(scale, xStartKey, xEndKey) {
    const domainMin = d3.min(allSicklistData, d => d[xStartKey]);
    const domainMax = d3.max(allSicklistData, d => d[xEndKey]);

    const a = (width) / (domainMax - domainMin);

    scale
      .attr('a', a).attr('b', -(a * domainMin));

    scale
      .attr('xStartValue', d => d[xStartKey])
      .attr('xEndValue', d => d[xEndKey]);
  }

  // Set y scale to normalise y values to width of screen and add padding between each row
  const yScalePrimary = Stardust.scale.custom(`
    Vector2(
      value * rowHeight, 
      (value + rowPadding) * rowHeight
    )
  `);

  function setYScale(scale) {
    scale
      .attr('rowHeight', defaultSickRowHeight)
      .attr('rowPadding', defaultSickRowInversePaddingRatio);
  }

  setYScale(yScalePrimary);

  function setRectXPoints(xScale, xStartKey, xEndKey, attrAddString = '') {
    setXScale(xScale, xStartKey, xEndKey);

    // const maxYIndex = d3.max(allSicklistData, d => d.index);

    rectangles
      .attr(`x${attrAddString}`, xScale());
  }

  let oldYSortByR = '';
  let oldYGroupByR = '';
  // Add duplicate yScale values (i.e. secondary to primary values)
  function setRectYPoints(yScale, ySortBy, yGroupBy, attrAddString = '') {
    if (ySortBy !== oldYSortByR || yGroupBy !== oldYGroupByR) {
      oldYSortByR = ySortBy;
      oldYGroupByR = yGroupBy;

      const numericalKeyComparator = (a, b) => {
        if (typeof a[ySortBy] === 'undefined') {
          return true;
        }
        if (typeof b[ySortBy] === 'undefined') {
          return false;
        }

        return Number(a[ySortBy]) > Number(b[ySortBy]);
      };

      stable.inplace(allSicklistData, numericalKeyComparator);

      if (yGroupBy !== '') {
        stable.inplace(allSicklistData, (a, b) => a[yGroupBy] > b[yGroupBy]);

        let currentYValue = allSicklistData[0][yGroupBy];
        let yGroupIndex = 0;
        allSicklistData.forEach((row) => {
          if (row[yGroupBy] !== currentYValue) {
            currentYValue = row[yGroupBy];
            yGroupIndex += 1;
          }
          row[`index${attrAddString}`] = allSicklistData.indexOf(row) + (yGroupIndex * yAxisLabelGroupYPadding);
        });
      } else {
        allSicklistData.forEach(row => row[`index${attrAddString}`] = allSicklistData.indexOf(row));
      }

      rectangles
        .attr(`index${attrAddString}`, d => d[`index${attrAddString}`])
        .attr(`maxIndex${attrAddString}`, d3.max(allSicklistData, d => d[`index${attrAddString}`]))
        .attr(`y${attrAddString}`, yScale(d => d[`index${attrAddString}`]));
    }
  }

  function copyRectYPointsFromSecondary(yScale) {
    rectangles
      .attr('index', d => d.indexSecondary)
      .attr('maxIndex', d3.max(allSicklistData, d => d.indexSecondary))
      .attr('y', yScale(d => d.indexSecondary));
  }

  function createRectLabel(d, x1, x2, y) {
    if (typeof d.visible === 'undefined' || !d.visible) {
      const rowLabel = {};

      rowLabel.g = overlaySvg.append('g')
        .attr('opacity', 0)
        .attr('class', 'row-label');

      rowLabel.text = rowLabel.g.append('text')
        .attr('text-anchor', 'start')
        .style('fill', 'rgba(0,0,0,.8)')
        .style('font-weight', d.Died ? '900' : 'normal')
        .attr('x', sickRowLabelMarginLeft)
        .text(`
          ${d.Forenames} ${d.Name}
          ${(typeof d.AgeInYears !== 'undefined') ? ` (${d.AgeInYears}) ` : ''}
          — ${d['Disease.Classification.1']}
          ${(d['Disease.Classification.2'] !== '') ? ` (${d['Disease.Classification.2']})` : ''}`);

      rowLabel.g.transition()
        .duration(defaultSickRowYtransitionDuration)
        .attr('opacity', 1);

      rowLabel.setPosition = (xStart, xEnd, yPos) => {
        const xStartMin = Math.max(xStart, yAxisLabelGroupXPadding + sickRowLabelMarginLeft);

        rowLabel.g
          .attr('transform', `translate(${Math.max(xStartMin, yAxisLabelGroupXPadding + sickRowLabelMarginLeft)}, ${yPos})`)
          .style(
            'clip-path',
            `polygon(
              0 0, 
              ${((xEnd - xStartMin) / pixelRatio) - sickRowLabelMarginLeft}px 0, 
              ${((xEnd - xStartMin) / pixelRatio) - sickRowLabelMarginLeft}px ${defaultSickRowHeight * currentZoomTransform.ky}px, 
              0% ${defaultSickRowHeight * currentZoomTransform.ky}px)`
          );
        rowLabel.text
          .attr('y', currentZoomTransform.ky / 2)
          .attr('font-size', `${4 * currentZoomTransform.ky}px`);
      };

      rowLabel.remove = () => {
        rowLabel.g
          // .attr('opacity', 1)
          // .transition()
          // .duration(defaultSickRowYtransitionDuration)
          .attr('opacity', 0)
          .remove();

        delete d.label.remove;
      };

      d.visible = true;
      d.label = rowLabel;

      rowLabel.setPosition(x1, x2, y);
    }
  }

  function setRectLabel(xStartKey, xEndKey) {
    if (currentZoomTransform.ky * defaultSickRowHeight > 10) {
      allSicklistData.forEach((d) => {
        const startY = ((d.index + 0.5) * defaultSickRowHeight * currentZoomTransform.ky) + currentZoomTransform.y;

        if (startY > 0 && startY < height) {
          const startX = xAxisScaleT(d[xStartKey]);
          const endX = xAxisScaleT(d[xEndKey]);

          // If visible
          if ((startX < 0 && endX > 0) ||
            (startX < width && endX > width) ||
            (startX > 0 && endX < width)) {
            // If was previously visible -> update position
            if (d.visible && 'label' in d) {
              d.label.setPosition(startX, endX, startY);

            // If was previously INvisible -> create label
            } else {
              createRectLabel(d, startX, endX, startY);
            }

          // If was previously visible -> remove label
          } else if (d.visible && 'label' in d) {
            d.visible = false;
            d.label.remove();
          }

        // If was previously visible -> remove label
        } else if (d.visible && 'label' in d) {
          d.visible = false;
          d.label.remove();
        }
      });
    } else {
      allSicklistData.forEach((d) => {
        if (d.visible && 'label' in d) {
          d.visible = false;
          d.label.remove();
        }
      });
    }
  }

  let currentXkey = 'byDay';
  let xStartKey = 'OnInDays';
  let xEndKey = 'OffInDays';
  let xAxisStartKey = 'OnInDays';
  let xAxisEndKey = 'OffInDays';
  let currentSortBy = 'OnInDays';
  let currentGroupBy = '';

  setRectXPoints(xScalePrimary, xStartKey, xEndKey);
  setRectYPoints(yScalePrimary, currentSortBy, currentGroupBy);

  initXAxis(allSicklistData);
  initYAxis(allSicklistData, currentSortBy, currentGroupBy, xAxisStartKey, xAxisEndKey);

  setRectLabel(xAxisStartKey, xAxisEndKey);

  /* ------------------------------------------------------------------------------------------
  * SETUP COLOUR
  * ------------------------------------------------------------------------------------------ */

  const normalise = (min, max) => (val) => {
    const a = 1 / (max - min);
    return (a * val) + -(a * min);
  };

  // From https://stardustjs.github.io/examples/sanddance/
  const strToRGBA = (str) => {
    const rgb = d3.rgb(str);
    return [rgb.r / 255, rgb.g / 255, rgb.b / 255, 1];
  };

  function setColourScale() {
    const colScheme = d3[currentColourSchemeString];

    const normaliseVal = normalise(d3.min(allSicklistData, d => d[currentColourString]), d3.max(allSicklistData, d => d[currentColourString]));

    if (currentColourSchemeInvert) {
      rectangles.attr('color', d => strToRGBA(colScheme(1 - normaliseVal(d[currentColourString]))));
    } else {
      rectangles.attr('color', d => strToRGBA(colScheme(normaliseVal(d[currentColourString]))));
    }
    // Handle missing values


    requestRender();
  }

  // Set rectangles data!
  rectangles.data(allSicklistData);

  /* ------------------------------------------------------------------------------------------
   * RENDERING
   *   - Adapted from https://github.com/stardustjs/stardust-examples/blob/master/examples/graph/index.html
   * ------------------------------------------------------------------------------------------ */

  let requested = null;
  function requestRender() {
    if (requested) return;
    requested = requestAnimationFrame(render);
  }

  function render() {
    requested = null;
    // Cleanup and re-render.
    platform.clear(backgroundCol);

    rectangles.render();
  }

  requestRender();

  /* ------------------------------------------------------------------------------------------
   * ZOOMING - X-AXIS
   * PANNING - Y and X Axis
   *   - Handled by scrolling and limited touch support
   * ------------------------------------------------------------------------------------------ */
  let touchEvts = null;
  function setupZoom(maxY = height * 2, transition = true) {
    touchEvts = new TouchEvts(
      svg.node(),
      currentZoomTransform,
      {
        kx: [1 / 2, 100], ky: [1 / 500, 5]
      },
      onPanOrZoom
    );
  }

  function setZoomMaxExtent(xKey) {
    switch (xKey) {
      case 'byDate': {
        touchEvts.maxExtent = {
          kx: [1 / 4, 2000], ky: [1 / 500, 5]
        };
        break;
      }
      case 'byPercent':
      case 'byDay': {
        touchEvts.maxExtent = {
          kx: [1 / 2, 100], ky: [1 / 500, 5]
        };
        break;
      }
      default:
        break;
    }
  }

  function onPanOrZoom(transform) {
    currentZoomTransform = transform;

    rectangles
      .attr('pan', [currentZoomTransform.x, currentZoomTransform.y])
      .attr('zoom', [currentZoomTransform.kx, currentZoomTransform.ky]);

    // As zoom out - reduce row padding
    if (currentZoomTransform.ky < 1) {
      yScalePrimary.attr('rowPadding', 1 - ((1 - defaultSickRowInversePaddingRatio) * currentZoomTransform.ky));
    }

    xAxisScaleT = currentZoomTransformRescale(xAxisScale, 'x');
    yAxisScaleT = currentZoomTransformRescale(yAxisScale, 'y');

    xAxisG
      .call(xAxis.scale(xAxisScaleT));

    yLabels.forEach(label => label.setPosition());

    setRectLabel(xAxisStartKey, xAxisEndKey);

    requestRender();
  }

  setupZoom();

  /*
   NO! - this is from graph example

  let isDragging = false;
  let draggingLocation = null;
  // Handle dragging.
  canvas.onmousedown = function (e) {
    const startX = e.clientX - canvas.getBoundingClientRect().left;
    const startY = e.clientY - canvas.getBoundingClientRect().top;

    isDragging = true;
    draggingLocation = [selectedNode.x, selectedNode.y];

    const onMove = function (e) {
      const nx = e.clientX - canvas.getBoundingClientRect().left;
      const ny = e.clientY - canvas.getBoundingClientRect().top;
      selectedNode.x = nx;
      selectedNode.y = ny;
      draggingLocation = [nx, ny];
      requestRender();
    };

    const onUp = function () {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      draggingLocation = null;
      isDragging = false;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  canvas.onmousemove = function (e) {
    if (isDragging) return;
    //
  };
  */


  /* ------------------------------------------------------------------------------------------
   * UI EVENT HANDLING
   * X-AXIS SELECTION, SORTING, GROUPING and FILTERING
   *   - Sort by ...
   *   - Group by:  Voyage or None
   *   - Filter: None or Deaths
   * ------------------------------------------------------------------------------------------ */

  let currentColourString = 'Died';
  let currentColourSchemeString = 'interpolateReds';
  let currentColourSchemeInvert = false;

  setColourScale();

  let currentFilterBy = null;

  let yTransitionInProgress = false;

  $('#sortSelect')
    .change(() => {
      applyYSort($('#sortSelect').val());
      updateYSortAndGroupBy();
      setRectLabel(xAxisStartKey, xAxisEndKey);
    });

  $('#groupSelect')
    .change(() => {
      applyYGroupBy($('#groupSelect').val());
      updateYSortAndGroupBy();
      setRectLabel(xAxisStartKey, xAxisEndKey);
    });

  const applyYGroupBy = (groupBy = currentGroupBy) => {
    if (groupBy !== currentGroupBy) {
      currentGroupBy = groupBy;
    }
  };

  let oldSortString = 'On';
  const applyYSort = (sortString = oldSortString) => {
    oldSortString = sortString;
    let newSortString = '';

    if (xAxisMode === 'Date') {
      // `TotalDate` field doesn't exist -> so use TotalInDays
      if (sortString === 'Total') {
        newSortString = 'TotalInDays';
      // All other Date fields need 'Num' appended (i.e. OnDateNum)
      } else {
        newSortString = `${sortString + xAxisMode}Num`;
      }
    } else {
      newSortString = sortString + xAxisMode;
    }

    if (currentSortBy !== newSortString) {
      currentSortBy = newSortString;
    }
  };

  const updateYSortAndGroupBy = () => {
    const transition = () => {
      beginTransition('ySort', (t) => {
        rectangles.attr('ty', t);
        requestRender();
      }, () => {
        //setRectYPoints(yScalePrimary, currentSortBy, currentGroupBy);
        copyRectYPointsFromSecondary(yScalePrimary);

        rectangles.attr('ty', 0);
        requestRender();

        yTransitionInProgress = false;

        // Time for animation
      }, 1.5);
    };

    if (!yTransitionInProgress) {
      setRectYPoints(yScalePrimary, currentSortBy, currentGroupBy, 'Secondary');

      yTransitionInProgress = true;

      transition();
    }

    setYAxis(allSicklistData, currentSortBy, currentGroupBy);
    setYLabelAxis(allSicklistData, currentGroupBy, xAxisStartKey, xAxisEndKey, true);
  };

  $('#colourSelect')
    .change(() => {
      currentColourString = '';
      $('#colourSelect')
        .find('option:selected')
        .each(function () {
          currentColourString += $(this).text();
        });

      setColourScale();
    });

  $('#colourSchemeSelect')
    .change(() => {
      currentColourSchemeString = '';
      $('#colourSchemeSelect')
        .find('option:selected')
        .each(function () {
          currentColourSchemeString += $(this).text();
        });

      setColourScale();
    });

  $('#colourSchemeInvert').click((evt) => {
    currentColourSchemeInvert = $('#colourSchemeInvert').is(':checked');

    setColourScale();
  });

  // CHANGE FILTER
  $('input[name=\'filter\']')
    .change((evt) => {
      const value = evt.currentTarget.value;
      if (value === '') {
        currentFilterBy = null;
      } else {
        currentFilterBy = {};
        currentFilterBy[value] = true;
      }
      applySortingWithGrouping();
    });


  // X-AXIS MODES:
  // - By Day
  // - By % Voyage Elapsed
  // - By Date

  let xTransitionInProgress = false;
  let xAxisMode = 'InDays';

  $('input[name=\'xAxis\']')
    .change((evt) => {
      xAxisMode = evt.currentTarget.value;

      switch (xAxisMode) {
        case 'Date': {
          currentXkey = 'byDate';
          xStartKey = 'OnDateNum';
          xEndKey = 'OffDateNum';
          xAxisStartKey = 'OnDate';
          xAxisEndKey = 'OffDate';

          setXAxisScaleByDate(allSicklistData);

          break;
        }
        case 'InDays': {
          currentXkey = 'byDay';
          xStartKey = 'OnInDays';
          xEndKey = 'OffInDays';
          xAxisStartKey = 'OnInDays';
          xAxisEndKey = 'OffInDays';

          setXAxisScaleByDay(allSicklistData);

          break;
        }
        case 'PercentVoyage': {
          currentXkey = 'byPercent';
          xStartKey = 'OnPercentVoyage';
          xEndKey = 'OffPercentVoyage';
          xAxisStartKey = 'OnPercentVoyage';
          xAxisEndKey = 'OffPercentVoyage';

          setXAxisScaleByPercentage(allSicklistData);

          break;
        }
        default:
          break;
      }

      applyXSort();

      applyYSort();
      applyYGroupBy();

      updateYSortAndGroupBy();
      setRectLabel(xAxisStartKey, xAxisEndKey);

      setZoomMaxExtent(currentXkey);
    });

  const applyXSort = () => {
    const transition = () => {
      beginTransition('xSort', (t) => {
        rectangles.attr('tx', t);
        requestRender();
      }, () => {
        // On finish transition - set original "xScaleCustom" scale to xScaleCustomInterpolateTo
        setRectXPoints(xScalePrimary, xStartKey, xEndKey);
        rectangles.attr('tx', 0);
        requestRender();

        xTransitionInProgress = false;

        // Time for animation
      }, 1.5);
    };

    if (!xTransitionInProgress) {
      setRectXPoints(xScaleSecondary, xStartKey, xEndKey, 'Secondary');

      xTransitionInProgress = true;

      transition();
    }
  };

  // Adapted from https://github.com/stardustjs/stardust-examples/blob/master/examples/isotype/index.html
  const _previousTransition = {};

  function beginTransition(transitionId, func, finishedFunc, maxTime) {
    if (transitionId in _previousTransition) _previousTransition[transitionId].stop();
    delete _previousTransition[transitionId];
    maxTime = maxTime || 1;
    const t0 = new Date().getTime();
    let req = null;
    let totalFrames = 0;
    const rerender = function () {
      req = null;
      const t1 = new Date().getTime();
      let t = (t1 - t0) / 1000;
      let shouldStop = false;
      if (t > maxTime) {
        t = maxTime;
        shouldStop = true;
      }
      func(t / maxTime);
      totalFrames += 1;
      if (!shouldStop) {
        req = requestAnimationFrame(rerender);
      } else {
        finishedFunc();
      }
    };
    req = requestAnimationFrame(rerender);
    _previousTransition[transitionId] = {
      stop() {
        if (req != null) cancelAnimationFrame(rerender);
      }
    };
    return _previousTransition[transitionId];
  }
};

/* ------------------------------------------------------------------------------------------
 * MAIN CONVICT FUNCTION
 * ------------------------------------------------------------------------------------------ */

const initConvicts = (convictData) => {

};

/* ------------------------------------------------------------------------------------------
  * STARTUP SCRIPT
  *  - Fetch JSON
  * ------------------------------------------------------------------------------------------ */
axios.get('/data/shipyear.stats.json')
  .then((shipYearStats) => {
    // Get sicklist data
    axios.get('/data/sicklist.json')
      .then((sickList) => {
        initSicklist(shipYearStats.data, sickList.data);
      })
      .catch((error) => {
        console.log(error);
      });

    // Get convict data
    axios.get('/data/convict.json')
      .then((convicts) => {
        initConvicts(convicts.data);
      })
      .catch((error) => {
        console.log(error);
      });
  })
  .catch((error) => {
    console.log(error);
  });


/* ------------------------------------------------------------------------------------------
  * TODO:
  *  - Add animation field (i.e. Sex = M=0, F=1 for index or something)
  *
  *  - Pre calculate densities
  *
  *  - Add convict view
  * ------------------------------------------------------------------------------------------ */
