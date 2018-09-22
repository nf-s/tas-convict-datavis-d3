// Get our canvas element
const canvas = document.getElementById('main-canvas');

const pixelRatio = window.devicePixelRatio;
const width = 1024 / pixelRatio;
const height = 768 / pixelRatio;

const backgroundCol = [0.03, 0.03, 0.03, 1];

const defaultSickRowCol = '#fff';
const defaultSickRowHeight = 10;
const defaultSickRowPaddingRatio = 0.25;
const defaultSickRowInversePaddingRatio = 1 - defaultSickRowPaddingRatio;
const defaultVoyageVertPadding = 100;

const sickRowLabelMarginLeft = 10;
const sickRowMissingCol = [0.2, 0.2, 0.2, 1];
const sickRowHighlightCol = [0, 0.84, 0.67, 1];

const xAxisMarginBottom = 60;
const yAxisMarginLeft = 5;
const yAxisLabelGroupYPadding = 500 / defaultSickRowHeight;
const yAxisLabelGroupXPadding = 15;
const yAxisWidth = 100;
const yAxisTickCol = '#fff';

const defaultSickRowYtransitionDuration = 750;
const defaultUiTransitionDuration = 250;

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

const filterOverlay = d3.select('#filter-overlay')
  .style('opacity', '0')
  .style('display', 'none');

let currentZoomTransform = {
  x: 0,
  y: 0,
  kx: 1,
  ky: 1
};

// Adapted from d3 rescaleX fn [currentZoomTransformRescale(xAxisScale, 'x')]
function currentZoomTransformRescale(scale, axis = 'x') {
  return scale.copy()
    .domain(scale.range()
      .map(x => (x - currentZoomTransform[axis]) / currentZoomTransform[`k${axis}`], currentZoomTransform)
      .map(scale.invert, scale));
}

const getComparator = (type, key = undefined, invert = false) => {
  if (type === 'Numerical' || type === 'CategoricalId') {
    return numericalKeyComparator(key, invert);
  } else if (typeof key === 'undefined') {
    return invert ? (a, b) => a < b : (a, b) => a > b;
  }
  return invert ? (a, b) => a[key] < b[key] : (a, b) => a[key] > b[key];
};

const numericalKeyComparator = (key, invert) => {
  if (invert) {
    if (typeof key === 'undefined') {
      return (a, b) => {
        if (typeof a === 'undefined' || isNaN(a)) {
          return false;
        }
        if (typeof b === 'undefined' || isNaN(b)) {
          return true;
        }

        return Number(a) < Number(b);
      };
    }
    return (a, b) => {
      if (typeof a[key] === 'undefined' || isNaN(a[key])) {
        return false;
      }
      if (typeof b[key] === 'undefined' || isNaN(b[key])) {
        return true;
      }

      return Number(a[key]) < Number(b[key]);
    };
  }
  if (typeof key === 'undefined') {
    return (a, b) => {
      if (typeof a === 'undefined' || isNaN(a)) {
        return true;
      }
      if (typeof b === 'undefined' || isNaN(b)) {
        return false;
      }

      return Number(a) > Number(b);
    };
  }
  return (a, b) => {
    if (typeof a[key] === 'undefined' || isNaN(a[key])) {
      return true;
    }
    if (typeof b[key] === 'undefined' || isNaN(b[key])) {
      return false;
    }

    return Number(a[key]) > Number(b[key]);
  };
};

// Adapted from https://codepen.io/znak/pen/aOvMOd
const canTextBeDarkForBg = (col) => {
  if (typeof col === 'string') {
    col = d3.rgb(col);
  }

  const C = [col.r / 255, col.g / 255, col.b / 255];

  for (let i = 0; i < 3; ++i) {
    if (C[i] <= 0.03928) {
      C[i] = C[i] / 12.92;
    } else {
      C[i] = Math.pow((C[i] + 0.055) / 1.055, 2.4);
    }
  }

  return (0.2126 * C[0]) + (0.7152 * C[1]) + (0.0722 * C[2]) > 0.179;
};

const normalise = (min, max) => (val) => {
  const a = 1 / (max - min);
  return (a * val) + -(a * min);
};

const strToRGBA = (str) => {
  const rgb = d3.rgb(str);
  return [rgb.r / 255, rgb.g / 255, rgb.b / 255, 1];
};

const paste = (array, sep = ' ') => {
  let returnString = '';

  let first = true;
  array.forEach((elem) => {
    if (elem !== '') {
      returnString += (first ? '' : sep) + elem;
      first = false;
    }
  });

  return returnString;
};

