
import R from 'ramda';
import debounce from 'debounce';
import {createCanvas} from '../helpers/utils';

const CELL_HEIGHT = 30;
let CELL_WIDTH = 150;

function createDOMElements(containerId){

	this.containerElement = typeof containerId === "string" ? document.getElementById(containerId) : containerId;

	this.canvasContainerElement = document.createElement("div");
	this.canvasContainerElement.setAttribute("class", "canvasjs-chart-container");
	this.canvasContainerElement.style.position = "relative";
	this.canvasContainerElement.style.textAlign = "left";
	this.canvasContainerElement.style.cursor = "auto";

	this.containerElement.appendChild(this.canvasContainerElement);

	if (this.options.width) this.width = this.options.width;
	else this.width = this.containerElement.clientWidth ? this.containerElement.clientWidth : this.width;

	if (this.options.height) this.height = this.options.height;
	else this.height = this.containerElement.clientHeight ? this.containerElement.clientHeight : this.height;

	this.canvasElement = createCanvas(this.width, this.height);
	this.canvasElement.style.position = "absolute";

	const border = "1px solid rgba(0 ,0, 0, 0.2)"
	this.canvasElement.style.border = border;

	if (this.canvasElement.getContext) {

		this.canvasContainerElement.appendChild(this.canvasElement);
		this.canvasCtx = this.canvasElement.getContext("2d");

	}

	this.canvasCtx.fillStyle = "transparent";
	this.canvasCtx.strokeStyle = "#000000";
	this.canvasCtx.lineWidth = .2;
	this.canvasCtx.font = "normal normal 12px Verdana";
	this.canvasCtx.textAlign = 'center';
  this.canvasCtx.textBaseline = 'middle';

}

function createState(){

	this.headers = R.keys(this.options.headers);
	this.totalColumns = R.length(this.headers);
	this.data = [];
	this.rowCursor = 0;
	this.visibleRows = Math.ceil(Math.abs(this.height/CELL_HEIGHT));
	this.scrollBarSize = 0;

	CELL_WIDTH = Math.ceil(Math.abs(this.width/this.totalColumns));

}

function cleanCanvas(canvasCtx, width, height){

	canvasCtx.clearRect(0, 0, width, height);

}

function paintLine(canvasCtx, x, y, x2, y2){

	canvasCtx.beginPath();
	canvasCtx.moveTo(x, y);
	canvasCtx.lineTo(x2, y2);
	canvasCtx.stroke();

}

function paintCell(canvasCtx, x, y){

	// canvasCtx.fillRect(x,y, CELL_WIDTH, CELL_HEIGHT);
	// canvasCtx.strokeRect(x,y, CELL_WIDTH, CELL_HEIGHT);

}

function paintText(canvasCtx, text, x, y){

	canvasCtx.fillStyle = "#000";
	canvasCtx.fillText(text, x + CELL_WIDTH/2, y + CELL_HEIGHT/2);
	canvasCtx.fillStyle = "transparent";

}

function paintTableBorders(canvasCtx, totalColumns, totalRows){

	// Draw vertical lines
	for(let x of R.range(1, totalColumns)){

		paintLine(canvasCtx, x*CELL_WIDTH, 0, x*CELL_WIDTH, totalRows*CELL_HEIGHT);

	}

	// Draw horizontal lines
	for(let y of R.range(1, totalRows)){

		paintLine(canvasCtx, 0, y*CELL_HEIGHT,  totalColumns*CELL_WIDTH, y*CELL_HEIGHT);

	}

}

function paintHeaders(canvasCtx, headers, headersNumber){

	for(let position of R.range(0, headersNumber)){

		const x = position * CELL_WIDTH;

		paintCell(canvasCtx, x , 0);
		paintText(canvasCtx, headers[position], x, 0);

	}
}

function paintBody(canvasCtx, data, totalColumns, rowCursor, visibleRows){

	// console.log(R.range(rowCursor, (rowCursor + visibleRows - 1)*totalColumns));

	for(let position of R.range(0, (visibleRows - 1)*totalColumns)){

		if(position >= R.length(data)) break;

		const x = getX(position, totalColumns);
		const y = getY(position, totalColumns);

		paintCell(canvasCtx, x, y);
		paintText(canvasCtx, data[position+rowCursor], x, y);

	}
}


