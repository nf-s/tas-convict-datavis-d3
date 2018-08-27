console.log(d3.version); // 4.7.4

const svgHeight = 2000;
const svgWidth = 3000;

const margin = {
  top: 100,
  right: 100,
  bottom: 100,
  left: 100
};

const width = svgWidth - margin.left - margin.right;
const height = svgHeight - margin.top - margin.bottom;

const padding = 50;

const defaultSickRowHeight = 10;
const defaultSickRowPaddingRatio = 0.25;
const defaultVoyageVertPadding = 100;

const defaultSickRowEnterExitTransitionDuration = 750;
const defaultSickRowEnterExitTransitionInitialDelay = 50;
const defaultSickRowEnterExitTransitionTotalDelay = 500;

const defaultSickRowTransformationDuration = 750;
const defaultSickRowTransformationInitialDelay = 50;
const defaultSickRowTransformationTotalDelay = 500;

const defaultSickRowYtransitionDuration = 750;
const defaultSickRowYtransitionInitialDelay = 100;
const defaultSickRowYtransitionTotalDelay = 1000;


// Declare SVG element
const svg = d3.select('svg')
  .style('border', '0px solid');

// Declare cols
const defaultSickRowCol = '#fff';
const zeroLengthSickRowCol = '#777';
const deathSickRowCol = '#F33';

// Declare Gradients
const defs = svg.append('defs');

const deathGradient = defs.append('linearGradient')
  .attr('id', 'deathGradient')
  .attr('x1', '0%')
  .attr('x2', '100%')
  .attr('y1', '0%')
  .attr('y2', '0%');

deathGradient.append('stop')
  .attr('class', 'start')
  .attr('offset', '0%')
  .attr('stop-color', deathSickRowCol)
  .attr('stop-opacity', 1);

deathGradient.append('stop')
  .attr('class', 'end')
  .attr('offset', '100%')
  .attr('stop-color', deathSickRowCol)
  .attr('stop-opacity', 1);

const marginTopGradient = defs.append('linearGradient')
  .attr('id', 'marginTopGradient')
  .attr('x1', '0%')
  .attr('x2', '0%')
  .attr('y1', '0%')
  .attr('y2', '100%');

marginTopGradient.append('stop')
  .attr('offset', '0%')
  .attr('stop-color', '#111')
  .attr('stop-opacity', 1);

marginTopGradient.append('stop')
  .attr('offset', `${100 - ((padding * 100) / (margin.top + padding))}%`)
  .attr('stop-color', '#111')
  .attr('stop-opacity', 1);

marginTopGradient.append('stop')
  .attr('offset', '100%')
  .attr('stop-color', '#111')
  .attr('stop-opacity', 0);

const marginBottomGradient = defs.append('linearGradient')
  .attr('id', 'marginBottomGradient')
  .attr('x1', '0%')
  .attr('x2', '0%')
  .attr('y1', '0%')
  .attr('y2', '100%');

marginBottomGradient.append('stop')
  .attr('offset', '0%')
  .attr('stop-color', '#111')
  .attr('stop-opacity', 0);

marginBottomGradient.append('stop')
  .attr('offset', `${(padding * 100) / (margin.bottom + padding)}%`)
  .attr('stop-color', '#111')
  .attr('stop-opacity', 1);

marginBottomGradient.append('stop')
  .attr('offset', '100%')
  .attr('stop-color', '#111')
  .attr('stop-opacity', 1);

// Inner Drawing Space
const zoomSpace = svg.append('g')
  .attr('class', 'inner_space zoom')
  .attr('transform', `translate(${margin.left + padding},${margin.top + padding})`)
  .style('fill', ' #111');

// Inner Drawing Space
const noZoomSpace = svg.append('g')
  .attr('class', 'inner_space')
  .attr('transform', `translate(${margin.left + padding},${margin.top + padding})`)
  .style('fill', ' #111');

// Gradient on margin (fade out elements off screen)
const marginTopGradientRect = svg.append('rect')
  .attr('class', 'fade-out-margin')
  .attr('x', 0)
  .attr('y', 0)
  .attr('width', svgWidth)
  .attr('height', margin.top + padding)
  .style('fill', 'url(#marginTopGradient)')
  .attr('opacity', 1);

