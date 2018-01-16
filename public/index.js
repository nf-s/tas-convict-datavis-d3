console.log(d3.version); // 4.7.4

const width = 1280;
const height = 200;
const padding = 5;
const bottomPadding = 35;

// Declare SVG element
const svg = d3.select('body')
  .append('svg')
  .attr('width', width)
  .attr('height', height)
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
  .attr('stop-color', '#888')
  .attr('stop-opacity', 1);

gradient.append('stop')
  .attr('class', 'end')
  .attr('offset', '100%')
  .attr('stop-color', '#F44')
  .attr('stop-opacity', 1);

const initSicklistData = (data) => {
  // Sort data
  data.sort((a, b) => a['Days.lapse.since.sailing'] - b['Days.lapse.since.sailing']);

  const x = d3.scaleLinear()
    .domain([
      d3.min(data, d => d['Days.lapse.since.sailing']),
      d3.max(data, d => d['Est.Days.on.Sick.List'] + d['Days.lapse.since.sailing'])
    ])
    .range([padding, width - padding]);
  const y = d3.scaleLinear()
    .domain([0, data.length - 1])
    .range([height - bottomPadding, padding]);

  svg.append('g')
    .selectAll('rect')
    .data(data)
    .enter()
    .append('rect')
    .attr('width', d => x(d['Est.Days.on.Sick.List']))
    .attr('height', 2)
    .attr('x', d => x(d['Days.lapse.since.sailing']))
    .attr('y', (d, i) => y(i))
    .style('fill', (d) => {
      if (typeof d['Days.at.sea.till.Death'] === 'undefined') {
        return '#888';
      }
      return 'url(#deathGradient)';
    })
    .style('stroke-width', '0px')
    .style('opacity', 1);

  // Show x-axis
  const xAxis = d3.axisBottom(x)
    .ticks(5)
    .tickPadding(10)
    .tickFormat(d => d);

  svg.append('g')
    .attr('transform', `translate(0,${height-30})`)
    .call(xAxis)
    .select(".domain").remove();
};


axios.get('/data/sicklist.test.json')
  .then((response) => {
    console.log(response);
    initSicklistData(response.data);
  })
  .catch((error) => {
    console.log(error);
  });

