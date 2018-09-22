let renderRequested = false;

class Rectangles {
  constructor(allData, _visibleData) {
    this.allData = allData;
    this._visibleData = _visibleData;

    /* ----------------------------------------------------------------------------------------
      * SETUP MARK
      * --------------------------------------------------------------------------------------- */

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
            pixelRatio:float,
            index: float,
            maxIndex: float,
            animationIndex: float,
            animationMaxIndex: float,
            x: Vector2 = [ 0, 0 ],
            y: Vector2 = [ 0, 0 ],
            xSecondary: Vector2 = [ 0, 0 ],
            ySecondary: Vector2 = [ 0, 0 ],
            colour: Color = [ 0, 0, 0, 1 ],
            opacity: float = 1,
            minOpacity: float = 1,
            
            defaultSickRowPaddingRatio: float,
            tx: float, ty: float, skewing: float
        ) { 
            x = mix(x, xSecondary, quinticEaseInOut(clamp01(tx*2 - (skewing * animationIndex)/animationMaxIndex)));
            y = mix(y, ySecondary, quinticEaseInOut(clamp01(ty*2 - (skewing * animationIndex)/animationMaxIndex)));
            
            // Zoom + Pan
            x = x * zoom.x + Vector2(pan.x, pan.x);
            y = y * zoom.y + Vector2(pan.y, pan.y);
            
            // Reduce opacity as bars get smaller
            let newOpacity = clamp01(max((pixelRatio*(y.y - y.x) + defaultSickRowPaddingRatio), minOpacity)) *opacity;
            
            // Note: all pixel values are twice the half the actual value -> 0.5 is actually 1 pixel width
            if (y.y - y.x + defaultSickRowPaddingRatio/pixelRatio < 1/pixelRatio) {
              y = Vector2(y.x, y.x + 1/pixelRatio);
            }
            
            // Minimum width = current height of row
            if (x.y - x.x < y.y - y.x) {
              x = Vector2(x.x, x.x + y.y - y.x);
            }
            
            let col = Color(colour.r, colour.g, colour.b, newOpacity);
        
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

    this.marks = Stardust.mark.create(rectangleCustomSpec.RectangleXY, platform);

    this.marks
      .attr('pixelRatio', pixelRatio)
      .attr('pan', [0, 0])
      .attr('zoom', [1, 1])
      .attr('tx', 0)
      .attr('ty', 0)
      .attr('skewing', 1)
      .attr('defaultSickRowPaddingRatio', defaultSickRowPaddingRatio)
      .attr('minOpacity', 1);

    this.marks.data(allData);

    this.xScalePrimary = Stardust.scale.custom(`
      Vector2(
        (a * xStartValue) + b, 
        (a * xEndValue) + b
      )
      `);

    this.xScaleSecondary = Stardust.scale.custom(`
      Vector2(
        (a * xStartValue) + b, 
        (a * xEndValue) + b
      )
      `);

    // Set y scale to normalise y values to width of screen and add padding between each row
    this.yScalePrimary = Stardust.scale.custom(`
    Vector2(
      value * rowHeight, 
      (value + rowPadding) * rowHeight
    )
  `);

    this.yScaleSecondary = Stardust.scale.custom(`
    Vector2(
      value * rowHeight, 
      (value + rowPadding) * rowHeight
    )
  `);

    this.setYScale(this.yScalePrimary);
    this.setYScale(this.yScaleSecondary);

    this.transitionInProgress = false;
  }

  set visibleData(data) {
    this._visibleData = data;
    this.marks.attr('opacity', d => d.opacity);
  }


  // Set X scale to normalise x values to width of screen
  setXScale(scale, xStartKey, xEndKey) {
    const domainMin = d3.min(this.allData, d => d[xStartKey]);
    const domainMax = d3.max(this.allData, d => d[xEndKey]);

    const a = (width) / (domainMax - domainMin);

    scale
      .attr('a', a)
      .attr('b', -(a * domainMin));

    scale
      .attr('xStartValue', d => d[xStartKey])
      .attr('xEndValue', d => d[xEndKey]);
  }


  setYScale(scale) {
    scale
      .attr('rowHeight', defaultSickRowHeight)
      .attr('rowPadding', defaultSickRowInversePaddingRatio);
  }

  setRectXPoints(xStartKey, xEndKey, scale = 'Primary') {
    if (scale === 'Primary') {
      this.setXScale(this.xScalePrimary, xStartKey, xEndKey);
      this.marks
        .attr('x', this.xScalePrimary());
    } else if (scale === 'Secondary') {
      this.setXScale(this.xScaleSecondary, xStartKey, xEndKey);
      this.marks
        .attr('xSecondary', this.xScaleSecondary());
    }
  }

  // Add duplicate yScale values (i.e. secondary to primary values)
  setAnimationIndex(key, invert, keyType) {
    console.log(invert);
    if (key !== '') {
      const comparator = getComparator(keyType, key, invert);

      const sortedData = stable(this._visibleData, comparator);

      let currentIndex = 0;
      let prevValue = sortedData[0];
      sortedData.forEach((d) => {
        if (comparator(d, prevValue)) {
          prevValue = d;
          currentIndex++;
        }

        d.animationIndex = currentIndex;
      });

      sortedData.forEach((d) => {
        d.animationMaxIndex = currentIndex;
      });
    } else {
      this.allData.forEach((d) => {
        delete d.animationIndex;
        delete d.animationMaxIndex;
      });
    }
  }

