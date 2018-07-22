// Get our canvas element
const canvas = document.getElementById('main-canvas');

const pixelRatio = window.devicePixelRatio;
const width = 3000 / pixelRatio;
const height = 2000 / pixelRatio;

const defaultSickRowHeight = 10;
const defaultSickRowPaddingRatio = 1 - 0.25;
const defaultVoyageVertPadding = 100;

// Create a WebGL 2D platform on the canvas:
const platform = Stardust.platform('webgl-2d', canvas, width, height);

const dateParser = d3.timeParse('%Y-%m-%d %H:%M:%S');

// Declare SVG element for D3
const svg = d3.select('svg')
  .style('border', '0px solid');

const initSicklist = (shipyearsData, sicklistData) => {
  const allSicklistData = [];
  const sicklistDataByVoyage = [];
  // shipyearsData.length
  for (let i = 0; i < shipyearsData.length; i += 1) {
    const currentSicklistVoyage = sicklistData.filter(d => d.ShipWithYear === shipyearsData[i].ShipWithYear);

    sicklistDataByVoyage[shipyearsData[i].ShipWithYear] = currentSicklistVoyage;

    allSicklistData.push(...currentSicklistVoyage);

    if (currentSicklistVoyage.length === 0) {
      console.log(`${shipyearsData[i].ShipWithYear} is empty`);
    }
  }

  allSicklistData.forEach(d => d.OnDate = dateParser(d.OnDate));
  allSicklistData.forEach(d => d.OffDate = dateParser(d.OffDate));

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
  });

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
        
        tx: float, ty: float, skewing: float
    ) {
    
        x = mix(x, xSecondary, quinticEaseInOut(clamp01(tx*2 - (skewing * index)/maxIndex)));
        y = mix(y, ySecondary, quinticEaseInOut(clamp01(ty*2 - (skewing * index)/maxIndex)));
        
        // Zoom + Pan
        x = x * zoom.x + Vector2(pan.x, pan.x);
        y = y * zoom.y + Vector2(pan.y, pan.y);
    
        emit [
            { position: Vector2(x.x, y.x), color: color },
            { position: Vector2(x.y, y.x), color: color },
            { position: Vector2(x.y, y.y), color: color }
        ];
        emit [
            { position: Vector2(x.x, y.x), color: color },
            { position: Vector2(x.x, y.y), color: color },
            { position: Vector2(x.y, y.y), color: color }
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
    .attr('skewing', 1);

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

  // Set X scale to normalise x values to width of screne
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

  const yScaleSecondary = Stardust.scale.custom(`
    Vector2(
      value * rowHeight, 
      (value + rowPadding) * rowHeight
    )
  `);

  function setYScale(scale) {
    scale
      .attr('rowHeight', defaultSickRowHeight)
      .attr('rowPadding', defaultSickRowPaddingRatio);
  }

  setYScale(yScalePrimary);
  setYScale(yScaleSecondary);

  function setRectXPoints(xScale, xStartKey, xEndKey, attrAddString = '') {
    setXScale(xScale, xStartKey, xEndKey);

    const maxYIndex = d3.max(allSicklistData, d => d.index);

    rectangles
      .attr(`x${attrAddString}`, xScale());
  }

  let ySortKey = '';

  function setRectYPoints(yScale, yKey, attrAddString = '') {
    if (yKey !== ySortKey) {
      ySortKey = yKey;
      stable.inplace(allSicklistData, (a, b) => a[yKey] > b[yKey]);
    }

    allSicklistData.forEach(row => row[`index${attrAddString}`] = allSicklistData.indexOf(row));

    rectangles
      .attr(`index${attrAddString}`, d => d[`index${attrAddString}`])
      .attr(`maxIndex${attrAddString}`, d3.max(allSicklistData, d => d[`index${attrAddString}`]))
      .attr(`y${attrAddString}`, yScale(d => d[`index${attrAddString}`]));
  }

  setRectXPoints(xScalePrimary, 'OnInDays', 'OffInDays');
  setRectYPoints(yScalePrimary, 'OnInDays');

  // COLOR!!

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
    platform.clear([0.06, 0.06, 0.06, 1]);

    rectangles.render();
  }

  requestRender();

  /* ------------------------------------------------------------------------------------------
   * ZOOMING - X-AXIS
   * PANNING - Y and X Axis
   *   - Handled by scrolling and limited touch support
   * ------------------------------------------------------------------------------------------ */
  const defaultZoom = d3.xyzoomIdentity;
  let currentZoomTransform = defaultZoom;

  function setupZoom(maxY = height * 2, transition = true) {
    const xZoom = d3.xyzoom()
      .extent([[0, 0], [width, height]])
      .scaleExtent([[1, 50], [0, 1]])
      // .translateExtent([[0, 0], [width, maxY]])
      .on('zoom', onZoom);

    svg.call(xZoom);
  }

  function onZoom() {
    // https://github.com/d3/d3-zoom/issues/48

    // https://jsfiddle.net/DaWa/dLmp8zk8/2/

    // USE ANOTHER LIBRARY TO CONVERT MOUSE/TOUCH EVENTS TO ZOOM/PAN TRANSLATE

    // console.log(d3.touches(this));

    currentZoomTransform = d3.zoomTransform(this);
    // const modifiedTransform = d3.zoomIdentity.scale(currentZoomTransform.kx, currentZoomTransform.ky).translate(currentZoomTransform.x, currentZoomTransform.y);

    // console.log(`translate(${currentZoomTransform.x},${currentZoomTransform.y
    // }) scale(${currentZoomTransform.kx},${currentZoomTransform.ky})`);

    // xScaleCustom
    //   .attr('panX', currentZoomTransform.x)
    //   .attr('zoomX', currentZoomTransform.kx);

    rectangles
      .attr('pan', [currentZoomTransform.x, currentZoomTransform.y])
      .attr('zoom', [currentZoomTransform.kx, currentZoomTransform.ky]);

    // As zoom out - reduce row padding
    if (currentZoomTransform.ky < 1) {
      yScalePrimary.attr('rowPadding', 1 - ((1 - defaultSickRowPaddingRatio) * currentZoomTransform.ky));
      yScaleSecondary.attr('rowPadding', 1 - ((1 - defaultSickRowPaddingRatio) * currentZoomTransform.ky));
    }

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
  let currentGroupBy = 'voyage';
  let currentSortString = 'OnInDays';

  let currentColourString = 'Died';
  let currentColourSchemeString = 'interpolateReds';
  let currentColourSchemeInvert = false;

  setColourScale();

  let currentFilterBy = null;

  let yTransitionInProgress = false;

  $('#sortSelect')
    .change(() => {
      currentSortString = '';
      $('#sortSelect')
        .find('option:selected')
        .each(function () {
          currentSortString += $(this).text();
        });

      const transition = () => {
        beginTransition((t) => {
          rectangles.attr('ty', t);
          requestRender();
        }, () => {
          // On finish transition - set original "xScaleCustom" scale to xScaleCustomInterpolateTo
          setRectYPoints(yScalePrimary, currentSortString);
          rectangles.attr('ty', 0);
          requestRender();

          yTransitionInProgress = false;

          // Time for animation
        }, 1.5);
      };

      if (!yTransitionInProgress) {
        setRectYPoints(yScaleSecondary, currentSortString, 'Secondary');

        yTransitionInProgress = true;

        transition();
      }
    });

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


  // CHANGE GROUP BY
  $('input[name=\'groupBy\']')
    .change((evt) => {
      currentGroupBy = evt.currentTarget.value;
      applySortingWithGrouping();
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


  function applySortingWithGrouping(transition = true) {
    switch (currentGroupBy) {
      case 'voyage':

        break;
      case 'none':

        break;
      default:
        break;
    }
  }

  // X-AXIS MODES:
  // - By Day
  // - By % Voyage Elapsed
  // - By Date

  let currentXkey = 'byDay';
  let xStartKey = 'OffInDays';
  let xEndKey = 'OnInDays';

  let xTransitionInProgress = false;


  $('input[name=\'xAxis\']')
    .change((evt) => {
      const xAxisMode = evt.currentTarget.value;

      switch (xAxisMode) {
        case 'date': {
          currentXkey = 'byDate';
          xStartKey = 'OnDateNum';
          xEndKey = 'OffDateNum';

          break;
        }
        case 'day': {
          currentXkey = 'byDay';
          xStartKey = 'OnInDays';
          xEndKey = 'OffInDays';

          break;
        }
        case 'percent': {
          currentXkey = 'byPercent';
          xStartKey = 'OnPercentVoyage';
          xEndKey = 'OffPercentVoyage';


          break;
        }
        default:
          break;
      }

      const transition = () => {
        beginTransition((t) => {
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
    });


  // Adapted from https://github.com/stardustjs/stardust-examples/blob/master/examples/isotype/index.html
  let _previousTransition = null;

  function beginTransition(func, finishedFunc, maxTime) {
    if (_previousTransition) _previousTransition.stop();
    _previousTransition = null;
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
    _previousTransition = {
      stop() {
        if (req != null) cancelAnimationFrame(rerender);
      }
    };
    return _previousTransition;
  }
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
  })
  .catch((error) => {
    console.log(error);
  });


/* ------------------------------------------------------------------------------------------
  * TODO:
  *  - Use convict IDS to display multiple entries per row
  *  - Fix zooming (make x and y independent) - look for other libraries
  *  - Add Group by voyage
  *  - Add animation field (i.e. Sex = M=0, F=1 for index or something)(1
  * ------------------------------------------------------------------------------------------ */