/* ------------------------------------------------------------------------------------------
 * X-AXIS
 * ------------------------------------------------------------------------------------------ */

let xAxis = null;
let xAxisScale = null;
let xAxisScaleT = null;
let xAxisG = null;

const setXAxisTicks = (mode = 'InDays') => {
  xAxis = d3.axisBottom(xAxisScale);

  xAxis.ticks(5)
    .tickSize(-height)
    .tickPadding(10);

  switch (mode) {
    case 'Date':
      xAxis.tickFormat(d3.timeFormat('%B %d, %Y'));
      break;
    case 'PercentVoyage':
      xAxis.tickFormat(d => `${d}%`);
      break;
    default:
      xAxis.tickFormat(d => `${d} days`);
      break;
  }

  if (xAxisG !== null) {
    xAxisG
      .call(xAxis.scale(xAxisScaleT));
  }
};

const setXAxisScaleByDay = (data) => {
  xAxisScale = d3.scaleLinear()
    .domain([
      d3.min(data, d => d.OnInDays),
      d3.max(data, d => d.OffInDays)
    ])
    .range([0, width]);

  xAxisScaleT = currentZoomTransformRescale(xAxisScale, 'x');

  setXAxisTicks('InDays');
};

const setXAxisScaleByPercentage = (data) => {
  xAxisScale = d3.scaleLinear()
    .domain([
      d3.min(data, d => d.OnPercentVoyage),
      d3.max(data, d => d.OffPercentVoyage)
    ])
    .range([0, width]);

  xAxisScaleT = currentZoomTransformRescale(xAxisScale, 'x');

  setXAxisTicks('PercentVoyage');
};

const setXAxisScaleByDate = (data) => {
  xAxisScale = d3.scaleTime()
    .domain([
      d3.min(data, d => d.OnDate),
      d3.max(data, d => d.OffDate)
    ])
    .range([0, width]);

  xAxisScaleT = currentZoomTransformRescale(xAxisScale, 'x');

  setXAxisTicks('Date');
};

const setXAxisScale = (data, mode) => {
  switch (mode) {
    case 'Date': {
      setXAxisScaleByDate(data);
      break;
    }
    case 'InDays': {
      setXAxisScaleByDay(data);
      break;
    }
    case 'PercentVoyage': {
      setXAxisScaleByPercentage(data);
      break;
    }
    default:
      break;
  }
};

let xAxisInitialised = false;
const initXAxisG = () => {
  if (!xAxisInitialised) {
    xAxisInitialised = true;

    xAxisG = overlaySvg.append('g')
      .attr('class', 'axis axis--x axis-no-line')
      .attr('transform', `translate(0,${height - xAxisMarginBottom})`)
      .call(xAxis);
  }
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
    acc[curr[yKey]] = {
      key: curr[yKey],
      value: 1,
      minX: curr[x1Key],
      maxX: curr[x2Key],
      rows: [curr]
    };
  } else {
    acc[curr[yKey]].value += 1;

    if (curr[x1Key] < acc[curr[yKey]].minX) {
      acc[curr[yKey]].minX = curr[x1Key];
    }

    if (curr[x2Key] > acc[curr[yKey]].maxX) {
      acc[curr[yKey]].maxX = curr[x2Key];
    }

    acc[curr[yKey]].rows.push(curr);
  }

  return acc;
}, {});