  // Add duplicate yScale values (i.e. secondary to primary values)
  setRectYPoints(ySortBy, yGroupBy, yGroupByType, scale = 'Primary') {
    let yScale = this.yScalePrimary;
    let attrAddString = '';
    if (scale === 'Secondary') {
      yScale = this.yScaleSecondary;
      attrAddString = 'Secondary';
    }

    stable.inplace(this._visibleData, getComparator('Numerical', ySortBy));

    if (yGroupBy !== '') {
      stable.inplace(this._visibleData, getComparator(yGroupByType, yGroupBy));
    }


    if (yGroupBy !== '') {
      let currentYValue = this._visibleData[0][yGroupBy];
      let yGroupIndex = 0;
      this._visibleData.forEach((row) => {
        if (row[yGroupBy] !== currentYValue) {
          currentYValue = row[yGroupBy];
          yGroupIndex += 1;
        }
        row[`index${attrAddString}`] = this._visibleData.indexOf(row) + (yGroupIndex * yAxisLabelGroupYPadding);
      });
    } else {
      this._visibleData.forEach((row) => {
        row[`index${attrAddString}`] = this._visibleData.indexOf(row);
      });
    }

    if ('animationIndex' in this._visibleData[0]) {
      this.marks
        .attr('animationIndex', d => d.animationIndex)
        .attr('animationMaxIndex', d3.max(this._visibleData, d => d.animationIndex))
        .attr(`y${attrAddString}`, yScale(d => d[`index${attrAddString}`]));
    } else {
      this.marks
        .attr('animationIndex', d => d[`index${attrAddString}`])
        .attr('animationMaxIndex', d3.max(this._visibleData, d => d[`index${attrAddString}`]))
        .attr(`y${attrAddString}`, yScale(d => d[`index${attrAddString}`]));
    }
  }

  /* ------------------------------------------------------------------------------------------
    * SETUP COLOUR
    * ------------------------------------------------------------------------------------------ */

  // From https://stardustjs.github.io/examples/sanddance/
  setColourScale(colKey, colSchemeString, colSchemeInvert = false) {


    if (colKey === 'None') {
      this._visibleData.forEach(d => d.colour = defaultSickRowCol);
    } else {
      const colScheme = d3[colSchemeString];

      const normaliseVal = normalise(
        d3.min(this.allData, d => d[colKey]),
        d3.max(this.allData, d => d[colKey])
      );

      if (colSchemeInvert) {
        this._visibleData.forEach(d => d.colour = (typeof d[colKey] !== 'undefined') ? colScheme(1 - normaliseVal(d[colKey])) : sickRowMissingCol);
      } else {
        this._visibleData.forEach(d => d.colour = (typeof d[colKey] !== 'undefined') ? colScheme(normaliseVal(d[colKey])) : sickRowMissingCol);
      }
    }

    this.allData.forEach(d => d.opacity = 0);
    this._visibleData.forEach(d => d.opacity = 1);
    this.marks
      .attr('opacity', d => d.opacity)
      .attr('colour', d => strToRGBA(d.colour));
    // Handle missing values
  }

  /* ------------------------------------------------------------------------------------------
  * RENDERING
  *   - Adapted from https://github.com/stardustjs/stardust-examples/blob/master/examples/graph/index.html
  * ------------------------------------------------------------------------------------------ */

  requestRender() {
    if (renderRequested) return;
    renderRequested = requestAnimationFrame(this.render.bind(this));
  }

  render() {
    renderRequested = false;
    // Cleanup and re-render.
    platform.clear(backgroundCol);

    this.marks.render();
  }

  updatePanZoom(currentZoomTransform) {
    this.marks
      .attr('pan', [currentZoomTransform.x, currentZoomTransform.y])
      .attr('zoom', [currentZoomTransform.kx, currentZoomTransform.ky]);
    if (currentZoomTransform.ky < 1) {
      this.yScalePrimary.attr('rowPadding', 1 - (defaultSickRowPaddingRatio * currentZoomTransform.ky));
      this.yScaleSecondary.attr('rowPadding', 1 - (defaultSickRowPaddingRatio * currentZoomTransform.ky));
    }
  }

  transition(
    action, xStartKey, xEndKey, xAxisStartKey, xAxisEndKey,
    currentZoomTransform, xAxisScaleT,
    currentSortBy, currentGroupBy, yGroupByType,
    currentColourString, currentColourSchemeString, currentColourSchemeInvert,
    callback = null
  ) {
    const transition = () => {
      beginTransition('mainXY', (t) => {
        this.marks.attr('tx', t);
        this.marks.attr('ty', t);
        this.requestRender();
      }, () => {
        this.setRectYPoints(currentSortBy, currentGroupBy, yGroupByType);
        this.setRectXPoints(xStartKey, xEndKey);

        this.marks.attr('tx', 0);
        this.marks.attr('ty', 0);

        this.transitionInProgress = false;
        this.requestRender();

        if (callback !== null) {
          callback();
        }

        // Time for animation
      }, 1.5);
    };

    if (!this.transitionInProgress) {
      this.setRectXPoints(xStartKey, xEndKey, 'Secondary');
      this.setRectYPoints(currentSortBy, currentGroupBy, yGroupByType, 'Secondary');

      this.setColourScale(currentColourString, currentColourSchemeString, currentColourSchemeInvert);

      this.transitionInProgress = true;

      transition();
    }
  }

  setMinOpacity(opacity) {
    this.marks
      .attr('minOpacity', opacity);
  }
}

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
