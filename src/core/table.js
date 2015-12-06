
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
	this.scrollBarOffset = 0;
	this.lastScrollBarOffset = 0;
	this.scrollActived = false;

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

function paintBody(canvasCtx, data, headers, totalColumns, rowCursor, visibleRows){

	// console.log(R.range(rowCursor, (rowCursor + visibleRows - 1)*totalColumns));

	let i = 0;

	for(let row of R.range(0, visibleRows - 1)){

		if(row >= R.length(data)) break;

		for(let header of headers){

			const x = getX(i, totalColumns);
			const y = getY(i, totalColumns)

			// paintCell(canvasCtx, x, y);
			paintText(canvasCtx, data[row+rowCursor][header], x, y);

			i++;

		}

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

function paintScroll(table, canvasCtx, width, visibleRows, totalElements, totalColumns){

	const totalSize = (visibleRows * CELL_HEIGHT) - 10;
	const scrollBarSize = totalSize - (totalElements - (visibleRows * totalColumns));

	table.scrollBarSize = scrollBarSize < 30 ? 30 : scrollBarSize;

	// drawEllipse(canvasCtx, width - 15 , CELL_HEIGHT + 5, 10, scrollBarSize);

	canvasCtx.fillStyle = "#bbb";
	canvasCtx.fillRect(width - 15 , CELL_HEIGHT + 5 + table.scrollBarOffset, 10, table.scrollBarSize);
	canvasCtx.fillStyle = "transparent";
	canvasCtx.strokeRect(width - 15 , CELL_HEIGHT + 5 + table.scrollBarOffset, 10, table.scrollBarSize);

}

function getX(position, totalColumns){

	return (position % totalColumns) * CELL_WIDTH;

}

function getY(position, totalColumns){

	return (Math.floor(position / totalColumns) + 1) * CELL_HEIGHT;

}

function addEventListeners(){

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

	const mousedownHandler =  event => {

		const coords = getCoordenates(this.canvasElement, event);

		if(coords.x >= this.width -15 &&
			coords.x <= this.width - 5 &&
			coords.y >= (CELL_HEIGHT + 5 + this.scrollBarOffset) &&
			coords.y <= (CELL_HEIGHT + 5 + this.scrollBarOffset + this.scrollBarSize) ){

				this.lastYposition = coords.y;
				this.enableScroll = true;

		}

	  return false;

	};

	const mousemoveHandler = event => {

		if(!this.enableScroll) return;

		const coords = getCoordenates(this.canvasElement, event);
		const offset = this.scrollBarOffset + (coords.y - this.lastYposition);
		const total = this.height - CELL_HEIGHT -10 - this.scrollBarSize;
		const maxLimit = this.data.length;

		this.scrollBarOffset = offset < 0 ? 0 : offset;

		if(CELL_HEIGHT + 10 + this.scrollBarOffset + this.scrollBarSize >= this.height){
			this.scrollBarOffset = total;
		}

		this.lastYposition = coords.y;

		const row = Math.ceil((this.scrollBarOffset/total) * maxLimit);
		const max = this.data.length - ((this.visibleRows - 1));

		this.rowCursor = row >= max ? max : row;

		this.paint();

	};

	// const mouseupHandler = event => {
	//
	// 	this.enableScroll = false;
	//
	// };

	const mouseoutHandler = event => {

		// this.enableScroll = false;

	}
	const mouseenterHandler = event => {

		// this.enableScroll = false;

	}

	const documentMouseupHandler = event => {

		this.enableScroll = false;

	};

	const mouseWheelHandler = event => {

	  if(!this.scrolling) return false;

		// const delta = event.detail < 0 || event.wheelDelta > 0 ? 1 : -1;
		if(event.wheelDelta == 0) return false;

    if (event.wheelDelta > 0) { // scrolling down

			if(this.rowCursor - 1 < 0){

				this.scrollBarOffset = 0;
				this.rowCursor = 0;

			}
			else {

				// this.scrollBarOffset -= this.totalColumns;
				this.rowCursor--;
				this.scrollBarOffset = (this.rowCursor/this.data.length) * (this.height - CELL_HEIGHT -10 - this.scrollBarSize);

			}

		} else if(event.wheelDelta < 0){ // scrolling up

			const maxLimit = this.data.length - (this.visibleRows - 1);

			if(	this.rowCursor >= maxLimit){

				this.scrollBarOffset = this.height - CELL_HEIGHT -10 - this.scrollBarSize;
				this.rowCursor = maxLimit;

			}
			else{

				this.rowCursor++;
				this.scrollBarOffset = (this.rowCursor/this.data.length) * (this.height - CELL_HEIGHT -10 - this.scrollBarSize);

			}

		}

		this.paint();

	  return false;

	};

	this.canvasElement.addEventListener('mousedown', debounce(mousedownHandler, 50), false);
	this.canvasElement.addEventListener('mousemove', mousemoveHandler, false);
	// this.canvasElement.addEventListener('mouseup', debounce(mouseupHandler, 50), false);
	this.canvasElement.addEventListener('mouseout', debounce(mouseoutHandler, 10), false);
	this.canvasElement.addEventListener('mouseenter', debounce(mouseenterHandler, 10), false);
	this.canvasElement.addEventListener('mousewheel', mouseWheelHandler, false);
	// this.canvasElement.addEventListener('DOMMouseScroll', mouseWheelHandler, false);

	document.addEventListener('mouseup', debounce(documentMouseupHandler, 50), false);
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

	// const entries = R.isArrayLike(data) ? R.flatten(R.map(event => R.values(event), data)) : R.values(data);

	if(data) this.data = data.concat(this.data);

	this.paint();

}

Table.prototype.paint = function() {

	cleanCanvas(this.canvasCtx, this.width, this.height);

	paintTableBorders(this.canvasCtx, this.totalColumns, this.visibleRows);

	paintHeaders(this.canvasCtx, this.headers, this.totalColumns);

	paintBody(this.canvasCtx, this.data, this.headers, this.totalColumns, this.rowCursor, this.visibleRows);

	if(this.data.length >= this.visibleRows) {

		this.scrolling = true;

		paintScroll(this, this.canvasCtx, this.width, this.visibleRows-1, this.data.length, this.totalColumns);

	}

}

export default Table;