// Voyage Label _______________
const setYLabel = (yGroupBy, label, y, yBin, transition) => {
  const yGroupLabel = {};

  yGroupLabel.g = overlaySvg.append('g')
    .attr('class', 'voyage-label');

  yGroupLabel.line = yGroupLabel.g.append('line')
    .style('stroke', yAxisTickCol)
    .style('stroke-width', 1)
    .attr('y2', 0);

  yGroupLabel.text = yGroupLabel.g.append('text')
    .attr('opacity', 0)
    .attr('text-anchor', 'end')
    .style('fill', yAxisTickCol)
    .text((typeof sicklistCategoricalIdMap[yGroupBy] !== 'undefined') ?
      sicklistCategoricalIdMap[yGroupBy][label] : label)  ;

  yGroupLabel.hidden = false;

  const minXPosition = yAxisMarginLeft + (2 * yAxisLabelGroupXPadding);
  const minYPosition = xAxisMarginBottom;

  yGroupLabel.setPosition = (setPositionTransition = false) => {
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

    yGroupLabel.g
      .attr('transform', `translate(${xMinT - yAxisLabelGroupXPadding},${yT})`);

    if (yHeightT > 8) {
      if (yGroupLabel.hidden) {
        yGroupLabel.hidden = false;
        yGroupLabel.g
          .transition()
          .duration(defaultSickRowYtransitionDuration)
          .attr('opacity', 1);
      }

      if (setPositionTransition) {
        yGroupLabel.line
          .transition()
          .delay(defaultSickRowYtransitionDuration)
          .duration(defaultSickRowYtransitionDuration)
          .attr('y2', yHeightT);
      } else {
        yGroupLabel.line
          .attr('y2', yHeightT);
      }

      yGroupLabel.text
        .attr('font-size', `${10 + Math.min(yZoom * 6, 4)}px`)
        .attr('x', -5)
        .attr('y', 10)
        .attr('transform', 'rotate(0, -10, 5)');

      // Rotate text if label is against y-axis
      if (xMinT > minXPosition) {
        yGroupLabel.text
          .attr('transform', 'rotate(0, -10, 5)');
      } else {
        yGroupLabel.text
          .attr('transform', 'rotate(-90, -10, 5)');
      }
    } else if (!yGroupLabel.hidden) {
      yGroupLabel.hidden = true;
      yGroupLabel.g
        .transition()
        .duration(defaultSickRowYtransitionDuration)
        .attr('opacity', 0);
    }
  };

  yGroupLabel.remove = () => {
    yGroupLabel.g
      .transition()
      .duration(defaultSickRowYtransitionDuration)
      .attr('opacity', 0)
      .remove();

    yGroupLabel.line.transition()
      .duration(defaultSickRowYtransitionDuration)
      .attr('y2', 0)
      .remove();

    yGroupLabel.text.transition()
      .duration(defaultSickRowYtransitionDuration)
      .attr('font-size', 0)
      .remove();
  };

  yGroupLabel.setPosition(true);

  if (transition) {
    yGroupLabel.text.transition()
      .delay(defaultSickRowYtransitionDuration)
      .duration(defaultSickRowYtransitionDuration)
      .attr('opacity', 1);
  }

  return yGroupLabel;
};

function hideAllVoyageLabels() {
  d3.selectAll('.voyage-label')
    .transition()
    .duration(defaultSickRowYtransitionDuration)
    .attr('opacity', 0);
}

const yLabels = [];

const setYLabelAxis = (data, yGroupBy, yGroupByType, x1Key, x2Key, transition = false) => {
  yLabels.forEach(label => label.remove());

  if (yGroupBy === '') {
    return false;
  }

  const yBins = countYBins(data, yGroupBy, x1Key, x2Key);

  const yBinKeys = Object.keys(yBins);

  const comparator = getComparator(yGroupByType);
  stable.inplace(yBinKeys, comparator);

  yAxisScale = d3.scaleLinear()
    .domain([0, (data.length + (yBinKeys.length * yAxisLabelGroupYPadding))])
    .range([0, (data.length + (yBinKeys.length * yAxisLabelGroupYPadding)) * defaultSickRowHeight]);

  yAxisScaleT = currentZoomTransformRescale(yAxisScale, 'y');

  let index = 0;
  yBinKeys.forEach((key) => {
    let count = index * yAxisLabelGroupYPadding;
    yBinKeys.forEach((previousKey) => {
      if (comparator(key, previousKey)) {
        count += yBins[previousKey].value;
      }
    });

    if (key !== '' && key !== 'undefined' && key != null) {
      yLabels.push(setYLabel(yGroupBy, key, count, yBins[key], transition));
    }
    index += 1;
  });

  return true;
};

const showDensity = false;
const setYDensityAxis = (data, yKey) => {
  if (showDensity) {
    const yValues = [];

    data.forEach((row) => {
      if (!isNaN(row[yKey])) {
        yValues.push(row[yKey]);
      }
    });

    // KDE adapted from https://github.com/jasondavies/science.js/blob/master/examples/kde/kde.js
    const kde = science.stats.kde()
      .sample(yValues);

    const kdeX = d3.scaleLinear()
      .domain([0, 0.1])
      .range([yAxisMarginLeft, yAxisMarginLeft + yAxisWidth]);
    const kdeY = d3.scaleLinear()
      .domain([0, 100])
      .range([xAxisMarginBottom, height - xAxisMarginBottom]);

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
  }
};

const removeYDensityAxis = () => {
  overlaySvg.select('path.y-axis-density')
    .transition()
    .delay(defaultSickRowYtransitionDuration)
    .remove();
};

