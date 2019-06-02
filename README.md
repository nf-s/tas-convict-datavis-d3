# Health of Convicts during Voyages to Tasmania Visualisation

Using [D3](https://d3js.org/) and [Stardust.js](https://stardustjs.github.io/)

Developed for the [*Data, Knowledge and Decisions*](http://www.utas.edu.au/research/our-research-themes/data-knowledge-and-decisions) research theme at [The University of Tasmania](http://www.utas.edu.au/)

### [Demo](https://nf-s.github.io/tas-convict-datavis-d3/public/static/)  

**Notes**: 

- This needs a dedicated GPU to work properly!  

    - If you have a hybrid GPU you can check which one is being utilised at [WebGL Report](http://webglreport.com/?v=1) (the current GPU is also printed to console)
    - If the wrong GPU is being used, you must assign **High Performance** graphics to your web browser - see [Assign graphics performance preferences to Windows 10 programs](https://www.ghacks.net/2018/11/30/assign-graphics-performance-preferences-windows-10-programs/)
    - If you have a NVIDIA card, there may also be **Run with graphics processor** context menu option (which can be [enabled](https://forums.geforce.com/default/topic/520731/pc-games/can-39-t-find-34-run-with-graphics-processor-34-option/post/3698089/#3698089))

- Please enter full screen (`F11`) - otherwise some controls are cut off

- There is no loading indicator - so the screen may stay blank for ~20 seconds while the data is loading

- This is made for touchscreen - it doesn't work very well with a mouse

- Best performance with **Google Chrome**

---

Example &mdash; All Voyages by Date:  
![All Voyages](https://github.com/nf-s/utas-tas-convict-datavis/blob/master/docs/img/all%20voyages.png?raw=true)

## To start

1. Install dependencies: `npm i`

2. Bundle npm packages: `browserify public/app/main.js -o public/dist/bundle.js`

3. Then you can either open `public/static/index.html` in a web browser, or you can run a webserver with `node server.js`

## Screenshots

### Finding the most deadly voyage &mdash; The East London

For the following screenshots, red represents fatalities.

You can see the difference between the East London and the surrounding voyages.

![East London](https://github.com/nf-s/utas-tas-convict-datavis/blob/master/docs/img/east%20london.png?raw=true)

![East London](https://github.com/nf-s/utas-tas-convict-datavis/blob/master/docs/img/east%20london%20with%20names.png?raw=true)

![East London](https://github.com/nf-s/utas-tas-convict-datavis/blob/master/docs/img/east%20london%20with%20names%20zoomed.png?raw=true)

![East London](https://github.com/nf-s/utas-tas-convict-datavis/blob/master/docs/img/east%20london%20with%20names%20zoomed%20-%20eliza.png?raw=true)

### Exploring coloured by disease

Grouped by voyages, coloured by disease.

![By Disease](https://github.com/nf-s/utas-tas-convict-datavis/blob/master/docs/img/all%20by%20voyage%20coloured%20by%20disease.png?raw=true)

![By Disease](https://github.com/nf-s/utas-tas-convict-datavis/blob/master/docs/img/all%20by%20voyage%20coloured%20by%20disease%20zoom.png?raw=true)

![By Disease](https://github.com/nf-s/utas-tas-convict-datavis/blob/master/docs/img/sarah%202%20-%20colour%20by%20disease.png?raw=true)

![By Disease](https://github.com/nf-s/utas-tas-convict-datavis/blob/master/docs/img/sarah%202%20-%20colour%20by%20disease%20-%20zoomed%20in.png?raw=true)

![By Disease](https://github.com/nf-s/utas-tas-convict-datavis/blob/master/docs/img/sarah%202%20-%20colour%20by%20disease%20-%20zoomed%20in%20-%20andrew.png?raw=true)

### All entries by percentage

![By Percentage](https://github.com/nf-s/utas-tas-convict-datavis/blob/master/docs/img/all%20by%20percentage.png?raw=true)
