
CanvasJS, as depicted in its [official website](http://canvasjs.com), is a charting library:

> CanvasJS is an easy to use JavaScript & HTML5 Charts library built on Canvas element. It runs across devices including iPhone, iPad, Android, Windows Phone, Microsoft Surface, Desktops, etc. This allows you to create rich dashboards that work on all the devices without compromising on maintainability or functionality of your web application. CanvasJS comes with beautiful themes and is over 10x faster than conventional Flash and SVG Charts – resulting in lightweight, beautiful and responsive dashboards.

## Features

This project includes many features you'll not find in the original CanvasJS library. Have a look at some of them below.

* CommonJS Browserify Support
* Fully written from scratch using ES2015
* Highly Scalable and modular
* Full Test Suite
* Better performance
* New **Table** chart, extremely fast (+10,000 rows in ~15ms), making it suitable for both big data and realtime projects.

## Download

```
npm install canvasjs
```

## Getting Started

First of all, you need to import it. This can be achieved in different ways depending up on what module definition pattern your application is using.

The CanvasJS package works by default with CommonJS so you can use it with browserify as shown below:

```js
// CommonJS
var CanvasJS = require('canvasjs');

// If you are using ES6, then
import CanvasJS from 'canvasjs';
```

Note that `canvasjs` is written in ES2015. It forces users building its projects with browserify to install the next dependences:

```bash
npm install babelify babel-preset-es2015 babel-preset-stage-1 --save-dev
```

It is also possible to use it with AMD loaders as Require.js. If so, you can import it this way:

```js
// AMD
require('canvasjs/dist/canvasjs.js', function(CanvasJS){

       // Add your stuff here
});
```

Finally, you may also import it as a global dependence:

```html
<script src="canvasjs/dist/canvasjs.js">
```

Then you can access the global variable `CanvasJS`.

** Note: dist folder also contains a minified version located at dist/canvasjs.min.js and ready for production, and also a wrapper for using it with jQuery.

## Build

```
npm run build
```

## Disclaimer

This repository just extends the original code by including new features and several fixes.

The original code can be found at [http://canvasjs.com](http://canvasjs.com). It was released as [CC](http://creativecommons.org/licenses/by-nc/3.0/deed.en_US) for personal use and it needs to be licensed under commercial use - see terms [here](http://canvasjs.com/license-canvasjs/).