let densityTimeout = null;
const setYAxis = (data, ySortBy, yGroupBy) => {
  if (yGroupBy !== '') {
    removeYDensityAxis();
  } else {
    removeYDensityAxis();

    if (densityTimeout !== null) {
      clearTimeout(densityTimeout);
    }

    yAxisScale = d3.scaleLinear()
      .domain([0, data.length])
      .range([0, data.length * defaultSickRowHeight]);

    yAxisScaleT = currentZoomTransformRescale(yAxisScale, 'y');

    densityTimeout = setTimeout(() => setYDensityAxis(data, ySortBy), 1500);
  }
};

let yAxisInitialised = false;
const initYAxisG = () => {
  if (!yAxisInitialised) {
    yAxisInitialised = true;

    yAxisG = overlaySvg.append('g')
      .attr('class', 'axis axis--y axis-no-line')
      .attr('transform', `translate(${yAxisMarginLeft},0)`);
  }
};

/* ------------------------------------------------------------------------------------------
 * MAIN SICKLIST FUNCTION
 * ------------------------------------------------------------------------------------------ */

const sicklistDataTypes = {
  'Status.Code': 'CategoricalId',
  ShipWithYear: 'Categorical',
  Died: 'Categorical',
  Quality: 'Categorical',
  'Disease.1.Code': 'CategoricalId',
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
  AgeInYears: 'Numerical',
  AgeInYearsInt: 'Numerical',
  Crime_SentenceCat: 'Numerical',
  LiteracyReadCat: 'Categorical',
  LiteracyWriteCat: 'Categorical',
  PriorConvictionCount: 'Numerical',
  NP_GridRefCode: 'Categorical',
  Trial_PlaceGridRef: 'Categorical',
  'Occupation.code': 'CategoricalId',
  NP_Town: 'Categorical',
  NP_CountyState: 'Categorical',
  NP_Country: 'Categorical',
  Trial_PlaceCourt: 'Categorical',
  Trial_PlaceLocation: 'Categorical',
  Trial_PlaceCountry: 'Categorical',
  'Coutry.of.Departure': 'CategoricalId'
};

const sicklistFilters = ['Died', 'Gender', 'AgeInYearsInt', 'ShipWithYear', 'Disease.1.Code', 'Convict', 'Status.Code'];

const sicklistConvictFilters = ['Crime_SentenceCat', 'Occupation.code', 'LiteracyReadCat', 'LiteracyWriteCat',
  'PriorConvictionCount', 'NP_Country'];

const diseaseMap = {
  1: 'Accident',
  2: 'Convulsions and teething',
  3: 'Debility and marasmus',
  4: 'Diarrhoea and dysentery',
  5: 'Diseases of the blood and blood forming organs',
  6: 'Diseases of the circulatory system',
  7: 'Diseases of the digestive system',
  8: 'Diseases of the eye and ear',
  9: 'Diseases of the genitourinary system',
  10: 'Diseases of the musculoskeletal system',
  11: 'Diseases of the nervous system',
  12: 'Diseases of the respiratory system',
  13: 'Diseases of the skin and subcutaneous tissue',
  14: 'Endocrine, deficiency and metabolic disorders',
  15: 'Influenza',
  16: 'Malingering',
  17: 'Measles',
  18: 'Mental and behavioural disorders',
  19: 'Nausea',
  20: 'Neoplasm',
  21: 'Old age and decay',
  22: 'Other fever',
  23: 'Other infectious diseases',
  24: 'Other tuberculosis',
  25: 'Paralysis',
  26: 'Parasitic disease',
  27: 'Pregnancy, childbirth and the puerperium',
  28: 'Respiratory tuberculosis',
  29: 'Scarlet fever',
  30: 'Sexually transmitted diseases',
  31: 'Suicide',
  32: 'Unclassifiable',
  33: 'Unknown',
  34: 'Unspecified natural causes',
  35: 'Vaccinated',
  36: 'Whooping cough'
};
const sicklistCategoricalIdMap = {
  Gender: {
    1: 'Male',
    2: 'Female'
  },
  'Occupation.code': {
    1: 'White‐collar',
    2: 'Retail',
    3: 'Food and drink preparation',
    4: 'Construction',
    5: 'Worker in wood',
    6: 'Worker in metal',
    7: 'Worker in leather',
    8: 'Agricultural worker',
    9: 'Labourer and unskilled',
    10: 'Maritime',
    11: 'Domestic Service',
    13: 'Other trades',
    14: 'Textiles',
    15: 'Military service',
    16: 'Mining and quarrying',
    17: 'Land transport',
    18: 'Printing and associated trades',
    19: 'Clothing manufacturing',
    20: 'Jewellers and watchmakers',
    21: 'Errand boys'
  },
  'Disease.1.Code': diseaseMap,
  'Disease.2.Code': diseaseMap,
  'Status.Code': {
    1: 'Convict',
    2: 'Member of the ship’s crew including the surgeon superintendent',
    3: 'Member of the military detachment including officers',
    4: 'Soldier or officer’s wife',
    5: 'Soldier or officer’s child',
    6: 'Convict’s child',
    7: 'Other passenger',
    8: 'Other passenger’s child',

    10: 'Status unknown',
    11: 'No data'
  },
  'Coutry.of.Departure': {
    1: 'England',
    2: 'Ireland',
    3: 'Bermuda'
  }
};

