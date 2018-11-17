# Health of Convicts during Voyages to Tasmania Visualisation

Using D3 and Stardust.js.

Currently, the data isn't hosted here &mdash; hopefully it can be included in the future.

Example &mdash; All Voyages by Date:  
![All Voyages](https://github.com/nf-s/utas-tas-convict-datavis/blob/master/docs/img/all%20voyages.png?raw=true)

## To start

`browserify public/app/main.js -o public/dist/bundle.js`

`node server.js`

## GPU

This needs a dedicated GPU &mdash; if you have hybrid GPU you can check which one is being utilised at http://webglreport.com/?v=1.  
Or you can check the current CPU which is now printed to console on launch.

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