const marginBottomGradientRect = svg.append('rect')
  .attr('class', 'fade-out-margin')
  .attr('x', 0)
  .attr('y', svgHeight - margin.bottom - padding)
  .attr('width', svgWidth)
  .attr('height', margin.bottom + padding)
  .style('fill', 'url(#marginBottomGradient)')
  .attr('opacity', 1);

const initSicklist = (shipyearsData, sicklistData) => {
  let xScale = null;
  let xAxis = null;

  const allVoyageSicklists = {};

  let currentZoomTransform = null;
  let currentYZoom = 1.0;

  // SET X-AXIS
  let currentXkey = null;
  let xStartKey = null;
  let xEndKey = null;

  // Setup shipyears
  shipyearsData.sort((a, b) => a.ShipWithYear > b.ShipWithYear);

  const dateParser = d3.timeParse('%Y-%m-%d %H:%M:%S');

  sicklistData.forEach(d => d.OnDate = dateParser(d.OnDate));
  sicklistData.forEach(d => d.OffDate = dateParser(d.OffDate));

  shipyearsData.forEach(d => d.departureDate = dateParser(d.departureDate));
  shipyearsData.forEach(d => d.arrivalDate = dateParser(d.arrivalDate));

  const setXscaleByDay = (data) => {
    xScale = d3.scaleLinear()
      .domain([
        d3.min(data, d => d.OnInDays),
        d3.max(data, d => d.OffInDays)
      ])
      .range([0, svgWidth]);

    currentXkey = 'byDay';
    xStartKey = 'OffInDays';
    xEndKey = 'OnInDays';
  };

  const setXscaleByPercentage = (data) => {
    xScale = d3.scaleLinear()
      .domain([
        d3.min(data, d => d.OnPercentVoyage),
        d3.max(data, d => d.OffPercentVoyage)
      ])
      .range([0, svgWidth]);

    currentXkey = 'byPercent';
    xStartKey = 'OffPercentVoyage';
    xEndKey = 'OnPercentVoyage';
  };

  const setXscaleByDate = (data) => {
    xScale = d3.scaleTime()
      .domain([
        d3.min(data, d => d.OnDate),
        d3.max(data, d => d.OffDate)
      ])
      .range([0, svgWidth]);

    currentXkey = 'byDate';
    xStartKey = 'OffDate';
    xEndKey = 'OnDate';
  };

  const setXaxisByNumerical = () =>
    xAxis.ticks(5)
      .tickSize(-height)
      .tickPadding(10)
      .tickFormat(d => d);

  const setXaxisByDate = () =>
    xAxis.ticks(5)
      .tickSize(-height)
      .tickPadding(10)
      .tickFormat(d3.timeFormat('%B %d, %Y'));

  // Set BY DAY as default
  setXscaleByDay(sicklistData);
  xAxis = d3.axisBottom(xScale);
  setXaxisByNumerical();

  const xAxisG = svg.append('g')
    .attr('class', 'axis axis--x axis-no-line')
    .attr('transform', `translate(0,${svgHeight - margin.bottom})`)
    .call(xAxis);

  // Mouse functions
  // Create Event Handlers for mouse
  function handleMouseOver(d, i) { // Add interactivity
    /*
    d3.select(this).transition()
      .duration(100)
      .attr('y', y(d.id) - 2);

  /*
    // Specify where to put label of text
    svg.append("text").attr({
      id: "t" + d.x + "-" + d.y + "-" + i,  // Create an id for text so we can select it later for removing on mouseout
      x: function() { return xScale(d.x) - 30; },
      y: function() { return yScale(d.y) - 15; }
    })
      .text(function() {
        return [d.x, d.y];  // Value of the text
      });
      */
  }

  function handleMouseOut(d, i) {
    /*
  d3.select(this).transition()
    .duration(100)
    .attr('y', y(d.id) + 2);

// Select text by id and then remove
// d3.select("#t" + d.x + "-" + d.y + "-" + i).remove();  // Remove text location
*/
  }

  // Find an element with the minimum width - i.e. a sicklist record which is only 1 day long
  // This is used for when the total days is 0 - so the element doesn't disappear
  const minWidthElement = sicklistData.filter(d => d.TotalInDays === 1)[0];

  function VoyageSicklist(currentVoyageSicklist) {
    this.id = currentVoyageSicklist[0].ShipWithYear;
    this.details = shipyearsData.filter(d => d.ShipWithYear === this.id)[0];

    this.allRows = currentVoyageSicklist;
    this.visibleRows = this.allRows;

    this.xDomain = {
      byDay: [0, this.details.lengthOfVoyage],
      byPercent: [0, 100],
      byDate: [this.details.arrivalDate, this.details.departureDate]
    };

    this.startY = 0;
    this.endY = 0;

    this.sickRowLinesG = zoomSpace.append('g');
    // this.sickRowLines = this.sickRowLinesG.selectAll('rect');

    // Sick row lines X-POSITION_______________
    function calculateWidth(d) {
      return xScale(d[xStartKey]) - xScale(d[xEndKey]) ||
        xScale(minWidthElement[xStartKey]) - xScale(minWidthElement[xEndKey]);
    }

    this.yScale = null;
    // Sick row lines Y-POSITION_______________
    this.setYScale = (startY = 0, yScale = null) => {
      if (yScale !== null) {
        this.yScale = yScale;
      } else {
        this.startY = startY;
        this.endY = startY + (defaultSickRowHeight * this.visibleRows.length);

        this.yScale = d3.scaleBand()
          .domain(this.visibleRows.sort((a, b) => a[currentSortString] - b[currentSortString])
            .map(d => d.id))
          .rangeRound([this.startY, this.endY])
          .paddingInner(defaultSickRowPaddingRatio);
      }
    };

    this.updateSickRowLines = () => {
      // reject(error);

      const sickRowLines = this.sickRowLinesG.selectAll('rect')
        .data(this.visibleRows, d => d.id);

      const updatePromise = new Promise((resolve, reject) => {
        // UPDATE EXISTING

        if (sickRowLines.size() > 0) {
          let updateTransitions = 0;
          const updateDelayMult = (defaultSickRowTransformationTotalDelay / this.visibleRows.length);

          sickRowLines.transition()
            .duration(defaultSickRowTransformationDuration)
            .delay((d, i) => defaultSickRowTransformationInitialDelay +
              (i * updateDelayMult))
            .on('start', () => {
              updateTransitions++;
            })
            .on('end', () => {
              if (--updateTransitions === 0) {
                resolve('done');
              }
            })
            .attr('opacity', 0.8)
            .attr('width', calculateWidth)
            .attr('x', d => xScale(d[xEndKey]))
            .attr('height', this.yScale.bandwidth())
            .attr('y', d => this.yScale(d.id));
        } else {
          resolve('done');
        }
      });

      // REMOVE OLD
      const exitPromise = new Promise((resolve, reject) => {
        const exitSelection = sickRowLines.exit();

        if (exitSelection.size() > 0) {
          let exitTransitions = 0;
          const delayMult = (defaultSickRowEnterExitTransitionTotalDelay / exitSelection.size());

          exitSelection
            .transition()
            .duration(defaultSickRowEnterExitTransitionDuration)
            .delay((d, i) => defaultSickRowEnterExitTransitionInitialDelay +
              (i * delayMult))
            .attr('opacity', 0)
            .on('start', () => {
              exitTransitions++;
            })
            .on('end', () => {
              if (--exitTransitions === 0) {
                resolve('done');
              }
            })
            .remove();
        } else {
          resolve('done');
        }
      });

      const enterPromise = new Promise((resolve, reject) => {
        let enterSelection = sickRowLines.enter();

        if (enterSelection.size() > 0) {
          const enterDelayMult = (defaultSickRowEnterExitTransitionTotalDelay / enterSelection.size());
          let enterTransitions = 0;

          enterSelection = enterSelection
            .append('rect')
            .classed('sick-row', true)
            .on('mouseover', handleMouseOver)
            .on('mouseout', handleMouseOut)
            .style('fill', (d) => {
              if (!d.Died) {
                if (d.TotalInDays === 0) {
                  return zeroLengthSickRowCol;
                }
                return defaultSickRowCol;
              }
              if (d.TotalInDays === 0) {
                return deathSickRowCol;
              }
              return 'url(#deathGradient)';
            })
            .style('stroke-width', '0px')
            .attr('width', calculateWidth)
            .attr('x', d => xScale(d[xEndKey]))
            .attr('height', this.yScale.bandwidth())
            .attr('y', d => this.yScale(d.id))
            .attr('opacity', 0)
            .transition()
            .duration(defaultSickRowEnterExitTransitionDuration)
            .delay((d, i) => defaultSickRowEnterExitTransitionInitialDelay +
              (i * enterDelayMult))
            .on('start', () => {
              enterTransitions++;
            })
            .on('end', () => {
              if (--enterTransitions === 0) {
                resolve('done');
              }
            })
            .attr('opacity', 0.8);
        } else {
          resolve('done');
        }
      });

      return Promise.all([updatePromise, enterPromise, exitPromise]);
    };

    // this.updateSickRowLines(this.allRows);

    this.filterRows = (filter) => {
      this.visibleRows = this.allRows;

      if (filter !== null) {
        Object.keys(filter)
          .forEach((property) => {
            this.visibleRows = this.visibleRows.filter(row => row[property] === filter[property]);
          });
      }

      // console.log(this.allRows.length + ' - ' + this.visibleRows.length);
    };

    // Voyage Label _______________
    const voyageLabel = {};

    voyageLabel.g = noZoomSpace.append('g')
      .attr('class', 'voyage-label');

    voyageLabel.line = voyageLabel.g.append('line')
      .style('stroke', defaultSickRowCol)
      .style('stroke-width', 2);

    voyageLabel.text = voyageLabel.g.append('text')
      .attr('text-anchor', 'middle')
      .style('fill', defaultSickRowCol)
      .attr('y', -10)
      .text(this.details.ShipWithYear);

    this.setVoyageLabelPosition = (transition = true) => {
      let yPos = ((this.startY) * currentYZoom) - margin.top - padding - 5;

      let xt = xScale;
      if (currentZoomTransform !== null) {
        xt = currentZoomTransform.rescaleX(xScale);
        yPos += currentZoomTransform.y;
      }

      const x1 = xt(this.xDomain[currentXkey][0]);
      const x2 = xt(this.xDomain[currentXkey][1]);

      let voyageLabelG = voyageLabel.g;
      let voyageLabelLine = voyageLabel.line;
      let voyageLabelText = voyageLabel.text;

      if (transition) {
        voyageLabelG = voyageLabelG.transition()
          .duration(defaultSickRowTransformationDuration);

        voyageLabelLine = voyageLabelLine.transition()
          .duration(defaultSickRowTransformationDuration);

        voyageLabelText = voyageLabelText.transition()
          .duration(defaultSickRowTransformationDuration);
      }

      voyageLabelG
        .attr('transform', `translate(${x1 - margin.left - padding},${yPos})`)
        .attr('opacity', 1);

      voyageLabelLine
        .attr('x2', x2 - x1);

      voyageLabelText
        .attr('x', (x2 - x1) / 2);
    };
  }

  function hideAllVoyageLabels() {
    d3.selectAll('.voyage-label').transition().duration(defaultSickRowYtransitionDuration).attr('opacity', 0);
  }

  let filteredSicklistData = [];
  function filterRows(filter) {
    filteredSicklistData = allSicklistData;

    if (filter !== null) {
      Object.keys(filter)
        .forEach((property) => {
          filteredSicklistData = filteredSicklistData.filter(row => row[property] === filter[property]);
        });
    }
  }

  function getGlobalSicklistYScale() {
    return d3.scaleBand()
      .domain(filteredSicklistData.sort((a, b) => a[currentSortString] - b[currentSortString])
        .map(d => d.id))
      .rangeRound([0, defaultSickRowHeight * filteredSicklistData.length])
      .paddingInner(defaultSickRowPaddingRatio);
  }

  /* ------------------------------------------------------------------------------------------
   * SORTING AND GROUPING
   *   - Sort by ...
   *   - Group by voyage
   *   - No grouping
   * ------------------------------------------------------------------------------------------ */
  let currentGroupBy = 'voyage';
  let prevGroupBy = 'voyage';
  let currentSortString = 'OnInDays';
  let prevSortString = 'OnInDays';
  let currentFilterBy = null;
  let prevFilterBy = null;

  $('#sortSelect')
    .change(() => {
      currentSortString = '';
      $('#sortSelect')
        .find('option:selected')
        .each(function () {
          currentSortString += $(this).text();
        });

      applySortingWithGrouping();
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
    let prevEndY = 0;

    switch (currentGroupBy) {
      case 'voyage':
        Object.keys(allVoyageSicklists)
          .forEach((key) => {
            allVoyageSicklists[key].filterRows(currentFilterBy);

            if (prevEndY !== 0) {
              prevEndY += defaultVoyageVertPadding;
            }
            allVoyageSicklists[key].setYScale(prevEndY);
            prevEndY = allVoyageSicklists[key].endY;

            allVoyageSicklists[key].setVoyageLabelPosition(transition);
            allVoyageSicklists[key].updateSickRowLines().then((response) => {

            });
          });

        setupZoom(prevEndY, transition);
        break;
      case 'none':
        hideAllVoyageLabels();
        filterRows(currentFilterBy);
        const globalYScale = getGlobalSicklistYScale();

        Object.keys(allVoyageSicklists)
          .forEach((key) => {
            allVoyageSicklists[key].filterRows(currentFilterBy);

            allVoyageSicklists[key].setYScale(0, globalYScale);

            allVoyageSicklists[key].updateSickRowLines().then((response) => {

            });
          });

        setupZoom(defaultSickRowHeight * filteredSicklistData.length, transition);
        break;
      default:
        break;
    }

    prevFilterBy = currentFilterBy;
    prevSortString = currentSortString;
    prevGroupBy = currentGroupBy;
  }

  /* ------------------------------------------------------------------------------------------
   * ZOOMING - X-AXIS
   * PANNING - Y and X Axis
   *   - Handled by scrolling and limited touch support
   * ------------------------------------------------------------------------------------------ */
  function setupZoom(maxY, transition = true) {
    const xZoom = d3.xyzoom()
      .extent([[xScale.range()[0], 0], [xScale.range()[1], height]])
      .scaleExtent([[1, 50], [1, 1]])
      .translateExtent([[0 - margin.left, 0 - margin.top - padding], [width + margin.right, maxY * currentYZoom]])
      .on('zoom', onZoom);

    svg.call(xZoom);

    if (!transition) {
      const defaultZoom = d3.xyzoomIdentity;

      defaultZoom.x = margin.left;
      defaultZoom.y = (margin.top + padding);

      svg.call(xZoom.transform, defaultZoom);
    }
  }

  function onZoom() {
    // console.log(d3.touches(this));

    currentZoomTransform = d3.zoomTransform(this);
    // const modifiedTransform = d3.zoomIdentity.scale(currentZoomTransform.kx, currentZoomTransform.ky).translate(currentZoomTransform.x, currentZoomTransform.y);

    xAxisG
      .call(xAxis.scale(currentZoomTransform.rescaleX(xScale)));

    zoomSpace.attr('transform', `translate(${currentZoomTransform.x},${currentZoomTransform.y
    }) scale(${currentZoomTransform.kx},${currentYZoom})`);

    // If grouped by voyage => labesl will be visible => need to update label position
    if (currentGroupBy === 'voyage') {
      Object.keys(allVoyageSicklists)
        .forEach((key) => {
          allVoyageSicklists[key].setVoyageLabelPosition(false);
        });
    }

    /* MARGIN GRADIENT MOVE
    if (currentZoomTransform.y === margin.top) {
      marginTopGradientRect.transition().duration(500).attr('y', -margin.top);
      marginBottomGradientRect.transition().duration(500).attr('y', svgHeight - (2 * margin.bottom));
    } else if (currentZoomTransform.y === (height - endY) + defaultVoyageVertPadding) {
      marginTopGradientRect.transition().duration(500).attr('y', 0);
      marginBottomGradientRect.transition().duration(500).attr('y', svgHeight - (margin.bottom));
    } else {
      if (marginTopGradientRect.attr('y') === (-margin.top).toString()) {
        marginTopGradientRect.transition()
          .duration(500)
          .attr('y', 0);
      }

      if (marginBottomGradientRect.attr('y') === (svgHeight - (margin.bottom)).toString()) {
        marginBottomGradientRect.transition()
          .duration(500)
          .attr('y', svgHeight - (2 * margin.bottom));
      }

    } */
  }

  /* ------------------------------------------------------------------------------------------
   * ZOOMING - Y-AXIS
   *   - Handled by buttons
   * ------------------------------------------------------------------------------------------ */

  const applyYZoom = () => {
    zoomSpace.attr('transform', `translate(${currentZoomTransform.x},${currentZoomTransform.y
    }) scale(${currentZoomTransform.kx},${currentYZoom})`);

    // If grouped by voyage => labesl will be visible => need to update label position
    if (currentGroupBy === 'voyage') {
      Object.keys(allVoyageSicklists)
        .forEach((key) => {
          allVoyageSicklists[key].setVoyageLabelPosition(false);
        });
    }
  };

  $('#zoomInBtn').on('click', (event) => {
    currentYZoom += 0.1;
    applyYZoom();
  });

  $('#zoomOutBtn').on('click', (event) => {
    if (currentYZoom < 0.21) {
      currentYZoom = 0.1;
    } else {
      currentYZoom -= 0.1;
    }
    applyYZoom();
  });

  /* ------------------------------------------------------------------------------------------
   * X-AXIS MODES
   *  - By Day
   *  - By % Voyage Elapsed
   *  - By Date
   * ------------------------------------------------------------------------------------------ */
  $('input[name=\'xAxis\']')
    .change((evt) => {
      const xAxisMode = evt.currentTarget.value;

      switch (xAxisMode) {
        case 'date': {
          setXscaleByDate(sicklistData);
          setXaxisByDate();
          break;
        }
        case 'day': {
          setXscaleByDay(sicklistData);
          setXaxisByNumerical();
          break;
        }
        case 'percent': {
          setXscaleByPercentage(sicklistData);
          setXaxisByNumerical();
          break;
        }
        default:
          break;
      }

      if (currentZoomTransform === null) {
        xAxisG
          .call(xAxis.scale(xScale));
      } else {
        xAxisG
          .call(xAxis.scale(currentZoomTransform.rescaleX(xScale)));
      }


      Object.keys(allVoyageSicklists).forEach((key) => {
        // If grouped by voyage => labesl will be visible => need to update label position
        if (currentGroupBy === 'voyage') {
          allVoyageSicklists[key].setVoyageLabelPosition();
        }
        allVoyageSicklists[key].updateSickRowLines().then((response) => {

        });
      });
    });

  /* ------------------------------------------------------------------------------------------
  * INITIALISATION
  * ------------------------------------------------------------------------------------------ */

  let allSicklistData = [];
  //shipyearsData.length
  for (let i = 0; i < 25; i++) {
    const currentSicklistVoyage = sicklistData.filter(d => d.ShipWithYear === shipyearsData[i].ShipWithYear);
    allSicklistData.push(...currentSicklistVoyage);

    if (currentSicklistVoyage.length > 0) {
      allVoyageSicklists[shipyearsData[i].ShipWithYear] = new VoyageSicklist(currentSicklistVoyage);
    } else {
      console.log(`${shipyearsData[i].ShipWithYear} is empty`);
    }
  }

  // Apply sorting/grouping with defaults:
  //   - groupBy = 'voyage';
  //   - currentSortString = 'OnInDays';
  applySortingWithGrouping(false);
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