const initSicklist = (shipyearsData, sicklistData) => {
  /* ------------------------------------------------------------------------------------------
  * SETUP DATA
  * ------------------------------------------------------------------------------------------ */
  const allSicklistData = sicklistData;

  allSicklistData.forEach((d) => {
    d.OnDate = dateParser(d.OnDate);
    d.OffDate = dateParser(d.OffDate);

    d.Convict = d.ConvictId !== '';
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
   * ZOOMING - X-AXIS
   * PANNING - Y and X Axis
   *   - Handled by scrolling and limited touch support
   * ------------------------------------------------------------------------------------------ */
  const touchEvts = new TouchEvts(
    svg.node(),
    currentZoomTransform,
    onPanOrZoom
  );

  function setZoomMaxExtent(xKey, xStartKey, xEndKey) {
    const maxX = xAxisScale(d3.max(visibleSicklistData, d => d[xEndKey])); //= width
    const minX = -maxX; // =-width
    const maxY = height;

    let minY;
    if (yAxisScale === null) {
      minY = -d3.max(visibleSicklistData, d => d.index) * defaultSickRowHeight;
    } else {
      minY = -yAxisScale.range()[1];
    }

    if (touchEvts.maxExtent.y[0] !== 0) {
      // const dky = minY / touchEvts.maxExtent.y[0];
      // touchEvts.currentTransform.ky /= dky;
      // currentZoomTransform.ky /= dky;
      // touchEvts.transformUpdated();
    }

    switch (xKey) {
      case 'Date': {
        touchEvts.maxExtent = {
          kx: [0.67, 2000],
          ky: [1 / 1000, 5]
        };
        break;
      }
      case 'PercentVoyage':
      case 'InDays': {
        touchEvts.maxExtent = {
          kx: [0.67, 100],
          ky: [1 / 1000, 5]
        };
        break;
      }
      default:
        break;
    }

    touchEvts.maxExtent.x = [minX, maxX];
    touchEvts.maxExtent.y = [minY, maxY];
  }

  function onPanOrZoom(transform) {
    currentZoomTransform = transform;

    xAxisScaleT = currentZoomTransformRescale(xAxisScale, 'x');
    yAxisScaleT = currentZoomTransformRescale(yAxisScale, 'y');

    xAxisG
      .call(xAxis.scale(xAxisScaleT));

    yLabels.forEach(label => label.setPosition());

    rectangleOverlays.setRectLabel(xAxisStartKey, xAxisEndKey, currentZoomTransform, xAxisScaleT);

    rectangles.updatePanZoom(currentZoomTransform);
    rectangles.requestRender();
  }

  /* ------------------------------------------------------------------------------------------
  * SET DEFAULTS, AXIS and RENDER RECTANGLES
  * ------------------------------------------------------------------------------------------ */

  let visibleSicklistData = allSicklistData;

  let xAxisMode = 'InDays';
  let xStartKey = 'OnInDays';
  let xEndKey = 'OffInDays';
  let xAxisStartKey = 'OnInDays';
  let xAxisEndKey = 'OffInDays';

  let currentSortBy = 'OnInDays';
  let currentGroupBy = '';

  let currentColourString = 'Died';
  let currentColourSchemeString = 'interpolateReds';
  let currentColourSchemeInvert = false;

  let currentAnimateInvert = false;
  let currentAnimationKey = '';

  let currentMinOpacity = 0;

  const rectangles = new Rectangles(allSicklistData, visibleSicklistData);
  const rectangleOverlays = new RectangleOverlays(allSicklistData, visibleSicklistData, touchEvts);

  setXAxisScale(visibleSicklistData, xAxisMode);
  initXAxisG();
  setYAxis(visibleSicklistData, currentSortBy, currentGroupBy);
  initYAxisG();
  setYLabelAxis(visibleSicklistData, currentGroupBy, sicklistDataTypes[currentGroupBy], xAxisStartKey, xAxisEndKey, true);

  rectangleOverlays.hideAllRectLabels();
  rectangleOverlays.setRectLabel(xAxisStartKey, xAxisEndKey, currentZoomTransform, xAxisScaleT);

  rectangles.setRectXPoints(xStartKey, xEndKey);
  rectangles.setRectYPoints(currentSortBy, currentGroupBy, sicklistDataTypes[currentGroupBy]);

  rectangles.setColourScale(currentColourString, currentColourSchemeString, currentColourSchemeInvert);
  rectangles.setMinOpacity(currentMinOpacity);

  rectangles.setAnimationIndex(currentAnimationKey, currentAnimateInvert, sicklistDataTypes[currentAnimationKey]);

  rectangles.requestRender();

  setZoomMaxExtent(xAxisMode, xStartKey, xEndKey);

  /* ------------------------------------------------------------------------------------------
   * UI EVENT HANDLING
   * X-AXIS SELECTION, SORTING, GROUPING and FILTERING
   *   - Sort by ...
   *   - Group by:  Voyage or None
   *   - Filter: None or Deaths
   * ------------------------------------------------------------------------------------------ */

  /* ------------------------------------------------------------------------------------------
  * SORTING
  * ------------------------------------------------------------------------------------------ */
  $('#sortSelect')
    .change(() => {
      setYSortBy($('#sortSelect')
        .val());
      applyTransitions('sortBySelected');
    });

  $('#groupSelect')
    .change(() => {
      setYGroupBy($('#groupSelect')
        .val());
      applyTransitions('groupBySelected');
    });

  const setYGroupBy = (groupBy = currentGroupBy) => {
    if (groupBy !== currentGroupBy) {
      currentGroupBy = groupBy;
    }
  };

  let oldSortString = 'On';
  const setYSortBy = (sortString = oldSortString) => {
    oldSortString = sortString;
    let newSortString = '';

    if (sortString === 'On' || sortString === 'Off' || sortString === 'Total') {
      if (xAxisMode === 'Date') {
        // `TotalDate` field doesn't exist -> so use TotalInDays
        if (sortString === 'Total') {
          newSortString = 'TotalInDays';
          // All other Date fields need 'Num' appended (i.e. OnDateNum)
        } else {
          newSortString = `${sortString}DateNum`;
        }
      } else {
        newSortString = sortString + xAxisMode;
      }
    } else {
      newSortString = sortString;
    }

    if (currentSortBy !== newSortString) {
      currentSortBy = newSortString;
    }
  };


  /* ------------------------------------------------------------------------------------------
  * COLOUR SELECTION
  * ------------------------------------------------------------------------------------------ */
  $('#colourSelect')
    .change(() => {
      setColourString($('#colourSelect').val());

      rectangles.setColourScale(currentColourString, currentColourSchemeString, currentColourSchemeInvert);
      rectangles.requestRender();

      rectangleOverlays.hideAllRectLabels();
      rectangleOverlays.setRectLabel(xAxisStartKey, xAxisEndKey, currentZoomTransform, xAxisScaleT);
    });

  let oldColourString = currentColourString;
  const setColourString = (colourString = oldColourString) => {
    oldColourString = colourString;
    let newColourString = '';

    if (colourString === 'On' || colourString === 'Off' || colourString === 'Total') {
      if (xAxisMode === 'Date') {
        // `TotalDate` field doesn't exist -> so use TotalInDays
        if (colourString === 'Total') {
          newColourString = 'TotalInDays';
          // All other Date fields need 'Num' appended (i.e. OnDateNum)
        } else {
          newColourString = `${colourString}Date`;
        }
      } else {
        newColourString = colourString + xAxisMode;
      }
    } else {
      newColourString = colourString;
    }

    if (currentColourString !== newColourString) {
      currentColourString = newColourString;
    }
  };

  $('#colourSchemeSelect')
    .change(() => {
      currentColourSchemeString = $('#colourSchemeSelect').val();

      rectangles.setColourScale(currentColourString, currentColourSchemeString, currentColourSchemeInvert);
      rectangles.requestRender();

      rectangleOverlays.hideAllRectLabels();
      rectangleOverlays.setRectLabel(xAxisStartKey, xAxisEndKey, currentZoomTransform, xAxisScaleT);
    });

  $('#colourSchemeInvert')
    .click((evt) => {
      currentColourSchemeInvert = $('#colourSchemeInvert')
        .is(':checked');

      rectangles.setColourScale(currentColourString, currentColourSchemeString, currentColourSchemeInvert);
      rectangles.requestRender();

      rectangleOverlays.hideAllRectLabels();
      rectangleOverlays.setRectLabel(xAxisStartKey, xAxisEndKey, currentZoomTransform, xAxisScaleT);
    });

  $('#opacitySlider')
    .change(() => {
      currentMinOpacity = $('#opacitySlider').val() / 100;
      rectangles.setMinOpacity(currentMinOpacity);
      rectangles.requestRender();
    });

  $('#animateSelect')
    .change(() => {
      currentAnimationKey = $('#animateSelect').val();
      rectangles.setAnimationIndex(currentAnimationKey, currentAnimateInvert, sicklistDataTypes[currentAnimationKey]);
    });

  $('#animateInvert')
    .click((evt) => {
      currentAnimateInvert = $('#animateInvert').is(':checked');

      rectangles.setAnimationIndex(currentAnimationKey, currentAnimateInvert, sicklistDataTypes[currentAnimationKey]);
    });


  /* ------------------------------------------------------------------------------------------
  * XAXIS MODE SELECTION
  * ------------------------------------------------------------------------------------------ */

  $('input[name=\'xAxis\']')
    .change((evt) => {
      xAxisMode = evt.currentTarget.value;

      switch (xAxisMode) {
        case 'Date': {
          xStartKey = 'OnDateNum';
          xEndKey = 'OffDateNum';
          xAxisStartKey = 'OnDate';
          xAxisEndKey = 'OffDate';

          break;
        }
        case 'InDays': {
          xStartKey = 'OnInDays';
          xEndKey = 'OffInDays';
          xAxisStartKey = 'OnInDays';
          xAxisEndKey = 'OffInDays';

          break;
        }
        case 'PercentVoyage': {
          xStartKey = 'OnPercentVoyage';
          xEndKey = 'OffPercentVoyage';
          xAxisStartKey = 'OnPercentVoyage';
          xAxisEndKey = 'OffPercentVoyage';

          break;
        }
        default:
          break;
      }

      setXAxisScale(allSicklistData, xAxisMode);

      setZoomMaxExtent(xAxisMode, xStartKey, xEndKey);

      setYSortBy();
      setYGroupBy();

      applyTransitions('xAxisModeSelected');
    });

  const applyTransitions = (action = '') => {
    const callback = () => {
      rectangleOverlays.setRectLabel(xAxisStartKey, xAxisEndKey, currentZoomTransform, xAxisScaleT);
    };

    rectangles.transition(
      action, xStartKey, xEndKey, xAxisStartKey, xAxisEndKey,
      currentZoomTransform, xAxisScaleT,
      currentSortBy, currentGroupBy, sicklistDataTypes[currentGroupBy],
      currentColourString, currentColourSchemeString, currentColourSchemeInvert,
      callback
    );

    rectangleOverlays.hideAllRectLabels();
    setYAxis(visibleSicklistData, currentSortBy, currentGroupBy);
    if (action !== 'sortBySelected') {
      setYLabelAxis(visibleSicklistData, currentGroupBy, sicklistDataTypes[currentGroupBy], xAxisStartKey, xAxisEndKey, true);
      setZoomMaxExtent(xAxisMode, xStartKey, xEndKey);
    }
  };

  /* ------------------------------------------------------------------------------------------
  * FILTER SELECTION
  * ------------------------------------------------------------------------------------------ */
  let activeFilters = {};

  $('#filterShowBtn')
    .click(() => {
      showFilterOverlay();
    });

  $('#filterHideBtn')
    .click(() => {
      hideFilterOverlay();
    });

  $('#filterClearBtn')
    .click(() => {
      clearFilters();
    });

  function showFilterOverlay() {
    filterOverlay
      .style('display', 'block')
      .transition()
      .duration(defaultUiTransitionDuration)
      .style('opacity', '1');
  }

  function hideFilterOverlay() {
    filterOverlay.transition()
      .duration(defaultUiTransitionDuration)
      .style('opacity', '0')
      .on('end', () => filterOverlay.style('display', 'none'));
  }

  /* ------------------------------------------------------------------------------------------
  * FILTER GROUP GENERATION
  * ------------------------------------------------------------------------------------------ */
  const filterGroups = {};
  function createFilterGroup(currentFilter) {
    const yBins = countYBins(visibleSicklistData, currentFilter, 'OnInDays', 'OffInDays');
    const filterValues = Object.values(yBins);

    // if (sicklistDataTypes[currentFilter] === 'CategoricalId') {
    //   stable.inplace(filterValues, getComparator(sicklistDataTypes[currentFilter], 'value'));
    // } else {
    stable.inplace(filterValues, getComparator(sicklistDataTypes[currentFilter], 'key'));
    // }

    if (filterValues.length > 1) {
      const filterGroupDiv = filterOverlay
        .append('div')
        .attr('class', 'filterGroup')
        .classed('filterGroupHidden', true)
        .attr('id', `filter-group-${currentFilter}`);

      filterGroupDiv
        .append('a')
        .classed('filterGroupTitle', true)
        .html(currentFilter)
        .on('click', () => {
          const hide = !filterGroupDiv.classed('filterGroupHidden');
          filterGroupDiv.classed('filterGroupHidden', hide);

          if (hide) {
            filterGroupDiv
              .selectAll('a.filterGroupItem')
              .style('display', 'none');
          } else {
            filterGroupDiv
              .selectAll('a.filterGroupItem')
              .style('display', 'block');
          }
        });

      filterGroupDiv
        .selectAll('a.filterGroupItem')
        .data(filterValues, d => d.id)
        .enter()
        .append('a')
        .style('display', 'none')
        .classed('filterGroupItem', true)
        .classed('selected', true)
        .html(d => `<span class="filterGroupItemNumber">${d.value}</span>${
          (d.key !== '') ?
            ((typeof sicklistCategoricalIdMap[currentFilter] !== 'undefined') ?
              sicklistCategoricalIdMap[currentFilter][d.key] : d.key)
            : 'Undefined'
        }`)
        .on('mouseover', filterItemMouseOver(currentFilter))
        .on('mouseout', filterItemMouseOut(currentFilter))
        .on('click', filterItemClick(currentFilter));

      filterGroups[currentFilter] = filterGroupDiv;
    }
  }

  function filterItemMouseOver(currentFilter) {
    return (d, i) => {
      visibleSicklistData.forEach(row => row.opacity = 0.015);
      d.rows.forEach(row => row.opacity = 1);
      rectangles.visibleData = visibleSicklistData;

      rectangles.requestRender();

      rectangleOverlays.setRectLabel(xAxisStartKey, xAxisEndKey, currentZoomTransform, xAxisScaleT);
    };
  }

  function filterItemMouseOut(currentFilter) {
    return (d, i) => {
      visibleSicklistData.forEach(row => row.opacity = 1);
      rectangles.visibleData = visibleSicklistData;

      rectangles.requestRender();

      rectangleOverlays.setRectLabel(xAxisStartKey, xAxisEndKey, currentZoomTransform, xAxisScaleT);
    };
  }

  function filterItemClick(currentFilter) {
    return (d, i) => {
      activeFilters[currentFilter] = d.key;

      visibleSicklistData = d.rows;
      rectangles.visibleData = visibleSicklistData;
      rectangleOverlays.visibleData = visibleSicklistData;

      setupFilters();
      applyTransitions('filter');
    };
  }

  function clearFilters() {
    activeFilters = {};
    visibleSicklistData = allSicklistData;
    rectangles.visibleData = visibleSicklistData;
    rectangleOverlays.visibleData = visibleSicklistData;

    setupFilters();
    applyTransitions('filter');
  }

  function setupFilters() {
    filterOverlay
      .selectAll('div.filterGroup').remove();
    sicklistFilters.forEach(currentFilter => createFilterGroup(currentFilter));

    if ('Convict' in activeFilters && activeFilters.Convict) {
      sicklistConvictFilters.forEach(currentFilter => createFilterGroup(currentFilter));
    }
  }

  setupFilters();
};

/* ------------------------------------------------------------------------------------------
  * STARTUP SCRIPT
  *  - Fetch JSON
  * ------------------------------------------------------------------------------------------ */
axios.get('/data/shipyear.stats.json')
  .then((shipYearStats) => {
    // Get sicklist data
    axios.get('/data/sicklist.merged.json')
      .then((sickList) => {
        initSicklist(shipYearStats.data, sickList.data);
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
  *  - Pre calculate densities (or wipe out - only good for totals and age
  *  - Add densities for group by
  *  - Add densities for xAxis
  *  - Make densities use WebWorker
  *
  *  - Clip yGroupLabel when rotated
  *
  *  - add categoricalid maps to rectagnle overlays
  *
  *  - Add voyage information? (voyage start / end) NAH
  *
  *  - Add static gap between voyages? - NAH
  *
  *  - oN FILTER - change axis min/max - change zoom transform to keep size constant - NAH
  * ------------------------------------------------------------------------------------------ */
