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

const padding = 100;

const defaultSickRowHeight = 20;
const defaultVoyageVertPadding = 100;

const dateParser = d3.timeParse('%Y-%m-%d %H:%M:%S');

// Declare SVG element
const svg = d3.select('svg')
  .style('border', '0px solid');

// Declare Gradients
const defs = svg.append('defs');

const gradient = defs.append('linearGradient')
  .attr('id', 'deathGradient')
  .attr('x1', '0%')
  .attr('x2', '100%')
  .attr('y1', '0%')
  .attr('y2', '0%');

gradient.append('stop')
  .attr('class', 'start')
  .attr('offset', '0%')
  .attr('stop-color', '#fff')
  .attr('stop-opacity', 1);

gradient.append('stop')
  .attr('class', 'end')
  .attr('offset', '100%')
  .attr('stop-color', '#F33')
  .attr('stop-opacity', 1);

// Inner Drawing Space
const innerSpace = svg.append('g')
  .attr('class', 'inner_space zoom')
  .attr('transform', `translate(${margin.left},${margin.top})`)
  .style('fill', ' #111');

const initSicklist = (shipyearsData, sicklistData) => {
  let x = null;
  let xAxis = null;

  const allVoyageLines = {};
  const allVoyageYscales = {};
  let currentZoomTransform = null;
  let xAxisByDate = false;

  // Setup shipyears
  shipyearsData.sort((a, b) => a.ShipWithYear > b.ShipWithYear);

  sicklistData.forEach(d => d.OnDate = dateParser(d.OnDate));
  sicklistData.forEach(d => d.OffDate = dateParser(d.OffDate));


  // SET X-AXIS
  const setXscaleByDay = data =>
    d3.scaleLinear()
      .domain([
        d3.min(data, d => d.OnInDays),
        d3.max(data, d => d.OffInDays)
      ])
      .range([padding, width - padding]);


  const setXscaleByDate = data =>
    d3.scaleTime()
      .domain([
        d3.min(data, d => d.OnDate),
        d3.max(data, d => d.OffDate)
      ])
      .range([padding, width - padding]);

  const setXaxisByDay = () =>
    xAxis.ticks(5)
      .tickSize(-height)
      .tickPadding(10)
      .tickFormat(d => d);

  const setXaxisByDate = () =>
    xAxis.ticks(5)
      .tickSize(-height)
      .tickPadding(10)
      .tickFormat(d3.timeFormat('%B %d, %Y'));

  x = setXscaleByDay(sicklistData);
  xAxis = d3.axisBottom(x);
  setXaxisByDay();

  const xAxisG = svg.append('g')
    .attr('class', 'axis axis--x axis-no-line')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis);

  // Setup sicklist entry lines X properties (i.e. width and x-position)
  const setLinesXproperties = (lines, xStartKey, xEndKey, transition = true) => {
    console.log('asdf');
    let lineSelection = lines;

    if (transition) {
      lineSelection = lineSelection.transition()
        .duration(500)
        .delay((d, i) => i * 50);
    }

    // if (currentZoomTransform === null) {
    lineSelection
      .attr('width', d => x(d[xStartKey]) - x(d[xEndKey]))
      .attr('x', d => x(d[xEndKey]));
    /* } else {
      const xt = currentZoomTransform.rescaleX(x);

      lineSelection
        .attr('width', d => (x(d[xStartKey]) - x(d[xEndKey])) * currentZoomTransform.k)
        .attr('x', (d => xt(d[xEndKey])));
    } */
  };

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

  // Setup sort selection
  Object.keys(sicklistData[0])
    .forEach(key => $('#sortSelect')
      .append(new Option(key, key, false, false)));

  const initSicklistVoyageData = (voyageData, startY = 0) => {
    const currentVoyage = voyageData[0].ShipWithYear;

    // Sort data
    voyageData.sort((a, b) => a.OnInDays - b.OnInDays);

    const endY = startY + (defaultSickRowHeight * voyageData.length);

    const y = d3.scaleBand()
      .domain(voyageData.map(d => d.id))
      .rangeRound([startY, endY])
      .paddingInner(0.5);

    allVoyageYscales[currentVoyage] = y;

    const lines = innerSpace.append('g')
      .selectAll('rect')
      .data(voyageData)
      .enter()
      .append('rect')
      .attr('height', y.bandwidth())
      .attr('y', d => y(d.id))
      .style('fill', (d) => {
        if (!d.Died) {
          return '#fff';
        }
        return 'url(#deathGradient)';
      })
      .style('stroke-width', '0px')
      .style('opacity', 0.8)
      .on('mouseover', handleMouseOver)
      .on('mouseout', handleMouseOut);

    allVoyageLines[currentVoyage] = lines;

    setLinesXproperties(lines, 'OffInDays', 'OnInDays');

    // Sort listnener
    $('#sortSelect')
      .change(() => {
        let str = '';
        $('#sortSelect')
          .find('option:selected')
          .each(function () {
            str += $(this)
              .text();
          });

        const y0 = y.domain(voyageData.sort((a, b) => a[str] - b[str])
          .map(d => d.id))
          .copy();

        lines
          .sort((a, b) => y0(a.id) - y0(b.id));

        lines.transition()
          .duration(750)
          .delay((d, i) => i * 50)
          .attr('y', d => y0(d.id));
      });

    return endY;
  };

  let endY = initSicklistVoyageData(sicklistData.filter(d => d.ShipWithYear === shipyearsData[0].ShipWithYear));
  endY = initSicklistVoyageData(sicklistData.filter(d => d.ShipWithYear === shipyearsData[1].ShipWithYear), endY + defaultVoyageVertPadding);
  endY = initSicklistVoyageData(sicklistData.filter(d => d.ShipWithYear === shipyearsData[2].ShipWithYear), endY + defaultVoyageVertPadding);
  endY += defaultVoyageVertPadding;


  // X ZOOMING
  function xZoomed(event) {
    currentZoomTransform = d3.zoomTransform(this);

    /*
    if (xAxisByDate) {
      Object.keys(allVoyageLines).forEach((key) => {
        setLinesXproperties(allVoyageLines[key], 'OffDate', 'OnDate', false);
      });
    } else {
      Object.keys(allVoyageLines).forEach((key) => {
        setLinesXproperties(allVoyageLines[key], 'OffInDays', 'OnInDays', false);
      });
    }
    */

    xAxisG
      .call(xAxis.scale(currentZoomTransform.rescaleX(x)));

    innerSpace.attr('transform', currentZoomTransform);
  }

  const xZoom = d3.xyzoom()
    .extent([[x.range()[0], 0], [x.range()[1], height]])
    .scaleExtent([[1, 50], [1, 1]])
    .translateExtent([[0 - margin.left, 0 - margin.top], [width + margin.right, endY + margin.bottom]])
    .on('zoom', xZoomed);

  svg.call(xZoom);

  // CHANGE X-AXIS FUNCTIONS
  $('#xAxisDate')
    .change((evt) => {
      xAxisByDate = evt.currentTarget.checked;

      let xStartKey = null;
      let xEndKey = null;

      if (xAxisByDate) {
        x = setXscaleByDate(sicklistData);
        setXaxisByDate();

        xStartKey = 'OffDate';
        xEndKey = 'OnDate';
      } else {
        x = setXscaleByDay(sicklistData);
        setXaxisByDay();

        xStartKey = 'OffInDays';
        xEndKey = 'OnInDays';
      }

      if (currentZoomTransform === null) {
        xAxisG
          .call(xAxis.scale(x));
      } else {
        xAxisG
          .call(xAxis.scale(currentZoomTransform.rescaleX(x)));
      }

      Object.keys(allVoyageLines).forEach((key) => {
        setLinesXproperties(allVoyageLines[key], xStartKey, xEndKey);
      });
    });
};
axios.get('/data/shipyear.stats.json')
  .then((shipYearStats) => {
  // Get sicklist data
    axios.get('/data/sicklist.final1.json')
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