function drawEllipse(ctx, x, y, w, h) {
  var kappa = .5522848,
      ox = (w / 2) * kappa, // control point offset horizontal
      oy = (h / 2) * kappa, // control point offset vertical
      xe = x + w,           // x-end
      ye = y + h,           // y-end
      xm = x + w / 2,       // x-middle
      ym = y + h / 2;       // y-middle

  ctx.beginPath();
  ctx.moveTo(x, ym);
  ctx.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
  ctx.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
  ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
  ctx.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
  //ctx.closePath(); // not used correctly, see comments (use to close off open path)
  ctx.stroke();
}

function paintScroll(table, canvasCtx, width, visibleRows, totalRows){

	const percentage = visibleRows / totalRows;
	const totalSize = visibleRows * CELL_HEIGHT;
	const scrollBarSize = (totalSize * percentage) - 10;

	table.scrollBarSize = scrollBarSize < 30 ? 30 : scrollBarSize;

	// drawEllipse(canvasCtx, width - 15 , CELL_HEIGHT + 5, 10, scrollBarSize);

	canvasCtx.fillRect(width - 15 , CELL_HEIGHT + 5, 10, table.scrollBarSize);
	canvasCtx.strokeRect(width - 15 , CELL_HEIGHT + 5, 10, table.scrollBarSize);

}

function getX(position, totalColumns){

	return (position % totalColumns) * CELL_WIDTH;

}

function getY(position, totalColumns){

	return (Math.floor(position / totalColumns) + 1) * CELL_HEIGHT;

}

function addEventListeners(){

	// const scrollingHandler =  event => {
	//
	//   if(!this.enableScroll) return;
	//
	// 	const delta = event.detail < 0 || event.wheelDelta > 0 ? 1 : -1;
	//
  //   if (delta > 0) { // scrolling down
	//
	// 		if(this.rowCursor - this.totalColumns < 0) this.rowCursor = 0;
	// 		else this.rowCursor -= this.totalColumns;
	//
	// 	} else { // scrolling up
	//
	// 		const maxLimit = this.data.length - ((this.visibleRows - 1) * this.totalColumns);
	//
	// 		if(	this.rowCursor >= maxLimit) this.rowCursor = maxLimit;
	// 		else this.rowCursor += this.totalColumns;
	//
	// 	}
	//
	//   return false;
	//
	// };
	//
	// this.canvasElement.addEventListener('DOMMouseScroll', debounce(scrollingHandler, 50), false);
	// this.canvasElement.addEventListener('mousewheel', debounce(scrollingHandler, 50), false);
	//
	// // this.canvasElement.addEventListener('DOMMouseScroll', scrollingHandler, false);
	// // this.canvasElement.addEventListener('mousewheel', scrollingHandler, false);
	const getCoordenates = (canvas, evt) => {

		var rect = canvas.getBoundingClientRect();

    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };

	};

	const scrollingHandler =  event => {

		const coords = getCoordenates(this.canvasElement, event);

		if(coords.x >= this.width -15 && coords.x <= this.width - 5 && coords.y >= CELL_HEIGHT + 5 && (coords.y - CELL_HEIGHT - 10) <= this.scrollBarSize ){

			console.log('scroll here');

		} else console.log('scroll not');


	  if(!this.enableScroll) return;



	  return false;

	};

	this.canvasElement.addEventListener('mousedown', debounce(scrollingHandler, 50), false);

}

function render(){

	const paint = () => this.paint();

	(function p(fn){

		paint();

		requestAnimationFrame(() => p());

	})();

}

function Table(containerId, options) {

	this.options = options || {};

	createDOMElements.bind(this)(containerId);

	createState.bind(this)();

	addEventListeners.bind(this)();

	// render.bind(this)();

}

//Update Chart Properties
Table.prototype.render = function(data) {

	const entries = R.isArrayLike(data) ? R.flatten(R.map(event => R.values(event), data)) : R.values(data);

	this.data = entries.concat(this.data);

	this.paint();

}

Table.prototype.paint = function() {

	cleanCanvas(this.canvasCtx, this.width, this.height);

	paintTableBorders(this.canvasCtx, this.totalColumns, this.visibleRows);

	paintHeaders(this.canvasCtx, this.headers, this.totalColumns);

	paintBody(this.canvasCtx, this.data, this.totalColumns, this.rowCursor, this.visibleRows);

	if(this.data.length/this.totalColumns >= this.visibleRows) {

		this.enableScroll = true;

		paintScroll(this, this.canvasCtx, this.width, this.visibleRows-1, this.data.length/this.totalColumns);

	}

}

export default Table;
