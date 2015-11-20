

	function Chart(containerId, options, publicChartReference) {

		this._publicChartReference = publicChartReference;

		options = options || {};

		Chart.base.constructor.call(this, "Chart", options, options.theme ? options.theme : "theme1");

		var _this = this;


		this._containerId = containerId;
		this._objectsInitialized = false;
		this.ctx = null;
		this.overlaidCanvasCtx = null;
		this._indexLabels = [];
		this._panTimerId = 0;
		this._lastTouchEventType = "";
		this._lastTouchData = null;
		this.isAnimating = false;
		this.renderCount = 0;
		this.animatedRender = false;
		this.disableToolTip = false;


		this.panEnabled = false;
		this._defaultCursor = "default";
		this.plotArea = { canvas: null, ctx: null, x1: 0, y1: 0, x2: 0, y2: 0, width: 0, height: 0 };
		this._dataInRenderedOrder = [];

		this._container = typeof (this._containerId) === "string" ? document.getElementById(this._containerId) : this._containerId;

		if (!this._container) {
			if (window.console)
				window.console.log("CanvasJS Error: Chart Container with id \"" + this._containerId + "\" was not found");
			return;
		}

		this._container.innerHTML = "";

		var width = 0;
		var height = 0;

		if (this._options.width)
			width = this.width;
		else
			width = this._container.clientWidth > 0 ? this._container.clientWidth : this.width;

		if (this._options.height)
			height = this.height;
		else
			height = this._container.clientHeight > 0 ? this._container.clientHeight : this.height;

		this.width = width;
		this.height = height;

		this.x1 = this.y1 = 0;
		this.x2 = this.width;
		this.y2 = this.height;


		this._selectedColorSet = typeof (colorSets[this.colorSet]) !== "undefined" ? colorSets[this.colorSet] : colorSets["colorSet1"];

		this._canvasJSContainer = document.createElement("div");
		this._canvasJSContainer.setAttribute("class", "canvasjs-chart-container");

		this._canvasJSContainer.style.position = "relative";
		this._canvasJSContainer.style.textAlign = "left";
		this._canvasJSContainer.style.cursor = "auto";
		if (!isCanvasSupported) {
			this._canvasJSContainer.style.height = "0px";//In IE6 toolTip doesn't show at proper position if not set.
		}
		this._container.appendChild(this._canvasJSContainer);


		this.canvas = createCanvas(width, height);

		this.canvas.style.position = "absolute";
		if (this.canvas.getContext) {
			//try {
			//	this.canvas.style.background = this.backgroundColor;
			//} catch (e) { }
			this._canvasJSContainer.appendChild(this.canvas);
			this.ctx = this.canvas.getContext("2d");
			this.ctx.textBaseline = "top";
			extendCtx(this.ctx);
		} else
			return;

		//this.canvas.style.cursor = "pointer";

		if (!isCanvasSupported) {
			this.plotArea.canvas = createCanvas(width, height);
			this.plotArea.canvas.style.position = "absolute";
			this.plotArea.canvas.setAttribute("class", "plotAreaCanvas");
			this._canvasJSContainer.appendChild(this.plotArea.canvas);

			this.plotArea.ctx = this.plotArea.canvas.getContext("2d");
		} else {
			this.plotArea.ctx = this.ctx;
		}

		this.overlaidCanvas = createCanvas(width, height);
		this.overlaidCanvas.style.position = "absolute";
		this._canvasJSContainer.appendChild(this.overlaidCanvas);
		this.overlaidCanvasCtx = this.overlaidCanvas.getContext("2d");
		this.overlaidCanvasCtx.textBaseline = "top";

		this._eventManager = new EventManager(this);

		addEvent(window, "resize", function () {
			//this._container.addEventListener("DOMSubtreeModified", function () {

			if (_this._updateSize())
				_this.render();
		});


		this._toolBar = document.createElement("div");
		this._toolBar.setAttribute("class", "canvasjs-chart-toolbar");
		this._toolBar.style.cssText = "position: absolute; right: 1px; top: 1px;";
		this._canvasJSContainer.appendChild(this._toolBar);


		this.bounds = { x1: 0, y1: 0, x2: this.width, y2: this.height };

		addEvent(this.overlaidCanvas, 'click', function (e) {
			_this._mouseEventHandler(e);
		});

		addEvent(this.overlaidCanvas, 'mousemove', function (e) {
			_this._mouseEventHandler(e);
		});

		addEvent(this.overlaidCanvas, 'mouseup', function (e) {
			_this._mouseEventHandler(e);
		});

		addEvent(this.overlaidCanvas, 'mousedown', function (e) {
			_this._mouseEventHandler(e);
			hide(_this._dropdownMenu);
		});

		addEvent(this.overlaidCanvas, 'mouseout', function (e) {
			_this._mouseEventHandler(e);
		});


		addEvent(this.overlaidCanvas, window.navigator.msPointerEnabled ? "MSPointerDown" : "touchstart", function (e) {
			_this._touchEventHandler(e);
		});

		addEvent(this.overlaidCanvas, window.navigator.msPointerEnabled ? "MSPointerMove" : 'touchmove', function (e) {
			_this._touchEventHandler(e);
		});

		addEvent(this.overlaidCanvas, window.navigator.msPointerEnabled ? "MSPointerUp" : 'touchend', function (e) {
			_this._touchEventHandler(e);
		});

		addEvent(this.overlaidCanvas, window.navigator.msPointerEnabled ? "MSPointerCancel" : 'touchcancel', function (e) {
			_this._touchEventHandler(e);
		});

		if (!this._creditLink) {
			this._creditLink = document.createElement("a");
			this._creditLink.setAttribute("class", "canvasjs-chart-credit");
			this._creditLink.setAttribute("style", "outline:none;margin:0px;position:absolute;right:3px;top:" + (this.height - 14) + "px;color:dimgrey;text-decoration:none;font-size:10px;font-family:Lucida Grande, Lucida Sans Unicode, Arial, sans-serif");

			this._creditLink.setAttribute("tabIndex", -1);

			this._creditLink.setAttribute("target", "_blank");
		}

		this._toolTip = new ToolTip(this, this._options.toolTip, this.theme);


		this.data = null;
		this.axisX = null;
		this.axisY = null;
		this.axisY2 = null;



		this.sessionVariables = {
			axisX: {},
			axisY: {},
			axisY2: {}
		};
	}

	extend(Chart, CanvasJSObject);

	//Update Chart Properties
	Chart.prototype._updateOptions = function () {
		var _this = this;

		this.updateOption("width");
		this.updateOption("height");
		this.updateOption("dataPointMaxWidth");
		this.updateOption("interactivityEnabled");
		this.updateOption("theme");

		if (this.updateOption("colorSet"))
			this._selectedColorSet = typeof (colorSets[this.colorSet]) !== "undefined" ? colorSets[this.colorSet] : colorSets["colorSet1"];

		this.updateOption("backgroundColor");
		if (!this.backgroundColor)
			this.backgroundColor = "rgba(0,0,0,0)";

		this.updateOption("culture");
		this._cultureInfo = new CultureInfo(this._options.culture);

		this.updateOption("animationEnabled");
		this.animationEnabled = this.animationEnabled && isCanvasSupported;
		this.updateOption("animationDuration");

		this.updateOption("rangeChanging");
		this.updateOption("rangeChanged");

		//Need to check this._options.zoomEnabled because this.zoomEnabled is used internally to keep track of state - and hence changes.
		if (this._options.zoomEnabled) {

			if (!this._zoomButton) {

				hide(this._zoomButton = document.createElement("button"));

				setButtonState(this, this._zoomButton, "pan");

				this._toolBar.appendChild(this._zoomButton);
				addEvent(this._zoomButton, "click", function () {
					if (_this.zoomEnabled) {
						_this.zoomEnabled = false;
						_this.panEnabled = true;

						setButtonState(_this, _this._zoomButton, "zoom");

					} else {
						_this.zoomEnabled = true;
						_this.panEnabled = false;

						setButtonState(_this, _this._zoomButton, "pan");
					}

					_this.render();
				});
			}


			if (!this._resetButton) {
				hide(this._resetButton = document.createElement("button"));
				setButtonState(this, this._resetButton, "reset");
				this._toolBar.appendChild(this._resetButton);

				addEvent(this._resetButton, "click", function () {

					_this._toolTip.hide();

					if (_this.zoomEnabled || _this.panEnabled) {
						_this.zoomEnabled = true;
						_this.panEnabled = false;
						setButtonState(_this, _this._zoomButton, "pan");

						_this._defaultCursor = "default";
						_this.overlaidCanvas.style.cursor = _this._defaultCursor;
					} else {
						_this.zoomEnabled = false;
						_this.panEnabled = false;
					}
					//Reset axisX
					if (_this.sessionVariables.axisX) {
						_this.sessionVariables.axisX.newViewportMinimum = null;
						_this.sessionVariables.axisX.newViewportMaximum = null;
					}

					//Reset axisY
					if (_this.sessionVariables.axisY) {
						_this.sessionVariables.axisY.newViewportMinimum = null;
						_this.sessionVariables.axisY.newViewportMaximum = null;
					}

					//Reset axisY2
					if (_this.sessionVariables.axisY2) {
						_this.sessionVariables.axisY2.newViewportMinimum = null;
						_this.sessionVariables.axisY2.newViewportMaximum = null;
					}

					_this.resetOverlayedCanvas();

					hide(_this._zoomButton, _this._resetButton);

					_this._dispatchRangeEvent("rangeChanging", "reset");
					_this.render();
					_this._dispatchRangeEvent("rangeChanged", "reset");
				});

				this.overlaidCanvas.style.cursor = _this._defaultCursor;
			}

			if (!this.zoomEnabled && !this.panEnabled) {
				if (!this._zoomButton) {
					this.zoomEnabled = true;
					this.panEnabled = false;
				} else {

					if (_this._zoomButton.getAttribute("state") === _this._cultureInfo.zoomText) {
						this.panEnabled = true;
						this.zoomEnabled = false;
					}
					else {
						this.zoomEnabled = true;
						this.panEnabled = false;
					}

					show(_this._zoomButton, _this._resetButton);
				}
			}



		} else {
			this.zoomEnabled = false;
			this.panEnabled = false;
		}



		if (this._menuButton) {
			if (this.exportEnabled)
				show(this._menuButton);
			else
				hide(this._menuButton);
		} else if (this.exportEnabled && isCanvasSupported) {
			this._menuButton = document.createElement("button");
			setButtonState(this, this._menuButton, "menu");
			this._toolBar.appendChild(this._menuButton);

			addEvent(this._menuButton, "click", function () {
				if (_this._dropdownMenu.style.display === "none") {

					if (_this._dropDownCloseTime && ((new Date()).getTime() - _this._dropDownCloseTime.getTime() <= 500))
						return;

					_this._dropdownMenu.style.display = "block";
					_this._menuButton.blur();
					_this._dropdownMenu.focus();
				}

			}, true);
		}


		if (!this._dropdownMenu && this.exportEnabled && isCanvasSupported) {
			this._dropdownMenu = document.createElement("div");
			this._dropdownMenu.setAttribute("tabindex", -1);
			this._dropdownMenu.style.cssText = "position: absolute; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; cursor: pointer;right: 1px;top: 25px;min-width: 120px;outline: 0;border: 1px solid silver;font-size: 14px;font-family: Calibri, Verdana, sans-serif;padding: 5px 0px 5px 0px;text-align: left;background-color: #fff;line-height: 20px;box-shadow: 2px 2px 10px #888888;";
			_this._dropdownMenu.style.display = "none";
			this._toolBar.appendChild(this._dropdownMenu);

			addEvent(this._dropdownMenu, "blur", function () {
				hide(_this._dropdownMenu);

				_this._dropDownCloseTime = new Date();
			}, true);

			var exportOption = document.createElement("div");
			exportOption.style.cssText = "padding: 2px 15px 2px 10px"
			exportOption.innerHTML = this._cultureInfo.saveJPGText;
			this._dropdownMenu.appendChild(exportOption);

			addEvent(exportOption, "mouseover", function () {
				this.style.backgroundColor = "#EEEEEE";
			}, true);

			addEvent(exportOption, "mouseout", function () {
				this.style.backgroundColor = "transparent";
			}, true);

			addEvent(exportOption, "click", function () {
				exportCanvas(_this.canvas, "jpg", _this.exportFileName);
				hide(_this._dropdownMenu);
			}, true);

			var exportOption = document.createElement("div");
			exportOption.style.cssText = "padding: 2px 15px 2px 10px"
			exportOption.innerHTML = this._cultureInfo.savePNGText;
			this._dropdownMenu.appendChild(exportOption);

			addEvent(exportOption, "mouseover", function () {
				this.style.backgroundColor = "#EEEEEE";
			}, true);

			addEvent(exportOption, "mouseout", function () {
				this.style.backgroundColor = "transparent";
			}, true);

			addEvent(exportOption, "click", function () {
				exportCanvas(_this.canvas, "png", _this.exportFileName);
				hide(_this._dropdownMenu);
			}, true);
		}


		if (this._toolBar.style.display !== "none" && this._zoomButton) {

			this.panEnabled ? setButtonState(_this, _this._zoomButton, "zoom") : setButtonState(_this, _this._zoomButton, "pan");


			if (_this._resetButton.getAttribute("state") !== _this._cultureInfo.resetText)
				setButtonState(_this, _this._resetButton, "reset");
		}

		if (typeof (defaultOptions.Chart.creditHref) === "undefined") {
			this.creditHref = "http://canvasjs.com/";
			this.creditText = "CanvasJS.com";
		} else {
			var creditTextChanged = this.updateOption("creditText");
			var creditHrefChanged = this.updateOption("creditHref");
		}

		if (this.renderCount === 0 || (creditTextChanged || creditHrefChanged)) {
			this._creditLink.setAttribute("href", this.creditHref);
			this._creditLink.innerHTML = this.creditText;
		}

		if (this.creditHref && this.creditText) {
			if (!this._creditLink.parentElement)
				this._canvasJSContainer.appendChild(this._creditLink);
		}
		else if (this._creditLink.parentElement)
			this._canvasJSContainer.removeChild(this._creditLink);

		if (this._options.toolTip && this._toolTip._options !== this._options.toolTip)
			this._toolTip._options = this._options.toolTip

		for (var prop in this._toolTip._options) {

			if (this._toolTip._options.hasOwnProperty(prop)) {
				this._toolTip.updateOption(prop);
			}
		}

	}

	Chart.prototype._updateSize = function () {
		var width = 0;
		var height = 0;

		if (this._options.width)
			width = this.width;
		else
			this.width = width = this._container.clientWidth > 0 ? this._container.clientWidth : this.width;

		if (this._options.height)
			height = this.height;
		else
			this.height = height = this._container.clientHeight > 0 ? this._container.clientHeight : this.height;

		if (this.canvas.width !== width * devicePixelBackingStoreRatio || this.canvas.height !== height * devicePixelBackingStoreRatio) {
			setCanvasSize(this.canvas, width, height);

			setCanvasSize(this.overlaidCanvas, width, height);
			setCanvasSize(this._eventManager.ghostCanvas, width, height);

			return true;
		}

		return false;
	}

	// initialize chart objects
	Chart.prototype._initialize = function () {
		///<signature>
		///<summary>Initializes Chart objects/state. Creates DataSeries class instance for each DataSeries provided by ther user. Sets the Axis Type based on the user data</summary>
		///</signature>
		//this.width = this.width;

		if (!this._animator)
			this._animator = new Animator(this);
		else {
			this._animator.cancelAllAnimations();
		}

		this.removeAllEventListeners();

		this.disableToolTip = false;

		this._axes = [];

		this.pieDoughnutClickHandler = null;
		//this._touchCurrentCoordinates = null;

		if (this.animationRequestId)
			this.cancelRequestAnimFrame.call(window, this.animationRequestId);

		this._updateOptions();

		this.animatedRender = isCanvasSupported && this.animationEnabled && (this.renderCount === 0);

		this._updateSize();

		//this._selectedColorSet = colorSets["colorSet2"];

		//this.ctx.clearRect(0, 0, this.width, this.height);
		this.clearCanvas();
		this.ctx.beginPath();

		this.axisX = null;
		this.axisY = null;
		this.axisY2 = null;
		this._indexLabels = [];
		this._dataInRenderedOrder = [];

		this._events = [];
		if (this._eventManager)
			this._eventManager.reset();

		this.plotInfo = {
			axisPlacement: null,
			axisXValueType: null,
			plotTypes: []//array of plotType: {type:"", axisYType: "primary", dataSeriesIndexes:[]}
		};

		this.layoutManager = new LayoutManager(0, 0, this.width, this.height, 2);

		if (this.plotArea.layoutManager)
			this.plotArea.layoutManager.reset();


		this.data = [];
		var dataSeriesIndex = 0;

		for (var series = 0; series < this._options.data.length; series++) {
			//for (series in this._options.data) {

			dataSeriesIndex++;

			if (!(!this._options.data[series].type || Chart._supportedChartTypes.indexOf(this._options.data[series].type) >= 0))
				continue;

			var dataSeries = new DataSeries(this, this._options.data[series], this.theme, dataSeriesIndex - 1, ++this._eventManager.lastObjectId);
			if (dataSeries.name === null)
				dataSeries.name = "DataSeries " + (dataSeriesIndex);

			if (dataSeries.color === null) {
				if (this._options.data.length > 1) {
					dataSeries._colorSet = [this._selectedColorSet[dataSeries.index % this._selectedColorSet.length]];
					dataSeries.color = this._selectedColorSet[dataSeries.index % this._selectedColorSet.length];
				} else {
					if (dataSeries.type === "line" || dataSeries.type === "stepLine" || dataSeries.type === "spline" || dataSeries.type === "area"
						|| dataSeries.type === "stepArea" || dataSeries.type === "splineArea" || dataSeries.type === "stackedArea" || dataSeries.type === "stackedArea100"
						|| dataSeries.type === "rangeArea" || dataSeries.type === "rangeSplineArea" || dataSeries.type === "candlestick" || dataSeries.type === "ohlc") {
						dataSeries._colorSet = [this._selectedColorSet[0]];
					}
					else
						dataSeries._colorSet = this._selectedColorSet;
				}
			} else {
				dataSeries._colorSet = [dataSeries.color];
			}

			if (dataSeries.markerSize === null) {
				if (((dataSeries.type === "line" || dataSeries.type === "stepLine" || dataSeries.type === "spline") && dataSeries.dataPoints && dataSeries.dataPoints.length < this.width / 16) || dataSeries.type === "scatter") {
					//if (dataSeries.type === "line") {
					dataSeries.markerSize = 8;
				}
			}

			if ((dataSeries.type === "bubble" || dataSeries.type === "scatter") && dataSeries.dataPoints) {
				dataSeries.dataPoints.sort(compareDataPointX)
			}

			//if (dataSeries.markerBorderThickness === null && dataSeries.type === "scatter") {
			//    dataSeries.markerBorderThickness = 2;
			//}

			//if (dataSeries.markerType === null) {
			//    if (dataSeries.type === "line" & dataSeries.dataPoints.length < 500) {
			//        dataSeries.markerType = "circle";
			//    }
			//}

			this.data.push(dataSeries);

			var seriesAxisPlacement = dataSeries.axisPlacement;

			//if (isDebugMode && window.console)
			//    window.console.log(dataSeries.type);

			var errorMessage;

			if (seriesAxisPlacement === "normal") {

				if (this.plotInfo.axisPlacement === "xySwapped") {
					errorMessage = "You cannot combine \"" + dataSeries.type + "\" with bar chart";
				} else if (this.plotInfo.axisPlacement === "none") {
					errorMessage = "You cannot combine \"" + dataSeries.type + "\" with pie chart";
				} else if (this.plotInfo.axisPlacement === null)
					this.plotInfo.axisPlacement = "normal";
			}
			else if (seriesAxisPlacement === "xySwapped") {

				if (this.plotInfo.axisPlacement === "normal") {
					errorMessage = "You cannot combine \"" + dataSeries.type + "\" with line, area, column or pie chart";
				} else if (this.plotInfo.axisPlacement === "none") {
					errorMessage = "You cannot combine \"" + dataSeries.type + "\" with pie chart";
				} else if (this.plotInfo.axisPlacement === null)
					this.plotInfo.axisPlacement = "xySwapped";
			}
			else if (seriesAxisPlacement == "none") {

				if (this.plotInfo.axisPlacement === "normal") {
					errorMessage = "You cannot combine \"" + dataSeries.type + "\" with line, area, column or bar chart";
				} else if (this.plotInfo.axisPlacement === "xySwapped") {
					errorMessage = "You cannot combine \"" + dataSeries.type + "\" with bar chart";
				} else if (this.plotInfo.axisPlacement === null)
					this.plotInfo.axisPlacement = "none";
			}

			if (errorMessage && window.console) {
				window.console.log(errorMessage);
				return;
			}
		}

		//if (isDebugMode && window.console) {
		//    window.console.log("xMin: " + this.plotInfo.viewPortXMin + "; xMax: " + this.plotInfo.viewPortXMax + "; yMin: " + this.plotInfo.yMin + "; yMax: " + this.plotInfo.yMax);
		//}

		this._objectsInitialized = true;
	}

	//indexOf is not supported in IE8-
	Chart._supportedChartTypes = addArrayIndexOf(["line", "stepLine", "spline", "column", "area", "stepArea", "splineArea", "bar", "bubble", "scatter",
		"stackedColumn", "stackedColumn100", "stackedBar", "stackedBar100",
		"stackedArea", "stackedArea100",
		"candlestick",
		"ohlc",
		"rangeColumn",
		"rangeBar",
		"rangeArea",
		"rangeSplineArea",
		"pie", "doughnut", "funnel"
	]);

	Chart.prototype.render = function (options) {
		if (options)
			this._options = options;

		this._initialize();
		var plotAreaElements = []; //Elements to be rendered inside the plotArea

		//Create Primary and Secondary axis and assign them to the series
		for (var i = 0; i < this.data.length; i++) {

			if (this.plotInfo.axisPlacement === "normal" || this.plotInfo.axisPlacement === "xySwapped") {
				if (!this.data[i].axisYType || this.data[i].axisYType === "primary") {
					if (!this.axisY) {

						if (this.plotInfo.axisPlacement === "normal") {
							this._axes.push(this.axisY = new Axis(this, this._options.axisY, "axisY", "left"));
						}
						else if (this.plotInfo.axisPlacement === "xySwapped") {
							this._axes.push(this.axisY = new Axis(this, this._options.axisY, "axisY", "bottom"));
						}
					}
					this.data[i].axisY = this.axisY;
				}
				else if (this.data[i].axisYType === "secondary") {
					if (!this.axisY2) {
						if (this.plotInfo.axisPlacement === "normal") {
							this._axes.push(this.axisY2 = new Axis(this, this._options.axisY2, "axisY", "right"));
						}
						else if (this.plotInfo.axisPlacement === "xySwapped") {
							this._axes.push(this.axisY2 = new Axis(this, this._options.axisY2, "axisY", "top"));
						}
					}
					this.data[i].axisY = this.axisY2;
				}

				if (!this.axisX) {
					if (this.plotInfo.axisPlacement === "normal") {
						this._axes.push(this.axisX = new Axis(this, this._options.axisX, "axisX", "bottom"));
					} else if (this.plotInfo.axisPlacement === "xySwapped") {
						this._axes.push(this.axisX = new Axis(this, this._options.axisX, "axisX", "left"));
					}
				}

				this.data[i].axisX = this.axisX;
			}
		}

		//If Both Primary and Secondary axis are present, disable gridlines for one of them unless the user has set value for both
		if (this.axisY && this.axisY2) {
			if (this.axisY.gridThickness > 0 && typeof (this.axisY2._options.gridThickness) === "undefined")
				this.axisY2.gridThickness = 0;
			else if (this.axisY2.gridThickness > 0 && typeof (this.axisY._options.gridThickness) === "undefined")
				this.axisY.gridThickness = 0;
		}


		//Show toolBar when viewportMinimum/viewportMaximum are set
		var showToolBar = false;
		if (this._axes.length > 0 && (this.zoomEnabled || this.panEnabled)) {
			for (var i = 0; i < this._axes.length; i++) {
				if (this._axes[i].viewportMinimum !== null || this._axes[i].viewportMaximum !== null) {
					showToolBar = true;
					break;
				}
			}
		}

		if (showToolBar) {
			show(this._zoomButton, this._resetButton);
		} else {
			hide(this._zoomButton, this._resetButton);
		}


		this._processData();// Categorises the dataSeries and calculates min, max and other values

		if (this._options.title) {
			this._title = new Title(this, this._options.title);

			if (!this._title.dockInsidePlotArea)
				this._title.render();
			else
				plotAreaElements.push(this._title);
		}

		if (this._options.subtitles) {
			for (var i = 0; i < this._options.subtitles.length; i++) {

				this.subtitles = [];

				var subtitle = new Subtitle(this, this._options.subtitles[i]);
				this.subtitles.push(subtitle);

				if (!subtitle.dockInsidePlotArea)
					subtitle.render();
				else
					plotAreaElements.push(subtitle);
			}
		}

		this.legend = new Legend(this, this._options.legend, this.theme);
		for (var i = 0; i < this.data.length; i++) {
			if (this.data[i].showInLegend || this.data[i].type === "pie" || this.data[i].type === "doughnut") {
				this.legend.dataSeries.push(this.data[i]);
			}
		}

		if (!this.legend.dockInsidePlotArea)
			this.legend.render();
		else
			plotAreaElements.push(this.legend);

		//TBI: Revisit and check if the functionality is enough.
		if (this.plotInfo.axisPlacement === "normal" || this.plotInfo.axisPlacement === "xySwapped") {

			//var freeSpace = this.layoutManager.getFreeSpace();

			Axis.setLayoutAndRender(this.axisX, this.axisY, this.axisY2, this.plotInfo.axisPlacement, this.layoutManager.getFreeSpace());
		} else if (this.plotInfo.axisPlacement === "none") {
			//In case of charts with axis this method is called inside setLayoutAndRender
			this.preparePlotArea();
		}
		else {
			return;
		}

		var index = 0;
		for (index in plotAreaElements) {
			if(plotAreaElements.hasOwnProperty(index))
			plotAreaElements[index].render();
		}

		var animations = [];
		if (this.animatedRender) {
			var initialState = createCanvas(this.width, this.height);
			var initialStateCtx = initialState.getContext("2d");
			initialStateCtx.drawImage(this.canvas, 0, 0, this.width, this.height);
		}

		for (var i = 0; i < this.plotInfo.plotTypes.length; i++) {
			var plotType = this.plotInfo.plotTypes[i];

			for (var j = 0; j < plotType.plotUnits.length; j++) {

				var plotUnit = plotType.plotUnits[j];
				var animationInfo = null;

				plotUnit.targetCanvas = null; //In case chart updates before the animation is complete, previous canvases need to be removed

				if (this.animatedRender) {
					plotUnit.targetCanvas = createCanvas(this.width, this.height);
					plotUnit.targetCanvasCtx = plotUnit.targetCanvas.getContext("2d");
				}

				if (plotUnit.type === "line")
					animationInfo = this.renderLine(plotUnit);
				else if (plotUnit.type === "stepLine")
					animationInfo = this.renderStepLine(plotUnit);
				else if (plotUnit.type === "spline")
					animationInfo = this.renderSpline(plotUnit);
				else if (plotUnit.type === "column")
					animationInfo = this.renderColumn(plotUnit);
				else if (plotUnit.type === "bar")
					animationInfo = this.renderBar(plotUnit);
				else if (plotUnit.type === "area")
					animationInfo = this.renderArea(plotUnit);
				else if (plotUnit.type === "stepArea")
					animationInfo = this.renderStepArea(plotUnit);
				else if (plotUnit.type === "splineArea")
					animationInfo = this.renderSplineArea(plotUnit);
				else if (plotUnit.type === "stackedColumn")
					animationInfo = this.renderStackedColumn(plotUnit);
				else if (plotUnit.type === "stackedColumn100")
					animationInfo = this.renderStackedColumn100(plotUnit);
				else if (plotUnit.type === "stackedBar")
					animationInfo = this.renderStackedBar(plotUnit);
				else if (plotUnit.type === "stackedBar100")
					animationInfo = this.renderStackedBar100(plotUnit);
				else if (plotUnit.type === "stackedArea")
					animationInfo = this.renderStackedArea(plotUnit);
				else if (plotUnit.type === "stackedArea100")
					animationInfo = this.renderStackedArea100(plotUnit);
				else if (plotUnit.type === "bubble")
					animationInfo = animationInfo = this.renderBubble(plotUnit);
				else if (plotUnit.type === "scatter")
					animationInfo = this.renderScatter(plotUnit);
				else if (plotUnit.type === "pie")
					this.renderPie(plotUnit);
				else if (plotUnit.type === "doughnut")
					this.renderPie(plotUnit);
				else if (plotUnit.type === "candlestick")
					animationInfo = this.renderCandlestick(plotUnit);
				else if (plotUnit.type === "ohlc")
					animationInfo = this.renderCandlestick(plotUnit);
				else if (plotUnit.type === "rangeColumn")
					animationInfo = this.renderRangeColumn(plotUnit);
				else if (plotUnit.type === "rangeBar")
					animationInfo = this.renderRangeBar(plotUnit);
				else if (plotUnit.type === "rangeArea")
					animationInfo = this.renderRangeArea(plotUnit);
				else if (plotUnit.type === "rangeSplineArea")
					animationInfo = this.renderRangeSplineArea(plotUnit);

				for (var k = 0; k < plotUnit.dataSeriesIndexes.length; k++) {
					this._dataInRenderedOrder.push(this.data[plotUnit.dataSeriesIndexes[k]]);
				}

				if (this.animatedRender && animationInfo)
					animations.push(animationInfo);
			}
		}

		if (this.animatedRender && this._indexLabels.length > 0) {
			var indexLabelCanvas = createCanvas(this.width, this.height);
			var indexLabelCanvasCtx = indexLabelCanvas.getContext("2d");
			animations.push(this.renderIndexLabels(indexLabelCanvasCtx));
		}

		var _this = this;

		if (animations.length > 0) {
			//var animationCount = 0;
			_this.disableToolTip = true;
			_this._animator.animate(200, _this.animationDuration, function (fractionComplete) {

				//console.log(fractionComplete);
				//animationCount++;

				_this.ctx.clearRect(0, 0, _this.width, _this.height);


				//  _this.ctx.drawImage(initialState, 0, 0, _this.width * devicePixelBackingStoreRatio, _this.height * devicePixelBackingStoreRatio, 0, 0, _this.width, _this.height);
				_this.ctx.drawImage(initialState, 0, 0, Math.floor(_this.width * devicePixelBackingStoreRatio), Math.floor(_this.height * devicePixelBackingStoreRatio), 0, 0, _this.width, _this.height);

				for (var l = 0; l < animations.length; l++) {

					animationInfo = animations[l];

					if (fractionComplete < 1 && typeof (animationInfo.startTimePercent) !== "undefined") {
						if (fractionComplete >= animationInfo.startTimePercent) {
							//animationInfo.animationCallback(AnimationHelper.easing.linear(fractionComplete - animationInfo.startTimePercent, 0, 1, 1 - animationInfo.startTimePercent), animationInfo);

							animationInfo.animationCallback(animationInfo.easingFunction(fractionComplete - animationInfo.startTimePercent, 0, 1, 1 - animationInfo.startTimePercent), animationInfo);
						}
					} else {

						animationInfo.animationCallback(animationInfo.easingFunction(fractionComplete, 0, 1, 1), animationInfo);
					}
				}

				_this.dispatchEvent("dataAnimationIterationEnd",
									{
										chart: _this
									});

			}, function () {

				animations = [];

				var count = 0;

				//Delete all render target canvases used for animation.
				for (var i = 0; i < _this.plotInfo.plotTypes.length; i++) {
					var plotType = _this.plotInfo.plotTypes[i];

					for (var j = 0; j < plotType.plotUnits.length; j++) {
						var plotUnit = plotType.plotUnits[j];
						plotUnit.targetCanvas = null;
					}
				}

				initialState = null;
				_this.disableToolTip = false;
				//console.log("*********** Animation Complete - " + animationCount + " ***********");

			});
		} else {
			if (_this._indexLabels.length > 0)
				_this.renderIndexLabels();

			_this.dispatchEvent("dataAnimationIterationEnd",
					{
						chart: _this
					});
		}

		this.attachPlotAreaEventHandlers();

		if (!this.zoomEnabled && !this.panEnabled && this._zoomButton && this._zoomButton.style.display !== "none") {
			hide(this._zoomButton, this._resetButton);
		}

		this._toolTip._updateToolTip();

		this.renderCount++;

		//if (window.console) {
		//    window.console.log(new Date().getTime() - dt);
		//}

		if (isDebugMode) {

			var _this = this;
			setTimeout(function () {
				var ghostCanvasCopy = document.getElementById("ghostCanvasCopy");

				if (ghostCanvasCopy) {
					//console.log(ghostCanvasCopy.clientWidth);
					setCanvasSize(ghostCanvasCopy, _this.width, _this.height);
					var ghostCanvasCopyCtx = ghostCanvasCopy.getContext("2d");

					//ghostCanvasCopyCtx.scale(1, 1);
					//var imageData = this._eventManager.ghostCtx.getImageData(0, 0, this._container.clientWidth, this._container.clientHeight);
					//this._eventManager.ghostCtx.drawImage(this._eventManager.ghostCanvas, 0, 0);
					//this.ctx.drawImage(this._eventManager.ghostCanvas, 0, 0);

					ghostCanvasCopyCtx.drawImage(_this._eventManager.ghostCanvas, 0, 0);
					//_this._canvasJSContainer.appendChild(_this._eventManager.ghostCanvas);
					//_this.overlaidCanvasCtx.drawImage(_this._eventManager.ghostCanvas, 0, 0);
				}
			}, 2000);
		}
	}

	Chart.prototype.attachPlotAreaEventHandlers = function () {

		//this._toolBar.style.display = "inline";

		this.attachEvent({
			context: this,
			chart: this,
			mousedown: this._plotAreaMouseDown,
			mouseup: this._plotAreaMouseUp,
			mousemove: this._plotAreaMouseMove,
			cursor: this.zoomEnabled ? "col-resize" : "move",
			cursor: this.panEnabled ? "move" : "default",
			capture: true,
			bounds: this.plotArea
		});

	}

	Chart.prototype.categoriseDataSeries = function () {
		var dataSeries = "";

		for (var i = 0; i < this.data.length; i++) {
			dataSeries = this.data[i]
			if (!dataSeries.dataPoints || dataSeries.dataPoints.length === 0 || !dataSeries.visible)
				continue;

			if (Chart._supportedChartTypes.indexOf(dataSeries.type) >= 0) {

				var plotType = null;
				var plotTypeExists = false;

				var plotUnit = null;
				var plotUnitExists = false;

				for (var j = 0; j < this.plotInfo.plotTypes.length; j++) {
					if (this.plotInfo.plotTypes[j].type === dataSeries.type) {
						plotTypeExists = true;
						var plotType = this.plotInfo.plotTypes[j];
						break;
					}
				}

				if (!plotTypeExists) {
					plotType = {
						type: dataSeries.type,
						totalDataSeries: 0,
						plotUnits: []
					};
					this.plotInfo.plotTypes.push(plotType)
				}

				for (var j = 0; j < plotType.plotUnits.length; j++) {
					if (plotType.plotUnits[j].axisYType === dataSeries.axisYType) {
						plotUnitExists = true;
						var plotUnit = plotType.plotUnits[j];
						break;
					}
				}

				if (!plotUnitExists) {
					plotUnit = {
						type: dataSeries.type,
						previousDataSeriesCount: 0, //to be set next
						index: plotType.plotUnits.length,
						plotType: plotType,
						axisYType: dataSeries.axisYType,
						axisY: dataSeries.axisYType === "primary" ? this.axisY : this.axisY2,
						axisX: this.axisX,
						dataSeriesIndexes: [], //index of dataSeries
						yTotals: []
					}
					plotType.plotUnits.push(plotUnit);
				}

				plotType.totalDataSeries++;

				plotUnit.dataSeriesIndexes.push(i);

				dataSeries.plotUnit = plotUnit;
			}
		}

		for (var i = 0; i < this.plotInfo.plotTypes.length; i++) {
			var plotType = this.plotInfo.plotTypes[i];
			var previousDataSeriesCount = 0;

			for (var j = 0; j < plotType.plotUnits.length; j++) {

				plotType.plotUnits[j].previousDataSeriesCount = previousDataSeriesCount;

				previousDataSeriesCount += plotType.plotUnits[j].dataSeriesIndexes.length;
			}
		}
	}

	Chart.prototype.assignIdToDataPoints = function () {

		for (var i = 0; i < this.data.length; i++) {
			var dataSeries = this.data[i];

			if (!dataSeries.dataPoints)
				continue;

			var length = dataSeries.dataPoints.length;

			for (var j = 0; j < length; j++) {
				dataSeries.dataPointIds[j] = ++this._eventManager.lastObjectId;
			}
		}
	}

	Chart.prototype._processData = function () {
		this.assignIdToDataPoints();
		this.categoriseDataSeries();

		for (var i = 0; i < this.plotInfo.plotTypes.length; i++) {
			var plotType = this.plotInfo.plotTypes[i];

			for (var j = 0; j < plotType.plotUnits.length; j++) {

				var plotUnit = plotType.plotUnits[j];

				if (plotUnit.type === "line" || plotUnit.type === "stepLine" || plotUnit.type === "spline" || plotUnit.type === "column" || plotUnit.type === "area" || plotUnit.type === "stepArea" || plotUnit.type === "splineArea" || plotUnit.type === "bar" || plotUnit.type === "bubble" || plotUnit.type === "scatter")
					this._processMultiseriesPlotUnit(plotUnit);
				else if (plotUnit.type === "stackedColumn" || plotUnit.type === "stackedBar" || plotUnit.type === "stackedArea")
					this._processStackedPlotUnit(plotUnit);
				else if (plotUnit.type === "stackedColumn100" || plotUnit.type === "stackedBar100" || plotUnit.type === "stackedArea100")
					this._processStacked100PlotUnit(plotUnit);
				else if (plotUnit.type === "candlestick" || plotUnit.type === "ohlc" || plotUnit.type === "rangeColumn" || plotUnit.type === "rangeBar" || plotUnit.type === "rangeArea" || plotUnit.type === "rangeSplineArea")
					this._processMultiYPlotUnit(plotUnit);
			}
		}

	}

	Chart.prototype._processMultiseriesPlotUnit = function (plotUnit) {
		if (!plotUnit.dataSeriesIndexes || plotUnit.dataSeriesIndexes.length < 1)
			return;

		var axisYDataInfo = plotUnit.axisY.dataInfo;
		var axisXDataInfo = plotUnit.axisX.dataInfo;
		var dataPointX, dataPointY;
		var isDateTime = false;


		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {
			var dataSeries = this.data[plotUnit.dataSeriesIndexes[j]];
			var i = 0;
			var isFirstDPInViewPort = false;
			var isLastDPInViewPort = false;

			if (dataSeries.axisPlacement === "normal" || dataSeries.axisPlacement === "xySwapped") {

				var plotAreaXMin = this.sessionVariables.axisX.newViewportMinimum ? this.sessionVariables.axisX.newViewportMinimum : (this._options.axisX && this._options.axisX.viewportMinimum) ?
					this._options.axisX.viewportMinimum : (this._options.axisX && this._options.axisX.minimum) ? this._options.axisX.minimum : -Infinity;

				var plotAreaXMax = this.sessionVariables.axisX.newViewportMaximum ? this.sessionVariables.axisX.newViewportMaximum : (this._options.axisX && this._options.axisX.viewportMaximum) ?
					this._options.axisX.viewportMaximum : (this._options.axisX && this._options.axisX.maximum) ? this._options.axisX.maximum : Infinity;
			}


			if (dataSeries.dataPoints[i].x && dataSeries.dataPoints[i].x.getTime || dataSeries.xValueType === "dateTime") {
				isDateTime = true;
			}

			for (i = 0; i < dataSeries.dataPoints.length; i++) {

				if (typeof dataSeries.dataPoints[i].x === "undefined") {
					dataSeries.dataPoints[i].x = i;
				}

				if (dataSeries.dataPoints[i].x.getTime) {
					isDateTime = true;
					dataPointX = dataSeries.dataPoints[i].x.getTime();//dataPointX is used so that getTime is called only once in case of dateTime values
				}
				else
					dataPointX = dataSeries.dataPoints[i].x;

				dataPointY = dataSeries.dataPoints[i].y;


				if (dataPointX < axisXDataInfo.min)
					axisXDataInfo.min = dataPointX;
				if (dataPointX > axisXDataInfo.max)
					axisXDataInfo.max = dataPointX;

				if (dataPointY < axisYDataInfo.min)
					axisYDataInfo.min = dataPointY;

				if (dataPointY > axisYDataInfo.max)
					axisYDataInfo.max = dataPointY;


				if (i > 0) {
					var xDiff = dataPointX - dataSeries.dataPoints[i - 1].x;
					xDiff < 0 && (xDiff = xDiff * -1); //If Condition shortcut

					if (axisXDataInfo.minDiff > xDiff && xDiff !== 0) {
						axisXDataInfo.minDiff = xDiff;
					}

					if (dataPointY !== null && dataSeries.dataPoints[i - 1].y !== null) {
						var yDiff = dataPointY - dataSeries.dataPoints[i - 1].y;
						yDiff < 0 && (yDiff = yDiff * -1); //If Condition shortcut

						if (axisYDataInfo.minDiff > yDiff && yDiff !== 0) {
							axisYDataInfo.minDiff = yDiff;
				}
					}
				}

				// This section makes sure that partially visible dataPoints are included in the begining
				if (dataPointX < plotAreaXMin && !isFirstDPInViewPort) {
					continue;
				} else if (!isFirstDPInViewPort) {
					isFirstDPInViewPort = true;

					if (i > 0) {
						i -= 2;
						continue;
					}
				}

				// This section makes sure that partially visible dataPoints are included at the end
				if (dataPointX > plotAreaXMax && !isLastDPInViewPort) {
					isLastDPInViewPort = true;
				} else if (dataPointX > plotAreaXMax && isLastDPInViewPort) {
					continue;
				}

				if (dataSeries.dataPoints[i].label)
					plotUnit.axisX.labels[dataPointX] = dataSeries.dataPoints[i].label;


				if (dataPointX < axisXDataInfo.viewPortMin)
					axisXDataInfo.viewPortMin = dataPointX;
				if (dataPointX > axisXDataInfo.viewPortMax)
					axisXDataInfo.viewPortMax = dataPointX;

				if (dataPointY === null)
					continue;

				if (dataPointY < axisYDataInfo.viewPortMin)
					axisYDataInfo.viewPortMin = dataPointY;
				if (dataPointY > axisYDataInfo.viewPortMax)
					axisYDataInfo.viewPortMax = dataPointY;
			}

			this.plotInfo.axisXValueType = dataSeries.xValueType = isDateTime ? "dateTime" : "number";
		}

		//this.dataPoints.sort(compareDataPointX);
		//this.dataPoints.sort(function (dataPoint1, dataPoint2) { return dataPoint1.x - dataPoint2.x; });
	}

	Chart.prototype._processStackedPlotUnit = function (plotUnit) {
		if (!plotUnit.dataSeriesIndexes || plotUnit.dataSeriesIndexes.length < 1)
			return;

		var axisYDataInfo = plotUnit.axisY.dataInfo;
		var axisXDataInfo = plotUnit.axisX.dataInfo;

		var dataPointX, dataPointY;
		var isDateTime = false;

		var dataPointYPositiveSums = [];
		var dataPointYNegativeSums = [];

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {
			var dataSeries = this.data[plotUnit.dataSeriesIndexes[j]];
			var i = 0;
			var isFirstDPInViewPort = false;
			var isLastDPInViewPort = false;

			if (dataSeries.axisPlacement === "normal" || dataSeries.axisPlacement === "xySwapped") {

				var plotAreaXMin = this.sessionVariables.axisX.newViewportMinimum ? this.sessionVariables.axisX.newViewportMinimum : (this._options.axisX && this._options.axisX.viewportMinimum) ?
					this._options.axisX.viewportMinimum : (this._options.axisX && this._options.axisX.minimum) ? this._options.axisX.minimum : -Infinity;

				var plotAreaXMax = this.sessionVariables.axisX.newViewportMaximum ? this.sessionVariables.axisX.newViewportMaximum : (this._options.axisX && this._options.axisX.viewportMaximum) ?
					this._options.axisX.viewportMaximum : (this._options.axisX && this._options.axisX.maximum) ? this._options.axisX.maximum : Infinity;
			}


			if (dataSeries.dataPoints[i].x && dataSeries.dataPoints[i].x.getTime || dataSeries.xValueType === "dateTime") {
				isDateTime = true;
			}

			for (i = 0; i < dataSeries.dataPoints.length; i++) {

				// Requird when no x values are provided
				if (typeof dataSeries.dataPoints[i].x === "undefined") {
					dataSeries.dataPoints[i].x = i;
				}

				if (dataSeries.dataPoints[i].x.getTime) {
					isDateTime = true;
					dataPointX = dataSeries.dataPoints[i].x.getTime();//dataPointX is used so that getTime is called only once in case of dateTime values
				}
				else
					dataPointX = dataSeries.dataPoints[i].x;

				dataPointY = dataSeries.dataPoints[i].y;



				if (dataPointX < axisXDataInfo.min)
					axisXDataInfo.min = dataPointX;
				if (dataPointX > axisXDataInfo.max)
					axisXDataInfo.max = dataPointX;

				if (i > 0) {
					var xDiff = dataPointX - dataSeries.dataPoints[i - 1].x;
					xDiff < 0 && (xDiff = xDiff * -1); //If Condition shortcut

					if (axisXDataInfo.minDiff > xDiff && xDiff !== 0) {
						axisXDataInfo.minDiff = xDiff;
					}

					if (dataPointY !== null && dataSeries.dataPoints[i - 1].y !== null) {
						var yDiff = dataPointY - dataSeries.dataPoints[i - 1].y;
						yDiff < 0 && (yDiff = yDiff * -1); //If Condition shortcut

						if (axisYDataInfo.minDiff > yDiff && yDiff !== 0) {
							axisYDataInfo.minDiff = yDiff;
				}
					}
				}

				// This section makes sure that partially visible dataPoints are included in the begining
				if (dataPointX < plotAreaXMin && !isFirstDPInViewPort) {
					continue;
				} else if (!isFirstDPInViewPort) {
					isFirstDPInViewPort = true;

					if (i > 0) {
						i -= 2;
						continue;
					}
				}

				// This section makes sure that partially visible dataPoints are included at the end
				if (dataPointX > plotAreaXMax && !isLastDPInViewPort) {
					isLastDPInViewPort = true;
				} else if (dataPointX > plotAreaXMax && isLastDPInViewPort) {
					continue;
				}


				if (dataSeries.dataPoints[i].label)
					plotUnit.axisX.labels[dataPointX] = dataSeries.dataPoints[i].label;

				if (dataPointX < axisXDataInfo.viewPortMin)
					axisXDataInfo.viewPortMin = dataPointX;
				if (dataPointX > axisXDataInfo.viewPortMax)
					axisXDataInfo.viewPortMax = dataPointX;

				if (dataPointY === null)
					continue;

				plotUnit.yTotals[dataPointX] = (!plotUnit.yTotals[dataPointX] ? 0 : plotUnit.yTotals[dataPointX]) + Math.abs(dataPointY);

				if (dataPointY >= 0) {
					if (dataPointYPositiveSums[dataPointX])
						dataPointYPositiveSums[dataPointX] += dataPointY;
					else
						dataPointYPositiveSums[dataPointX] = dataPointY;
				} else {
					if (dataPointYNegativeSums[dataPointX])
						dataPointYNegativeSums[dataPointX] += dataPointY;
					else
						dataPointYNegativeSums[dataPointX] = dataPointY;
				}
			}

			this.plotInfo.axisXValueType = dataSeries.xValueType = isDateTime ? "dateTime" : "number";
		}

		for (i in dataPointYPositiveSums) {
			if (dataPointYPositiveSums.hasOwnProperty(i)) {
			if (isNaN(i)) {
				continue;
			}
			var ySum = dataPointYPositiveSums[i];

			if (ySum < axisYDataInfo.min)
				axisYDataInfo.min = ySum;

			if (ySum > axisYDataInfo.max)
				axisYDataInfo.max = ySum;

			if (i < axisXDataInfo.viewPortMin || i > axisXDataInfo.viewPortMax)
				continue;

			if (ySum < axisYDataInfo.viewPortMin)
				axisYDataInfo.viewPortMin = ySum;
			if (ySum > axisYDataInfo.viewPortMax)
				axisYDataInfo.viewPortMax = ySum;
		}

		}

		for (i in dataPointYNegativeSums) {

			if (dataPointYNegativeSums.hasOwnProperty(i)) {
			if (isNaN(i)) {
				continue;
			}

			var ySum = dataPointYNegativeSums[i];

			if (ySum < axisYDataInfo.min)
				axisYDataInfo.min = ySum;

			if (ySum > axisYDataInfo.max)
				axisYDataInfo.max = ySum;

			if (i < axisXDataInfo.viewPortMin || i > axisXDataInfo.viewPortMax)
				continue;

			if (ySum < axisYDataInfo.viewPortMin)
				axisYDataInfo.viewPortMin = ySum;
			if (ySum > axisYDataInfo.viewPortMax)
				axisYDataInfo.viewPortMax = ySum;
		}

		}


		//this.dataPoints.sort(compareDataPointX);
		//this.dataPoints.sort(function (dataPoint1, dataPoint2) { return dataPoint1.x - dataPoint2.x; });

		//window.console.log("viewPortYMin: " + plotInfo.viewPortYMin + "; viewPortYMax: " + plotInfo.viewPortYMax);
	}

	Chart.prototype._processStacked100PlotUnit = function (plotUnit) {
		if (!plotUnit.dataSeriesIndexes || plotUnit.dataSeriesIndexes.length < 1)
			return;

		var axisYDataInfo = plotUnit.axisY.dataInfo;
		var axisXDataInfo = plotUnit.axisX.dataInfo;

		var dataPointX, dataPointY;
		var isDateTime = false;
		var containsPositiveY = false;
		var containsNegativeY = false;

		var dataPointYSums = [];

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {
			var dataSeries = this.data[plotUnit.dataSeriesIndexes[j]];
			var i = 0;
			var isFirstDPInViewPort = false;
			var isLastDPInViewPort = false;

			if (dataSeries.axisPlacement === "normal" || dataSeries.axisPlacement === "xySwapped") {

				var plotAreaXMin = this.sessionVariables.axisX.newViewportMinimum ? this.sessionVariables.axisX.newViewportMinimum : (this._options.axisX && this._options.axisX.viewportMinimum) ?
					this._options.axisX.viewportMinimum : (this._options.axisX && this._options.axisX.minimum) ? this._options.axisX.minimum : -Infinity;

				var plotAreaXMax = this.sessionVariables.axisX.newViewportMaximum ? this.sessionVariables.axisX.newViewportMaximum : (this._options.axisX && this._options.axisX.viewportMaximum) ?
					this._options.axisX.viewportMaximum : (this._options.axisX && this._options.axisX.maximum) ? this._options.axisX.maximum : Infinity;
			}


			if (dataSeries.dataPoints[i].x && dataSeries.dataPoints[i].x.getTime || dataSeries.xValueType === "dateTime") {
				isDateTime = true;
			}

			for (i = 0; i < dataSeries.dataPoints.length; i++) {

				// Requird when no x values are provided
				if (typeof dataSeries.dataPoints[i].x === "undefined") {
					dataSeries.dataPoints[i].x = i;
				}

				if (dataSeries.dataPoints[i].x.getTime) {
					isDateTime = true;
					dataPointX = dataSeries.dataPoints[i].x.getTime();//dataPointX is used so that getTime is called only once in case of dateTime values
				}
				else
					dataPointX = dataSeries.dataPoints[i].x;

				dataPointY = dataSeries.dataPoints[i].y;



				if (dataPointX < axisXDataInfo.min)
					axisXDataInfo.min = dataPointX;
				if (dataPointX > axisXDataInfo.max)
					axisXDataInfo.max = dataPointX;

				if (i > 0) {
					var xDiff = dataPointX - dataSeries.dataPoints[i - 1].x;
					xDiff < 0 && (xDiff = xDiff * -1); //If Condition shortcut

					if (axisXDataInfo.minDiff > xDiff && xDiff !== 0) {
						axisXDataInfo.minDiff = xDiff;
					}

					if (dataPointY !== null && dataSeries.dataPoints[i - 1].y !== null) {
						var yDiff = dataPointY - dataSeries.dataPoints[i - 1].y;
						yDiff < 0 && (yDiff = yDiff * -1); //If Condition shortcut

						if (axisYDataInfo.minDiff > yDiff && yDiff !== 0) {
							axisYDataInfo.minDiff = yDiff;
				}
					}
				}

				// This section makes sure that partially visible dataPoints are included in the begining
				if (dataPointX < plotAreaXMin && !isFirstDPInViewPort) {
					continue;
				} else if (!isFirstDPInViewPort) {
					isFirstDPInViewPort = true;

					if (i > 0) {
						i -= 2;
						continue;
					}
				}

				// This section makes sure that partially visible dataPoints are included at the end
				if (dataPointX > plotAreaXMax && !isLastDPInViewPort) {
					isLastDPInViewPort = true;
				} else if (dataPointX > plotAreaXMax && isLastDPInViewPort) {
					continue;
				}

				if (dataSeries.dataPoints[i].label)
					plotUnit.axisX.labels[dataPointX] = dataSeries.dataPoints[i].label;

				if (dataPointX < axisXDataInfo.viewPortMin)
					axisXDataInfo.viewPortMin = dataPointX;
				if (dataPointX > axisXDataInfo.viewPortMax)
					axisXDataInfo.viewPortMax = dataPointX;

				if (dataPointY === null)
					continue;

				plotUnit.yTotals[dataPointX] = (!plotUnit.yTotals[dataPointX] ? 0 : plotUnit.yTotals[dataPointX]) + Math.abs(dataPointY);

				if (dataPointY >= 0) {
					containsPositiveY = true;
				} else {
					containsNegativeY = true;
				}

				if (dataPointYSums[dataPointX])
					dataPointYSums[dataPointX] += Math.abs(dataPointY);
				else
					dataPointYSums[dataPointX] = Math.abs(dataPointY);
			}

			this.plotInfo.axisXValueType = dataSeries.xValueType = isDateTime ? "dateTime" : "number";
		}


		if (containsPositiveY && !containsNegativeY) {
			axisYDataInfo.max = 99;
			axisYDataInfo.min = 1;
		} else if (containsPositiveY && containsNegativeY) {
			axisYDataInfo.max = 99;
			axisYDataInfo.min = -99;
		} else if (!containsPositiveY && containsNegativeY) {
			axisYDataInfo.max = -1;
			axisYDataInfo.min = -99;
		}

		axisYDataInfo.viewPortMin = axisYDataInfo.min;
		axisYDataInfo.viewPortMax = axisYDataInfo.max;

		plotUnit.dataPointYSums = dataPointYSums;

		//this.dataPoints.sort(compareDataPointX);
		//this.dataPoints.sort(function (dataPoint1, dataPoint2) { return dataPoint1.x - dataPoint2.x; });

		//window.console.log("viewPortYMin: " + plotInfo.viewPortYMin + "; viewPortYMax: " + plotInfo.viewPortYMax);
	}

	Chart.prototype._processMultiYPlotUnit = function (plotUnit) {
		if (!plotUnit.dataSeriesIndexes || plotUnit.dataSeriesIndexes.length < 1)
			return;

		var axisYDataInfo = plotUnit.axisY.dataInfo;
		var axisXDataInfo = plotUnit.axisX.dataInfo;
		var dataPointX, dataPointY, dataPointYMin, dataPointYMax;
		var isDateTime = false;


		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {
			var dataSeries = this.data[plotUnit.dataSeriesIndexes[j]];
			var i = 0;
			var isFirstDPInViewPort = false;
			var isLastDPInViewPort = false;

			if (dataSeries.axisPlacement === "normal" || dataSeries.axisPlacement === "xySwapped") {

				var plotAreaXMin = this.sessionVariables.axisX.newViewportMinimum ? this.sessionVariables.axisX.newViewportMinimum : (this._options.axisX && this._options.axisX.viewportMinimum) ?
					this._options.axisX.viewportMinimum : (this._options.axisX && this._options.axisX.minimum) ? this._options.axisX.minimum : -Infinity;

				var plotAreaXMax = this.sessionVariables.axisX.newViewportMaximum ? this.sessionVariables.axisX.newViewportMaximum : (this._options.axisX && this._options.axisX.viewportMaximum) ?
					this._options.axisX.viewportMaximum : (this._options.axisX && this._options.axisX.maximum) ? this._options.axisX.maximum : Infinity;
			}


			if (dataSeries.dataPoints[i].x && dataSeries.dataPoints[i].x.getTime || dataSeries.xValueType === "dateTime") {
				isDateTime = true;
			}

			for (i = 0; i < dataSeries.dataPoints.length; i++) {

				if (typeof dataSeries.dataPoints[i].x === "undefined") {
					dataSeries.dataPoints[i].x = i;
				}

				if (dataSeries.dataPoints[i].x.getTime) {
					isDateTime = true;
					dataPointX = dataSeries.dataPoints[i].x.getTime();//dataPointX is used so that getTime is called only once in case of dateTime values
				}
				else
					dataPointX = dataSeries.dataPoints[i].x;

				dataPointY = dataSeries.dataPoints[i].y;

				if (dataPointY && dataPointY.length) {
					dataPointYMin = Math.min.apply(null, dataPointY);
					dataPointYMax = Math.max.apply(null, dataPointY);
				}


				if (dataPointX < axisXDataInfo.min)
					axisXDataInfo.min = dataPointX;
				if (dataPointX > axisXDataInfo.max)
					axisXDataInfo.max = dataPointX;

				if (dataPointYMin < axisYDataInfo.min)
					axisYDataInfo.min = dataPointYMin;

				if (dataPointYMax > axisYDataInfo.max)
					axisYDataInfo.max = dataPointYMax;


				if (i > 0) {
					var xDiff = dataPointX - dataSeries.dataPoints[i - 1].x;
					xDiff < 0 && (xDiff = xDiff * -1); //If Condition shortcut

					if (axisXDataInfo.minDiff > xDiff && xDiff !== 0) {
						axisXDataInfo.minDiff = xDiff;
					}

					if (dataPointY[0] !== null && dataSeries.dataPoints[i - 1].y[0] !== null) {
						var yDiff = dataPointY[0] - dataSeries.dataPoints[i - 1].y[0];
						yDiff < 0 && (yDiff = yDiff * -1); //If Condition shortcut

						if (axisYDataInfo.minDiff > yDiff && yDiff !== 0) {
							axisYDataInfo.minDiff = yDiff;
				}
					}
				}

				// This section makes sure that partially visible dataPoints are included in the begining
				if (dataPointX < plotAreaXMin && !isFirstDPInViewPort) {
					continue;
				} else if (!isFirstDPInViewPort) {
					isFirstDPInViewPort = true;

					if (i > 0) {
						i -= 2;
						continue;
					}
				}

				// This section makes sure that partially visible dataPoints are included at the end
				if (dataPointX > plotAreaXMax && !isLastDPInViewPort) {
					isLastDPInViewPort = true;
				} else if (dataPointX > plotAreaXMax && isLastDPInViewPort) {
					continue;
				}

				if (dataSeries.dataPoints[i].label)
					plotUnit.axisX.labels[dataPointX] = dataSeries.dataPoints[i].label;


				if (dataPointX < axisXDataInfo.viewPortMin)
					axisXDataInfo.viewPortMin = dataPointX;
				if (dataPointX > axisXDataInfo.viewPortMax)
					axisXDataInfo.viewPortMax = dataPointX;

				if (dataPointY === null)
					continue;

				if (dataPointYMin < axisYDataInfo.viewPortMin)
					axisYDataInfo.viewPortMin = dataPointYMin;
				if (dataPointYMax > axisYDataInfo.viewPortMax)
					axisYDataInfo.viewPortMax = dataPointYMax;
			}

			this.plotInfo.axisXValueType = dataSeries.xValueType = isDateTime ? "dateTime" : "number";
		}

		//this.dataPoints.sort(compareDataPointX);
		//this.dataPoints.sort(function (dataPoint1, dataPoint2) { return dataPoint1.x - dataPoint2.x; });
	}

	//getClosest returns objects nearby and hence shouldn't be used for events like click, mouseover, mousemove, etc which require object that is exactly under the mouse.
	Chart.prototype.getDataPointAtXY = function (mouseX, mouseY, getClosest) {

		getClosest = getClosest || false;
		var results = [];

		for (var i = this._dataInRenderedOrder.length - 1; i >= 0; i--) {
			var dataSeries = this._dataInRenderedOrder[i];

			var result = null;

			result = dataSeries.getDataPointAtXY(mouseX, mouseY, getClosest);
			if (result)
				results.push(result);
		}

		var closestResult = null;
		var onlyLineAreaTypes = false;

		for (var m = 0; m < results.length; m++) {

			if (results[m].dataSeries.type === "line" || results[m].dataSeries.type === "stepLine" || results[m].dataSeries.type === "area" || results[m].dataSeries.type === "stepArea") {
				var markerSize = getProperty("markerSize", results[m].dataPoint, results[m].dataSeries) || 8;
				if (results[m].distance <= markerSize / 2) {
					onlyLineAreaTypes = true;
					break;
				}
			}
		}

		for (m = 0; m < results.length; m++) {

			if (onlyLineAreaTypes && results[m].dataSeries.type !== "line" && results[m].dataSeries.type !== "stepLine" && results[m].dataSeries.type !== "area" && results[m].dataSeries.type !== "stepArea")
				continue;

			if (!closestResult) {
				closestResult = results[m];
			} else if (results[m].distance <= closestResult.distance) {
				closestResult = results[m];
			}
		}

		return closestResult;
	}

	Chart.prototype.getObjectAtXY = function (mouseX, mouseY, getClosest) {
		getClosest = getClosest || false;

		var id = null;

		var dataPointInfo = this.getDataPointAtXY(mouseX, mouseY, getClosest);

		if (dataPointInfo) {
			id = dataPointInfo.dataSeries.dataPointIds[dataPointInfo.dataPointIndex];
		} else if (isCanvasSupported) {//IE9+
			id = getObjectId(mouseX, mouseY, this._eventManager.ghostCtx);
		}
		else {
			for (var i = 0; i < this.legend.items.length; i++) {
				var item = this.legend.items[i];

				if (mouseX >= item.x1 && mouseX <= item.x2 && mouseY >= item.y1 && mouseY <= item.y2) {
					id = item.id;
				}
			}
		}

		return id;
	}

	/// <summary>Calculates Font Size based on standardSize and Chart Size</summary>
	/// <param name="standardSize" type="Number">Standard font size for a Chart with min(width,height) = 400px</param>
	/// <returns type="Number">The area.</returns>
	Chart.prototype.getAutoFontSize = function (standardSize, width, height) {

		width = width || this.width;
		height = height || this.height;

		var fontSizeScaleFactor = standardSize / 400;

		return Math.round(Math.min(this.width, this.height) * fontSizeScaleFactor);
	}

	//#region Events

	Chart.prototype.resetOverlayedCanvas = function () {
		//var width = this.overlaidCanvas.width;
		//this.overlaidCanvas.width = 0;
		//this.overlaidCanvas.width = width;
		this.overlaidCanvasCtx.clearRect(0, 0, this.width, this.height);
	}

	Chart.prototype.clearCanvas = function () {
		this.ctx.clearRect(0, 0, this.width, this.height);

		if (this.backgroundColor) {
			this.ctx.fillStyle = this.backgroundColor;
			this.ctx.fillRect(0, 0, this.width, this.height);
		}
	}

	Chart.prototype.attachEvent = function (param) {
		this._events.push(param);
	}

	Chart.prototype._touchEventHandler = function (ev) {
		if (!ev.changedTouches || !this.interactivityEnabled)
			return;

		var mouseEvents = [];
		var touches = ev.changedTouches;
		var first = touches ? touches[0] : ev;
		var touchCurrentCoordinates = null;

		//window.console.log(touches.length);

		switch (ev.type) {
			case "touchstart": case "MSPointerDown":
				mouseEvents = ["mousemove", "mousedown"];
				this._lastTouchData = getMouseCoordinates(first);
				this._lastTouchData.time = new Date();
				break;
			case "touchmove": case "MSPointerMove": mouseEvents = ["mousemove"]; break;
			case "touchend": case "MSPointerUp": mouseEvents = (this._lastTouchEventType === "touchstart" || this._lastTouchEventType === "MSPointerDown") ? ["mouseup", "click"] : ["mouseup"];
				break;
			default: return;
		}

		if (touches && touches.length > 1) return;


		touchCurrentCoordinates = getMouseCoordinates(first);
		touchCurrentCoordinates.time = new Date();
		try {
			var dy = touchCurrentCoordinates.y - this._lastTouchData.y;
			var dx = touchCurrentCoordinates.x - this._lastTouchData.x;
			var dt = touchCurrentCoordinates.time - this._lastTouchData.time;

			if (Math.abs(dy) > 15 && (!!this._lastTouchData.scroll || dt < 200)) {
				//this._lastTouchData.y = touchCurrentCoordinates.y;
				this._lastTouchData.scroll = true;

				var win = window.parent || window;
				if (win && win.scrollBy)
					win.scrollBy(0, -dy);
			}
		} catch (e) { };

		this._lastTouchEventType = ev.type;

		if (!!this._lastTouchData.scroll && this.zoomEnabled) {
			if (this.isDrag)
				this.resetOverlayedCanvas();

			this.isDrag = false;
			return;
		}

		for (var i = 0; i < mouseEvents.length; i++) {

			var type = mouseEvents[i];
			var simulatedEvent = document.createEvent("MouseEvent");
			simulatedEvent.initMouseEvent(type, true, true, window, 1,
									  first.screenX, first.screenY,
									  first.clientX, first.clientY, false,
									  false, false, false, 0, null);

			first.target.dispatchEvent(simulatedEvent);

			if (ev.preventManipulation) {
				//alert("preventManipulation");
				ev.preventManipulation();
			}

			if (ev.preventDefault) {
				//alert("preventDefault");
				ev.preventDefault();
			}
		}
	}

	Chart.prototype._dispatchRangeEvent = function (eventName, triggerSource) {
		var eventParameter = {};

		eventParameter.chart = this._publicChartReference;
		eventParameter.type = eventName;
		eventParameter.trigger = triggerSource;

		var axes = [];

		if (this.axisX)
			axes.push("axisX");
		if (this.axisY)
			axes.push("axisY");
		if (this.axisY2)
			axes.push("axisY2");

		for (var i = 0; i < axes.length; i++) {
			eventParameter[axes[i]] = {
				viewportMinimum: this[axes[i]].sessionVariables.newViewportMinimum,
				viewportMaximum: this[axes[i]].sessionVariables.newViewportMaximum
			}
		}

		this.dispatchEvent(eventName, eventParameter, this._publicChartReference);
	}

	Chart.prototype._mouseEventHandler = function (ev) {

		if (!this.interactivityEnabled)
			return;

		if (this._ignoreNextEvent) {
			this._ignoreNextEvent = false;
			return;
		}

		// stop panning and zooming so we can draw
		if (ev.preventManipulation) {
			//alert("preventManipulation");
			ev.preventManipulation();
		}

		// we are handling this event
		if (ev.preventDefault) {
			//alert("preventDefault");
			ev.preventDefault();
		}

		//IE8- uses srcElement instead of target. So instead of checking this condition everytime, its better to create a reference called target.
		if (typeof (ev.target) === "undefined" && ev.srcElement)
			ev.target = ev.srcElement;

		//console.log(ev.type);

		var xy = getMouseCoordinates(ev);
		var type = ev.type;
		var eventParam;
		var rightclick;

		if (!ev) var e = window.event;
		if (ev.which) rightclick = (ev.which == 3);
		else if (ev.button) rightclick = (ev.button == 2);

		//window.console.log(type + " --> x: " + xy.x + "; y:" + xy.y);

		//if (type === "mouseout") {
		//    this._toolTip.hide();
		//}

		if (isDebugMode && window.console) {
			window.console.log(type + " --> x: " + xy.x + "; y:" + xy.y);
			if (rightclick)
				window.console.log(ev.which);

			if (type === "mouseup")
				window.console.log("mouseup");
		}

		if (rightclick)
			return;

		//if (this.plotInfo.axisPlacement === "xySwapped") {
		//    //var temp = xy.x;
		//    //xy.x = xy.y;
		//    //xy.y = temp;
		//    xy = {x: xy.y, y: xy.x};
		//}

		if (Chart.capturedEventParam) {
			eventParam = Chart.capturedEventParam;

			if (type === "mouseup") {
				Chart.capturedEventParam = null;

				if (eventParam.chart.overlaidCanvas.releaseCapture)
					eventParam.chart.overlaidCanvas.releaseCapture();
				else
					document.body.removeEventListener("mouseup", eventParam.chart._mouseEventHandler, false);

			}

			if (eventParam.hasOwnProperty(type))
				eventParam[type].call(eventParam.context, xy.x, xy.y);



		}
		else if (this._events) {

			for (var i = 0; i < this._events.length; i++) {
				if (!this._events[i].hasOwnProperty(type))
					continue;

				eventParam = this._events[i];
				var bounds = eventParam.bounds;

				if (xy.x >= bounds.x1 && xy.x <= bounds.x2 && xy.y >= bounds.y1 && xy.y <= bounds.y2) {
					eventParam[type].call(eventParam.context, xy.x, xy.y);

					if (type === "mousedown" && eventParam.capture === true) {
						Chart.capturedEventParam = eventParam;

						if (this.overlaidCanvas.setCapture)
							this.overlaidCanvas.setCapture();
						else {
							document.body.addEventListener("mouseup", this._mouseEventHandler, false);
							//addEvent(document.body, "mouseup", this._mouseEventHandler);
						}
					} else if (type === "mouseup") {
						if (eventParam.chart.overlaidCanvas.releaseCapture)
							eventParam.chart.overlaidCanvas.releaseCapture();
						else
							document.body.removeEventListener("mouseup", this._mouseEventHandler, false);
					}

					break;
				}
				else
					eventParam = null;
			}

			if (eventParam && eventParam.cursor) {
				ev.target.style.cursor = eventParam.cursor;
			}
			else
				ev.target.style.cursor = this._defaultCursor;

			//eventParam =
		}

		if (this._toolTip && this._toolTip.enabled) {

			var plotArea = this.plotArea;

			if (xy.x < plotArea.x1 || xy.x > plotArea.x2 || xy.y < plotArea.y1 || xy.y > plotArea.y2)
				this._toolTip.hide();
		}


		if ((!this.isDrag || !this.zoomEnabled) && this._eventManager) {

			this._eventManager.mouseEventHandler(ev);
			//this._updateToolTip(ev.x, ev.y);
		}

		//if (this._toolTip.enabled)
		//    this._toolTip.mouseMoveHandler(ev.x, ev.y);
	}

	Chart.prototype._plotAreaMouseDown = function (x, y) {
		this.isDrag = true;

		if (this.plotInfo.axisPlacement !== "none") {
			this.dragStartPoint = { x: x, y: y };
		} else {
			this.dragStartPoint = { x: x, y: y };
		}
	}

	Chart.prototype._plotAreaMouseUp = function (x, y) {

		if (this.plotInfo.axisPlacement === "normal" || this.plotInfo.axisPlacement === "xySwapped") {
			if (this.isDrag) {
				var dragDelta = 0,
					dragDeltaPY = y - this.dragStartPoint.y,
					dragDeltaPX = x - this.dragStartPoint.x,
					zoomPX = this.zoomType.indexOf("x") >= 0, //Whether to zoom horizontally
					zoomPY = this.zoomType.indexOf("y") >= 0, //Whether to zoom vertically
					reRender = false;

				this.resetOverlayedCanvas();

				if (this.plotInfo.axisPlacement === "xySwapped") {
					var temp = zoomPY;
					zoomPY = zoomPX;
					zoomPX = temp;
				}

				if (this.panEnabled || this.zoomEnabled) {
					if (this.panEnabled) {

						var overflow = 0;

						for (var i = 0; i < this._axes.length; i++) {
							var axis = this._axes[i];

							if (axis.viewportMinimum < axis.minimum) {

								overflow = axis.minimum - axis.viewportMinimum;

								axis.sessionVariables.newViewportMinimum = axis.viewportMinimum + overflow;
								axis.sessionVariables.newViewportMaximum = axis.viewportMaximum + overflow;

							reRender = true;
							} else if (axis.viewportMaximum > axis.maximum) {

								overflow = axis.viewportMaximum - axis.maximum;
								axis.sessionVariables.newViewportMinimum = axis.viewportMinimum - overflow;
								axis.sessionVariables.newViewportMaximum = axis.viewportMaximum - overflow;

							reRender = true;
						}
						}

					}
					else if (((!zoomPX || Math.abs(dragDeltaPX) > 2) && (!zoomPY || Math.abs(dragDeltaPY) > 2)) && this.zoomEnabled) {

						if (!this.dragStartPoint)
							return;

						var selectedRegion = {
							x1: zoomPX ? this.dragStartPoint.x : this.plotArea.x1,
							y1: zoomPY ? this.dragStartPoint.y : this.plotArea.y1,
							x2: zoomPX ? x : this.plotArea.x2,
							y2: zoomPY ? y : this.plotArea.y2
						};

						if (Math.abs(selectedRegion.x1 - selectedRegion.x2) > 2 && Math.abs(selectedRegion.y1 - selectedRegion.y2) > 2) {

							if (this._zoomPanToSelectedRegion(selectedRegion.x1, selectedRegion.y1, selectedRegion.x2, selectedRegion.y2)) {

								reRender = true;

									}
								}
							}

					if (reRender) {
						this._ignoreNextEvent = true;//Required so that click event doesn't fire after zooming into a section of the chart.

						this._dispatchRangeEvent("rangeChanging", "zoom");
									this.render();
						this._dispatchRangeEvent("rangeChanged", "zoom");

						if (reRender && this.zoomEnabled && this._zoomButton.style.display === "none") {
						show(this._zoomButton, this._resetButton);
						setButtonState(this, this._zoomButton, "pan");
						setButtonState(this, this._resetButton, "reset");
					}
				}
			}
			}

		}

		this.isDrag = false;
	}

	Chart.prototype._plotAreaMouseMove = function (x, y) {
		if (this.isDrag && this.plotInfo.axisPlacement !== "none") {

			var dragDeltaPX = 0,
				dragDeltaPY = 0,
				alpha = null,
				selectedRegion = null,
				zoomPX = this.zoomType.indexOf("x") >= 0, //Whether to zoom horizontally
				zoomPY = this.zoomType.indexOf("y") >= 0, //Whether to zoom vertically
				_this = this;

			if (this.plotInfo.axisPlacement === "xySwapped") {
				var temp = zoomPY;
				zoomPY = zoomPX;
				zoomPX = temp;
			}

			dragDeltaPX = this.dragStartPoint.x - x;
			dragDeltaPY = this.dragStartPoint.y - y;

			if (Math.abs(dragDeltaPX) > 2 && Math.abs(dragDeltaPX) < 8 && (this.panEnabled || this.zoomEnabled)) {
				this._toolTip.hide();
			} else if (!this.panEnabled && !this.zoomEnabled) {
				this._toolTip.mouseMoveHandler(x, y);
			}

			if (((!zoomPX || Math.abs(dragDeltaPX) > 2) || (!zoomPY || Math.abs(dragDeltaPY) > 2)) && (this.panEnabled || this.zoomEnabled)) {
				if (this.panEnabled) {

					selectedRegion =
						{
							x1: zoomPX ? this.plotArea.x1 + dragDeltaPX : this.plotArea.x1,
							y1: zoomPY ? this.plotArea.y1 + dragDeltaPY : this.plotArea.y1,
							x2: zoomPX ? this.plotArea.x2 + dragDeltaPX : this.plotArea.x2,
							y2: zoomPY ? this.plotArea.y2 + dragDeltaPY : this.plotArea.y2
						};

					if (this._zoomPanToSelectedRegion(selectedRegion.x1, selectedRegion.y1, selectedRegion.x2, selectedRegion.y2, true)) {
						this._dispatchRangeEvent("rangeChanging", "pan");
						this.render();
						this._dispatchRangeEvent("rangeChanged", "pan");

						this.dragStartPoint.x = x;
						this.dragStartPoint.y = y;

						//clearTimeout(this._panTimerId);
						//this._panTimerId = setTimeout(function () {
						//	_this._dispatchRangeEvent("rangeChanging", "pan");
						//	_this.render();
						//	_this._dispatchRangeEvent("rangeChanged", "pan");
						//}, 0);
					}

				} else if (this.zoomEnabled) {

					this.resetOverlayedCanvas();

					alpha = this.overlaidCanvasCtx.globalAlpha;

					this.overlaidCanvasCtx.globalAlpha = .7;
					this.overlaidCanvasCtx.fillStyle = "#A0ABB8";

					var rect = {
						x1: zoomPX ? this.dragStartPoint.x : this.plotArea.x1,
						y1: zoomPY ? this.dragStartPoint.y : this.plotArea.y1,
						x2: zoomPX ? x - this.dragStartPoint.x : this.plotArea.x2 - this.plotArea.x1,
						y2: zoomPY ? y - this.dragStartPoint.y : this.plotArea.y2 - this.plotArea.y1
					};

					this.overlaidCanvasCtx.fillRect(rect.x1, rect.y1, rect.x2, rect.y2);

					this.overlaidCanvasCtx.globalAlpha = alpha;
				}
			}

		} else
			this._toolTip.mouseMoveHandler(x, y);
	}

	//#endregion Events

	//Sets the viewport range of Axis based on the given rect bounds (pixels). Also limits the zooming/panning based on axis bounds. Returns a boolean to indicate whether it was succesful or not based on the selected region.
	Chart.prototype._zoomPanToSelectedRegion = function (px1, py1, px2, py2, keepAxisIndependent) {

		keepAxisIndependent = keepAxisIndependent || false;

		var zoomPX = this.zoomType.indexOf("x") >= 0, //Whether to zoom horizontally
			zoomPY = this.zoomType.indexOf("y") >= 0, //Whether to zoom vertically
			validRegion = false;

		var axes = [], axesWithValidRange = [];
		if (this.axisX && zoomPX)
			axes.push(this.axisX);
		if (this.axisY && zoomPY)
			axes.push(this.axisY);
		if (this.axisY2 && zoomPY)
			axes.push(this.axisY2);

		var params = [];

		for (var i = 0; i < axes.length; i++) {
			var axis = axes[i];
			//var range = Math.abs(axis.viewportMaximum - axis.viewportMinimum);

			var val1 = axis.convertPixelToValue({ x: px1, y: py1 });
			var val2 = axis.convertPixelToValue({ x: px2, y: py2 });

			if (val1 > val2) {
				var temp = val2;
				val2 = val1;
				val1 = temp;
			}

			if (isFinite(axis.dataInfo.minDiff)) {
				if (!(Math.abs(val2 - val1) < 3 * Math.abs(axis.dataInfo.minDiff)
				|| (val1 < axis.minimum) || (val2 > axis.maximum))) {
					axesWithValidRange.push(axis);
					params.push({ val1: val1, val2: val2 });

					validRegion = true;
				} else if (!keepAxisIndependent) {
					validRegion = false;
					break;
				}
			}
		}

		if (validRegion) {
			for (var i = 0; i < axesWithValidRange.length; i++) {
				var axis = axesWithValidRange[i];
				var param = params[i];

				axis.setViewPortRange(param.val1, param.val2);
			}
		}

		return validRegion;
	}

	Chart.prototype.preparePlotArea = function () {

		var plotArea = this.plotArea;

		var yAxis = this.axisY ? this.axisY : this.axisY2;

		if (!isCanvasSupported && (plotArea.x1 > 0 || plotArea.y1 > 0)) {
			plotArea.ctx.translate(plotArea.x1, plotArea.y1);
		}

		if (this.axisX && yAxis) {
			plotArea.x1 = this.axisX.lineCoordinates.x1 < this.axisX.lineCoordinates.x2 ? this.axisX.lineCoordinates.x1 : yAxis.lineCoordinates.x1;
			plotArea.y1 = (this.axisX.lineCoordinates.y1 < yAxis.lineCoordinates.y1 ? this.axisX.lineCoordinates.y1 : yAxis.lineCoordinates.y1);

			plotArea.x2 = (this.axisX.lineCoordinates.x2 > yAxis.lineCoordinates.x2 ? this.axisX.lineCoordinates.x2 : yAxis.lineCoordinates.x2);
			plotArea.y2 = this.axisX.lineCoordinates.y2 > this.axisX.lineCoordinates.y1 ? this.axisX.lineCoordinates.y2 : yAxis.lineCoordinates.y2;

			plotArea.width = plotArea.x2 - plotArea.x1;
			plotArea.height = plotArea.y2 - plotArea.y1;
			//plotArea = { x1: x1, y1: y1, x2: x2, y2: y2, width: x2 - x1, height: y2 - y1 };
		} else {
			//ToDo: @sunil
			var freeSpace = this.layoutManager.getFreeSpace();
			plotArea.x1 = freeSpace.x1;
			plotArea.x2 = freeSpace.x2;
			plotArea.y1 = freeSpace.y1;
			plotArea.y2 = freeSpace.y2;

			plotArea.width = freeSpace.width;
			plotArea.height = freeSpace.height;
		}

		if (!isCanvasSupported) {

			plotArea.canvas.width = plotArea.width;
			plotArea.canvas.height = plotArea.height;

			plotArea.canvas.style.left = plotArea.x1 + "px";
			plotArea.canvas.style.top = plotArea.y1 + "px";

			if (plotArea.x1 > 0 || plotArea.y1 > 0) {
				plotArea.ctx.translate(-plotArea.x1, -plotArea.y1);
			}
		}

		plotArea.layoutManager = new LayoutManager(plotArea.x1, plotArea.y1, plotArea.x2, plotArea.y2, 2);
	}

	Chart.prototype.getPixelCoordinatesOnPlotArea = function (x, y) {
		return {
			x: this.axisX.getPixelCoordinatesOnAxis(x).x, y: this.axisY.getPixelCoordinatesOnAxis(y).y
		}
		//return { x: 5, y: 10 };
	}

	//#region Render Methods

	Chart.prototype.renderIndexLabels = function (targetCtx) {
		var ctx = targetCtx || this.plotArea.ctx;

		var plotArea = this.plotArea;

		var mid = 0;
		var yMinLimit = 0;
		var yMaxLimit = 0;
		var xMinLimit = 0;
		var xMaxLimit = 0;
		var marginX = 0, marginY = 0; // Margin between label and dataPoint / PlotArea
		var offSetX = 0, offSetY = 0; // Distance to offSet textBlock (top) from dataPoint inorder to position it
		var visibleWidth = 0;
		var visibleHeight = 0;

		for (var i = 0; i < this._indexLabels.length; i++) {

			var indexLabel = this._indexLabels[i];
			var chartTypeLower = indexLabel.chartType.toLowerCase();

			var x, y, angle;

			var fontColor = getProperty("indexLabelFontColor", indexLabel.dataPoint, indexLabel.dataSeries);
			var fontSize = getProperty("indexLabelFontSize", indexLabel.dataPoint, indexLabel.dataSeries);
			var fontFamily = getProperty("indexLabelFontFamily", indexLabel.dataPoint, indexLabel.dataSeries);
			var fontStyle = getProperty("indexLabelFontStyle", indexLabel.dataPoint, indexLabel.dataSeries);
			var fontWeight = getProperty("indexLabelFontWeight", indexLabel.dataPoint, indexLabel.dataSeries);
			var backgroundColor = getProperty("indexLabelBackgroundColor", indexLabel.dataPoint, indexLabel.dataSeries);
			var maxWidth = getProperty("indexLabelMaxWidth", indexLabel.dataPoint, indexLabel.dataSeries);
			var indexLabelWrap = getProperty("indexLabelWrap", indexLabel.dataPoint, indexLabel.dataSeries);

			var percentAndTotal = {
				percent: null, total: null
			};
			var formatterParameter = null;

			if (indexLabel.dataSeries.type.indexOf("stacked") >= 0 || indexLabel.dataSeries.type === "pie" || indexLabel.dataSeries.type === "doughnut")
				percentAndTotal = this.getPercentAndTotal(indexLabel.dataSeries, indexLabel.dataPoint);

			if (indexLabel.dataSeries.indexLabelFormatter || indexLabel.dataPoint.indexLabelFormatter)
				formatterParameter = {
					chart: this._options, dataSeries: indexLabel.dataSeries, dataPoint: indexLabel.dataPoint, index: indexLabel.indexKeyword, total: percentAndTotal.total, percent: percentAndTotal.percent
				};


			var indexLabelText = indexLabel.dataPoint.indexLabelFormatter ? indexLabel.dataPoint.indexLabelFormatter(formatterParameter)
				: indexLabel.dataPoint.indexLabel ? this.replaceKeywordsWithValue(indexLabel.dataPoint.indexLabel, indexLabel.dataPoint, indexLabel.dataSeries, null, indexLabel.indexKeyword)
				: indexLabel.dataSeries.indexLabelFormatter ? indexLabel.dataSeries.indexLabelFormatter(formatterParameter)
				: indexLabel.dataSeries.indexLabel ? this.replaceKeywordsWithValue(indexLabel.dataSeries.indexLabel, indexLabel.dataPoint, indexLabel.dataSeries, null, indexLabel.indexKeyword) : null;

			if (indexLabelText === null || indexLabelText === "")
				continue;

			var placement = getProperty("indexLabelPlacement", indexLabel.dataPoint, indexLabel.dataSeries);
			var orientation = getProperty("indexLabelOrientation", indexLabel.dataPoint, indexLabel.dataSeries);
			var angle = 0;

			var direction = indexLabel.direction; // +1 for above the point and -1 for below the point

			var axisX = indexLabel.dataSeries.axisX;
			var axisY = indexLabel.dataSeries.axisY;


			var textBlock = new TextBlock(ctx, {
				x: 0,
				y: 0,
				maxWidth: maxWidth ? maxWidth : this.width * .5,
				maxHeight: indexLabelWrap ? fontSize * 5 : fontSize * 1.5,
				angle: orientation === "horizontal" ? 0 : -90,
				text: indexLabelText,
				padding: 0,
				backgroundColor: backgroundColor,
				horizontalAlign: "left",//left, center, right
				fontSize: fontSize,//in pixels
				fontFamily: fontFamily,
				fontWeight: fontWeight, //normal, bold, bolder, lighter,
				fontColor: fontColor,
				fontStyle: fontStyle, // normal, italic, oblique
				textBaseline: "top"
			});

			var textSize = textBlock.measureText();

			//if (indexLabel.dataPoint.x < axisX.viewportMinimum || indexLabel.dataPoint.x > axisX.viewportMaximum || indexLabel.dataPoint.y < axisY.viewportMinimum || indexLabel.dataPoint.y > axisY.viewportMaximum)
			//	continue;

			if (chartTypeLower.indexOf("line") >= 0 || chartTypeLower.indexOf("area") >= 0
					|| chartTypeLower.indexOf("bubble") >= 0 || chartTypeLower.indexOf("scatter") >= 0) {

				if (indexLabel.dataPoint.x < axisX.viewportMinimum || indexLabel.dataPoint.x > axisX.viewportMaximum || indexLabel.dataPoint.y < axisY.viewportMinimum || indexLabel.dataPoint.y > axisY.viewportMaximum)
					continue;
			}
			else {
				if (indexLabel.dataPoint.x < axisX.viewportMinimum || indexLabel.dataPoint.x > axisX.viewportMaximum)
					continue;
			}

			marginY = 2;
			marginX = 2;

			if (orientation === "horizontal") {
				visibleWidth = textBlock.width;
				visibleHeight = textBlock.height;
			} else {
				visibleHeight = textBlock.width;
				visibleWidth = textBlock.height;
			}

			if (this.plotInfo.axisPlacement === "normal") {

				if (chartTypeLower.indexOf("line") >= 0 || chartTypeLower.indexOf("area") >= 0) {

					placement = "auto";
					marginY = 4;

				} else if (chartTypeLower.indexOf("stacked") >= 0) {

					if (placement === "auto")
						placement = "inside";

				} else if (chartTypeLower === "bubble" || chartTypeLower === "scatter") {

					placement = "inside";

				}

				x = indexLabel.point.x - visibleWidth / 2;

				if (placement !== "inside") {	//outside or auto

					yMinLimit = plotArea.y1;
					yMaxLimit = plotArea.y2;

					if (direction > 0) {
						y = indexLabel.point.y - visibleHeight - marginY;

						if (y < yMinLimit) {
							if (placement === "auto") {
								y = Math.max(indexLabel.point.y, yMinLimit) + marginY;
							}
							else {
								y = yMinLimit + marginY;
							}
						}
					}
					else {
						y = indexLabel.point.y + marginY;

						if (y > yMaxLimit - visibleHeight - marginY) {
							if (placement === "auto") {
								y = Math.min(indexLabel.point.y, yMaxLimit) - visibleHeight - marginY;
							}
							else {
								y = yMaxLimit - visibleHeight - marginY;
							}
						}
					}

				} else {


					yMinLimit = Math.max(indexLabel.bounds.y1, plotArea.y1);
					yMaxLimit = Math.min(indexLabel.bounds.y2, plotArea.y2);


					if (chartTypeLower.indexOf("range") >= 0) {
						if (direction > 0)
							mid = Math.max(indexLabel.bounds.y1, plotArea.y1) + visibleHeight / 2 + marginY;
						else
							mid = Math.min(indexLabel.bounds.y2, plotArea.y2) - visibleHeight / 2 - marginY;
					}
					else
						mid = (Math.max(indexLabel.bounds.y1, plotArea.y1) + Math.min(indexLabel.bounds.y2, plotArea.y2)) / 2

					if (direction > 0) {
						y = Math.max(indexLabel.point.y, mid) - visibleHeight / 2;

						if (y < yMinLimit && (chartTypeLower === "bubble" || chartTypeLower === "scatter")) {
							y = Math.max(indexLabel.point.y - visibleHeight - marginY, plotArea.y1 + marginY);
						}
					}
					else {
						y = Math.min(indexLabel.point.y, mid) - visibleHeight / 2;

						if (y > yMaxLimit - visibleHeight - marginY && (chartTypeLower === "bubble" || chartTypeLower === "scatter")) {
							y = Math.min(indexLabel.point.y + marginY, plotArea.y2 - visibleHeight - marginY);
						}
					}

                    // Make Sure that it does not overlap the axis line
					y = Math.min(y, yMaxLimit - visibleHeight);
				}
			}
			else {

				if (chartTypeLower.indexOf("line") >= 0 || chartTypeLower.indexOf("area") >= 0
					|| chartTypeLower.indexOf("scatter") >= 0) {

					placement = "auto";
					marginX = 4;

				} else if (chartTypeLower.indexOf("stacked") >= 0) {

					if (placement === "auto")
						placement = "inside";

				} else if (chartTypeLower === "bubble") {

					placement = "inside";

				}

				y = indexLabel.point.y - visibleHeight / 2;

				if (placement !== "inside") {	//outside or auto

					xMinLimit = plotArea.x1;
					xMaxLimit = plotArea.x2;

					if (direction < 0) {
						x = indexLabel.point.x - visibleWidth - marginX;

						if (x < xMinLimit) {
							if (placement === "auto") {
								x = Math.max(indexLabel.point.x, xMinLimit) + marginX;
							}
							else {
								x = xMinLimit + marginX;
							}
						}
					}
					else {
						x = indexLabel.point.x + marginX;

						if (x > xMaxLimit - visibleWidth - marginX) {
							if (placement === "auto") {
								x = Math.min(indexLabel.point.x, xMaxLimit) - visibleWidth - marginX;
							}
							else {
								x = xMaxLimit - visibleWidth - marginX;
							}
						}
					}

				} else {

					xMinLimit = Math.max(indexLabel.bounds.x1, plotArea.x1);
					xMaxLimit = Math.min(indexLabel.bounds.x2, plotArea.x2);

					if (chartTypeLower.indexOf("range") >= 0) {
						if (direction < 0)
							mid = Math.max(indexLabel.bounds.x1, plotArea.x1) + visibleWidth / 2 + marginX;
						else
							mid = Math.min(indexLabel.bounds.x2, plotArea.x2) - visibleWidth / 2 - marginX;
					}
					else
						var mid = (Math.max(indexLabel.bounds.x1, plotArea.x1) + Math.min(indexLabel.bounds.x2, plotArea.x2)) / 2;

					if (direction < 0) {
						x = Math.max(indexLabel.point.x, mid) - visibleWidth / 2;

						//if (y < xMinLimit) {
						//	y = Math.max(indexLabel.point.y - visibleHeight - marginY, plotArea.y1 + marginY);
						//}
					}
					else {
						x = Math.min(indexLabel.point.x, mid) - visibleWidth / 2;

						//if (y > xMaxLimit - visibleHeight - marginY) {
						//	y = Math.min(indexLabel.point.y + marginY, plotArea.y2 - visibleHeight - marginY);
						//}
					}

				    // Make Sure that it does not overlap the axis line
				    x = Math.max(x, xMinLimit);
				}
			}


			if (orientation === "vertical") {
				y += visibleHeight;
			}

			textBlock.x = x;
			textBlock.y = y;

			//console.log(textBlock.text + ": " + textBlock.x + "; " + textBlock.y);

			textBlock.render(true);
		}

		//source and dest would be same when animation is not enabled
		var animationInfo = {
			source: ctx, dest: this.plotArea.ctx, animationCallback: AnimationHelper.fadeInAnimation, easingFunction: AnimationHelper.easing.easeInQuad, animationBase: 0, startTimePercent: .7
		};
		return animationInfo;
	}

	Chart.prototype.renderLine = function (plotUnit) {

		var ctx = plotUnit.targetCanvasCtx || this.plotArea.ctx;

		var totalDataSeries = plotUnit.dataSeriesIndexes.length;
		if (totalDataSeries <= 0)
			return;

		var ghostCtx = this._eventManager.ghostCtx;
		//var ghostCtx = this.overlaidCanvasCtx;

		ctx.save();

		var plotArea = this.plotArea;

		ctx.beginPath();
		ctx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
		ctx.clip();

		var markers = [];

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];

			var dataSeries = this.data[dataSeriesIndex];
			ctx.lineWidth = dataSeries.lineThickness;
			var dataPoints = dataSeries.dataPoints;


			if (ctx.setLineDash) {
				ctx.setLineDash(getLineDashArray(dataSeries.lineDashType, dataSeries.lineThickness));
			}

			var seriesId = dataSeries.id;
			this._eventManager.objectMap[seriesId] = {
				objectType: "dataSeries", dataSeriesIndex: dataSeriesIndex
			};
			var hexColor = intToHexColorString(seriesId);
			ghostCtx.strokeStyle = hexColor;
			//ghostCtx.lineWidth = dataSeries.lineThickness;
			ghostCtx.lineWidth = dataSeries.lineThickness > 0 ? Math.max(dataSeries.lineThickness, 4) : 0;

			var colorSet = dataSeries._colorSet;
			var color = colorSet[0];
			ctx.strokeStyle = color;

			var isFirstDataPointInPlotArea = true;
			var i = 0, x, y;
			var dataPointX; //Used so that when dataPoint.x is a DateTime value, it doesn't get converted to number back and forth.

			//if (!dataSeries._options.markerSize && dataSeries.dataPoints.length < 1000)
			//    dataSeries.markerSize = 8;
			ctx.beginPath();
			if (dataPoints.length > 0) {
				//var xy = this.getPixelCoordinatesOnPlotArea(dataPoints[0].x, dataPoints[0].y);

				//dataSeries.noDataPointsInPlotArea = 0
				var prevDataNull = false;
				for (i = 0; i < dataPoints.length; i++) {

					dataPointX = dataPoints[i].x.getTime ? dataPoints[i].x.getTime() : dataPoints[i].x;

					if (dataPointX < plotUnit.axisX.dataInfo.viewPortMin || dataPointX > plotUnit.axisX.dataInfo.viewPortMax)
						continue;

					//if (!isFinite(dataPoints[i].y))
					//    continue;

					if (typeof (dataPoints[i].y) !== "number") {
						if (i > 0) {// if first dataPoint is null then no need to call stroke method
							ctx.stroke();

							if (isCanvasSupported) {
								ghostCtx.stroke();
							}
						}


						prevDataNull = true;
						continue;
					}

					x = (plotUnit.axisX.conversionParameters.reference + plotUnit.axisX.conversionParameters.pixelPerUnit * (dataPointX - plotUnit.axisX.conversionParameters.minimum) + .5) << 0;
					y = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;

					var id = dataSeries.dataPointIds[i];
					this._eventManager.objectMap[id] = {
						id: id, objectType: "dataPoint", dataSeriesIndex: dataSeriesIndex, dataPointIndex: i, x1: x, y1: y
					};


					//dataSeries.noDataPointsInPlotArea++;

					if (isFirstDataPointInPlotArea || prevDataNull) {
						ctx.beginPath();
						ctx.moveTo(x, y);


						if (isCanvasSupported) {
							ghostCtx.beginPath();
							ghostCtx.moveTo(x, y);
						}

						isFirstDataPointInPlotArea = false;
						prevDataNull = false;
					} else {

						ctx.lineTo(x, y);

						if (isCanvasSupported)
							ghostCtx.lineTo(x, y);

						if (i % 500 == 0) {
							ctx.stroke();
							ctx.beginPath();
							ctx.moveTo(x, y);

							if (isCanvasSupported) {
								ghostCtx.stroke();
								ghostCtx.beginPath();
								ghostCtx.moveTo(x, y);
							}
						}
					}

					//Render Marker
					if (dataPoints[i].markerSize > 0 || dataSeries.markerSize > 0) {

						var markerProps = dataSeries.getMarkerProperties(i, x, y, ctx);
						markers.push(markerProps);

						//if (!dataSeries.maxWidthInX || markerProps.size > dataSeries.maxWidthInX) {
						//	dataSeries.maxWidthInX = markerProps.size / (plotUnit.axisX.conversionParameters.pixelPerUnit > 1 ? plotUnit.axisX.conversionParameters.pixelPerUnit - 1 : plotUnit.axisX.conversionParameters.pixelPerUnit);
						//}

						var markerColor = intToHexColorString(id);

						//window.console.log("index: " + i + "; id: " + id + "; hex: " + markerColor);

						if (isCanvasSupported) {
							markers.push({
								x: x, y: y, ctx: ghostCtx,
								type: markerProps.type,
								size: markerProps.size,
								color: markerColor,
								borderColor: markerColor,
								borderThickness: markerProps.borderThickness
							});
						}
					}

					if (dataPoints[i].indexLabel || dataSeries.indexLabel || dataPoints[i].indexLabelFormatter || dataSeries.indexLabelFormatter) {

						this._indexLabels.push({
							chartType: "line",
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							point: {
								x: x, y: y
							},
							direction: dataPoints[i].y >= 0 ? 1 : -1,
							color: color
						});

					}

				}

				ctx.stroke();

				if (isCanvasSupported)
					ghostCtx.stroke();
			}

		}


		RenderHelper.drawMarkers(markers);
		ctx.restore();

		ctx.beginPath();

		if (isCanvasSupported)
			ghostCtx.beginPath();

		//source and dest would be same when animation is not enabled
		var animationInfo = {
			source: ctx, dest: this.plotArea.ctx, animationCallback: AnimationHelper.xClipAnimation, easingFunction: AnimationHelper.easing.linear, animationBase: 0
		};
		return animationInfo;
	}

	Chart.prototype.renderStepLine = function (plotUnit) {
		var ctx = plotUnit.targetCanvasCtx || this.plotArea.ctx;

		var totalDataSeries = plotUnit.dataSeriesIndexes.length;
		if (totalDataSeries <= 0)
			return;

		var ghostCtx = this._eventManager.ghostCtx;
		//var ghostCtx = this.overlaidCanvasCtx;

		ctx.save();

		var plotArea = this.plotArea;

		ctx.beginPath();
		ctx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
		ctx.clip();

		var markers = [];

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];

			var dataSeries = this.data[dataSeriesIndex];
			ctx.lineWidth = dataSeries.lineThickness;
			var dataPoints = dataSeries.dataPoints;

			if (ctx.setLineDash) {
				ctx.setLineDash(getLineDashArray(dataSeries.lineDashType, dataSeries.lineThickness));
			}

			var seriesId = dataSeries.id;
			this._eventManager.objectMap[seriesId] = {
				objectType: "dataSeries", dataSeriesIndex: dataSeriesIndex
			};
			var hexColor = intToHexColorString(seriesId);
			ghostCtx.strokeStyle = hexColor;
			//ghostCtx.lineWidth = dataSeries.lineThickness;
			ghostCtx.lineWidth = dataSeries.lineThickness > 0 ? Math.max(dataSeries.lineThickness, 4) : 0;

			var colorSet = dataSeries._colorSet;
			var color = colorSet[0];
			ctx.strokeStyle = color;

			var isFirstDataPointInPlotArea = true;
			var i = 0, x, y;
			var dataPointX; //Used so that when dataPoint.x is a DateTime value, it doesn't get converted to number back and forth.

			//if (!dataSeries._options.markerSize && dataSeries.dataPoints.length < 1000)
			//    dataSeries.markerSize = 8;
			ctx.beginPath();
			if (dataPoints.length > 0) {
				//var xy = this.getPixelCoordinatesOnPlotArea(dataPoints[0].x, dataPoints[0].y);

				//dataSeries.noDataPointsInPlotArea = 0
				var prevDataNull = false;
				for (i = 0; i < dataPoints.length; i++) {

					dataPointX = dataPoints[i].getTime ? dataPoints[i].x.getTime() : dataPoints[i].x;

					if (dataPointX < plotUnit.axisX.dataInfo.viewPortMin || dataPointX > plotUnit.axisX.dataInfo.viewPortMax)
						continue;

					//if (!isFinite(dataPoints[i].y))
					//    continue;

					if (typeof (dataPoints[i].y) !== "number") {
						if (i > 0) {// if first dataPoint is null then no need to call stroke method
							ctx.stroke();

							if (isCanvasSupported) {
								ghostCtx.stroke();
							}
						}

						prevDataNull = true;
						continue;
					}

					var prevY = y;

					x = (plotUnit.axisX.conversionParameters.reference + plotUnit.axisX.conversionParameters.pixelPerUnit * (dataPointX - plotUnit.axisX.conversionParameters.minimum) + .5) << 0;
					y = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;

					var id = dataSeries.dataPointIds[i];
					this._eventManager.objectMap[id] = {
						id: id, objectType: "dataPoint", dataSeriesIndex: dataSeriesIndex, dataPointIndex: i, x1: x, y1: y
					};


					//dataSeries.noDataPointsInPlotArea++;

					if (isFirstDataPointInPlotArea || prevDataNull) {
						ctx.beginPath();
						ctx.moveTo(x, y);

						if (isCanvasSupported) {
							ghostCtx.beginPath();
							ghostCtx.moveTo(x, y);
						}

						isFirstDataPointInPlotArea = false;
						prevDataNull = false;
					} else {

						ctx.lineTo(x, prevY);
						if (isCanvasSupported)
							ghostCtx.lineTo(x, prevY);

						ctx.lineTo(x, y);
						if (isCanvasSupported)
							ghostCtx.lineTo(x, y);

						if (i % 500 == 0) {
							ctx.stroke();
							ctx.beginPath();
							ctx.moveTo(x, y);

							if (isCanvasSupported) {
								ghostCtx.stroke();
								ghostCtx.beginPath();
								ghostCtx.moveTo(x, y);
							}
						}
					}

					//Render Marker
					if (dataPoints[i].markerSize > 0 || dataSeries.markerSize > 0) {

						var markerProps = dataSeries.getMarkerProperties(i, x, y, ctx);
						markers.push(markerProps);

						//if (!dataSeries.maxWidthInX || markerProps.size > dataSeries.maxWidthInX) {
						//	dataSeries.maxWidthInX = markerProps.size / (plotUnit.axisX.conversionParameters.pixelPerUnit > 1 ? plotUnit.axisX.conversionParameters.pixelPerUnit - 1 : plotUnit.axisX.conversionParameters.pixelPerUnit);
						//}

						var markerColor = intToHexColorString(id);

						//window.console.log("index: " + i + "; id: " + id + "; hex: " + markerColor);
						if (isCanvasSupported) {
							markers.push({
								x: x, y: y, ctx: ghostCtx,
								type: markerProps.type,
								size: markerProps.size,
								color: markerColor,
								borderColor: markerColor,
								borderThickness: markerProps.borderThickness
							});
						}
					}

					if (dataPoints[i].indexLabel || dataSeries.indexLabel || dataPoints[i].indexLabelFormatter || dataSeries.indexLabelFormatter) {

						this._indexLabels.push({
							chartType: "stepLine",
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							point: {
								x: x, y: y
							},
							direction: dataPoints[i].y >= 0 ? 1 : -1,
							color: color
						});

					}

				}

				ctx.stroke();
				if (isCanvasSupported)
					ghostCtx.stroke();
			}
		}


		RenderHelper.drawMarkers(markers);
		ctx.restore();

		ctx.beginPath();

		if (isCanvasSupported)
			ghostCtx.beginPath();

		//source and dest would be same when animation is not enabled
		var animationInfo = {
			source: ctx, dest: this.plotArea.ctx, animationCallback: AnimationHelper.xClipAnimation, easingFunction: AnimationHelper.easing.linear, animationBase: 0
		};
		return animationInfo;
	}

	function getBezierPoints(points, tension) {
		var bezierPoints = [];

		for (var i = 0; i < points.length; i++) {

			if (i == 0) {
				bezierPoints.push(points[0]);
				continue;
			}

			var i1, i2, pointIndex;

			pointIndex = i - 1;
			i1 = pointIndex === 0 ? 0 : pointIndex - 1;
			i2 = pointIndex === points.length - 1 ? pointIndex : pointIndex + 1;

			var drv1 = {
				x: (points[i2].x - points[i1].x) / tension, y: (points[i2].y - points[i1].y) / tension
			}
			var cp1 = {
				x: points[pointIndex].x + drv1.x / 3, y: points[pointIndex].y + drv1.y / 3
			}
			bezierPoints[bezierPoints.length] = cp1;


			pointIndex = i;
			i1 = pointIndex === 0 ? 0 : pointIndex - 1;
			i2 = pointIndex === points.length - 1 ? pointIndex : pointIndex + 1;

			var drv2 = {
				x: (points[i2].x - points[i1].x) / tension, y: (points[i2].y - points[i1].y) / tension
			}
			var cp2 = {
				x: points[pointIndex].x - drv2.x / 3, y: points[pointIndex].y - drv2.y / 3
			}
			bezierPoints[bezierPoints.length] = cp2;

			bezierPoints[bezierPoints.length] = points[i];
		}

		return bezierPoints;
	}

	Chart.prototype.renderSpline = function (plotUnit) {
		var ctx = plotUnit.targetCanvasCtx || this.plotArea.ctx;

		var totalDataSeries = plotUnit.dataSeriesIndexes.length;
		if (totalDataSeries <= 0)
			return;

		var ghostCtx = this._eventManager.ghostCtx;

		ctx.save();

		var plotArea = this.plotArea;

		ctx.beginPath();
		ctx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
		ctx.clip();

		var markers = [];

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];

			var dataSeries = this.data[dataSeriesIndex];
			ctx.lineWidth = dataSeries.lineThickness;
			var dataPoints = dataSeries.dataPoints;

			if (ctx.setLineDash) {
				ctx.setLineDash(getLineDashArray(dataSeries.lineDashType, dataSeries.lineThickness));
			}

			var seriesId = dataSeries.id;
			this._eventManager.objectMap[seriesId] = {
				objectType: "dataSeries", dataSeriesIndex: dataSeriesIndex
			};
			var hexColor = intToHexColorString(seriesId);
			ghostCtx.strokeStyle = hexColor;
			//ghostCtx.lineWidth = dataSeries.lineThickness;
			ghostCtx.lineWidth = dataSeries.lineThickness > 0 ? Math.max(dataSeries.lineThickness, 4) : 0;

			var colorSet = dataSeries._colorSet;
			var color = colorSet[0];
			ctx.strokeStyle = color;

			var isFirstDataPointInPlotArea = true;
			var i = 0, x, y;
			var dataPointX; //Used so that when dataPoint.x is a DateTime value, it doesn't get converted to number back and forth.

			//if (!dataSeries._options.markerSize && dataSeries.dataPoints.length < 1000)
			//    dataSeries.markerSize = 8;

			var pixels = [];

			ctx.beginPath();
			if (dataPoints.length > 0) {

				for (i = 0; i < dataPoints.length; i++) {

					dataPointX = dataPoints[i].getTime ? dataPoints[i].x.getTime() : dataPoints[i].x;

					if (dataPointX < plotUnit.axisX.dataInfo.viewPortMin || dataPointX > plotUnit.axisX.dataInfo.viewPortMax)
						continue;

					//if (!isFinite(dataPoints[i].y))
					//    continue;

					if (typeof (dataPoints[i].y) !== "number") {
						if (i > 0) {// if first dataPoint is null then no need to call stroke method
							renderBezier(pixels);
							pixels = [];
						}

						continue;
					}

					x = (plotUnit.axisX.conversionParameters.reference + plotUnit.axisX.conversionParameters.pixelPerUnit * (dataPointX - plotUnit.axisX.conversionParameters.minimum) + .5) << 0;
					y = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;

					var id = dataSeries.dataPointIds[i];
					this._eventManager.objectMap[id] = {
						id: id, objectType: "dataPoint", dataSeriesIndex: dataSeriesIndex, dataPointIndex: i, x1: x, y1: y
					};


					pixels[pixels.length] = {
						x: x, y: y
					};


					//Add Markers
					if (dataPoints[i].markerSize > 0 || dataSeries.markerSize > 0) {

						var markerProps = dataSeries.getMarkerProperties(i, x, y, ctx);
						markers.push(markerProps);

						//if (!dataSeries.maxWidthInX || markerProps.size > dataSeries.maxWidthInX) {
						//	dataSeries.maxWidthInX = markerProps.size / (plotUnit.axisX.conversionParameters.pixelPerUnit > 1 ? plotUnit.axisX.conversionParameters.pixelPerUnit - 1 : plotUnit.axisX.conversionParameters.pixelPerUnit);
						//}

						var markerColor = intToHexColorString(id);

						//window.console.log("index: " + i + "; id: " + id + "; hex: " + markerColor);
						if (isCanvasSupported) {
							markers.push({
								x: x, y: y, ctx: ghostCtx,
								type: markerProps.type,
								size: markerProps.size,
								color: markerColor,
								borderColor: markerColor,
								borderThickness: markerProps.borderThickness
							});
						}
					}

					//Add Labels
					if (dataPoints[i].indexLabel || dataSeries.indexLabel || dataPoints[i].indexLabelFormatter || dataSeries.indexLabelFormatter) {

						this._indexLabels.push({
							chartType: "spline",
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							point: {
								x: x, y: y
							},
							direction: dataPoints[i].y >= 0 ? 1 : -1,
							color: color
						});

					}

				}
			}

			renderBezier(pixels);
		}

		RenderHelper.drawMarkers(markers);
		ctx.restore();

		ctx.beginPath();

		if (isCanvasSupported)
			ghostCtx.beginPath();

		function renderBezier(pixels) {

			var bp = getBezierPoints(pixels, 2);

			if (bp.length > 0) {
				ctx.beginPath();
				if (isCanvasSupported)
					ghostCtx.beginPath();

				ctx.moveTo(bp[0].x, bp[0].y);
				if (isCanvasSupported)
					ghostCtx.moveTo(bp[0].x, bp[0].y);

				for (var i = 0; i < bp.length - 3; i += 3) {

					ctx.bezierCurveTo(bp[i + 1].x, bp[i + 1].y, bp[i + 2].x, bp[i + 2].y, bp[i + 3].x, bp[i + 3].y);

					if (isCanvasSupported)
						ghostCtx.bezierCurveTo(bp[i + 1].x, bp[i + 1].y, bp[i + 2].x, bp[i + 2].y, bp[i + 3].x, bp[i + 3].y);

					if (i > 0 && i % 3000 === 0) {
						ctx.stroke();
						ctx.beginPath();
						ctx.moveTo(bp[i + 3].x, bp[i + 3].y);

						if (isCanvasSupported) {
							ghostCtx.stroke();
							ghostCtx.beginPath();
							ghostCtx.moveTo(bp[i + 3].x, bp[i + 3].y);
						}
					}
				}

				ctx.stroke();

				if (isCanvasSupported)
					ghostCtx.stroke();
			}
		}

		//source and dest would be same when animation is not enabled
		var animationInfo = {
			source: ctx, dest: this.plotArea.ctx, animationCallback: AnimationHelper.xClipAnimation, easingFunction: AnimationHelper.easing.linear, animationBase: 0
		};
		return animationInfo;
	}

	var drawRect = function (ctx, x1, y1, x2, y2, color, borderThickness, borderColor, top, bottom, left, right, fillOpacity) {
		if (typeof (fillOpacity) === "undefined")
			fillOpacity = 1;

		borderThickness = borderThickness || 0;
		borderColor = borderColor || "black";
		//alert("top"+ top + "bottom" + bottom + " lt" + left+ "rt" + right )
		var a1 = x1, a2 = x2, b1 = y1, b2 = y2, edgeY, edgeX;
		if (x2 - x1 > 15 && y2 - y1 > 15)
			var bevelDepth = 8;
		else
			var bevelDepth = 0.35 * Math.min((x2 - x1), (y2 - y1));
		//alert(a1 + "" + a2);
		var color2 = "rgba(255, 255, 255, .4)";
		var color3 = "rgba(255, 255, 255, 0.1)";
		//color1 = "rgba(" + r + "," + g + ", " + b + ",1)";
		var color1 = color;

		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.save();
		ctx.fillStyle = color1;

		ctx.globalAlpha = fillOpacity;
		ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
		ctx.globalAlpha = 1;

		if (borderThickness > 0) {
			var offset = borderThickness % 2 === 0 ? 0 : .5;
			ctx.beginPath();
			ctx.lineWidth = borderThickness;
			ctx.strokeStyle = borderColor;
			ctx.moveTo(x1, y1);
			ctx.rect(x1 - offset, y1 - offset, x2 - x1 + 2 * offset, y2 - y1 + 2 * offset);
			ctx.stroke();
		}

		ctx.restore();
		//   ctx.beginPath();
		if (top === true) {
			// alert(x1 + "" + x2 + " " + bevelDepth);
			ctx.save();
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x1 + bevelDepth, y1 + bevelDepth);
			ctx.lineTo(x2 - bevelDepth, y1 + bevelDepth);
			ctx.lineTo(x2, y1);
			ctx.closePath();
			var grd = ctx.createLinearGradient((x2 + x1) / 2, b1 + bevelDepth, (x2 + x1) / 2, b1);
			grd.addColorStop(0, color1);
			grd.addColorStop(1, color2);
			ctx.fillStyle = grd;
			ctx.fill();
			//              ctx.stroke();
			ctx.restore();
		}


		if (bottom === true) {
			ctx.save();
			ctx.beginPath();
			ctx.moveTo(x1, y2);
			ctx.lineTo(x1 + bevelDepth, y2 - bevelDepth);
			ctx.lineTo(x2 - bevelDepth, y2 - bevelDepth);
			ctx.lineTo(x2, y2);
			ctx.closePath();
			var grd = ctx.createLinearGradient((x2 + x1) / 2, b2 - bevelDepth, (x2 + x1) / 2, b2);
			grd.addColorStop(0, color1);
			grd.addColorStop(1, color2);
			ctx.fillStyle = grd;
			//       ctx.stroke();
			ctx.fill();
			ctx.restore();
		}

		if (left === true) {
			//   alert(x1)
			ctx.save();
			ctx.beginPath();
			ctx.moveTo(x1, y1)
			ctx.lineTo(x1 + bevelDepth, y1 + bevelDepth);
			ctx.lineTo(x1 + bevelDepth, y2 - bevelDepth);
			ctx.lineTo(x1, y2);
			ctx.closePath();
			var grd = ctx.createLinearGradient(a1 + bevelDepth, (y2 + y1) / 2, a1, (y2 + y1) / 2);
			grd.addColorStop(0, color1);
			grd.addColorStop(1, color3);
			ctx.fillStyle = grd;
			ctx.fill();
			//     ctx.stroke();
			ctx.restore();
		}


		if (right === true) {
			ctx.save();
			ctx.beginPath();
			ctx.moveTo(x2, y1)
			ctx.lineTo(x2 - bevelDepth, y1 + bevelDepth);
			ctx.lineTo(x2 - bevelDepth, y2 - bevelDepth);
			ctx.lineTo(x2, y2);
			var grd = ctx.createLinearGradient(a2 - bevelDepth, (y2 + y1) / 2, a2, (y2 + y1) / 2);
			grd.addColorStop(0, color1);
			grd.addColorStop(1, color3);
			ctx.fillStyle = grd;
			grd.addColorStop(0, color1);
			grd.addColorStop(1, color3);
			ctx.fillStyle = grd;
			ctx.fill();
			ctx.closePath();
			//          ctx.stroke();
			ctx.restore();
		}
		//

	}

	Chart.prototype.renderColumn = function (plotUnit) {

		var ctx = plotUnit.targetCanvasCtx || this.plotArea.ctx;

		var totalDataSeries = plotUnit.dataSeriesIndexes.length;

		if (totalDataSeries <= 0)
			return;

		var color = null;

		var plotArea = this.plotArea;

		var i = 0, x, y;
		var dataPointX; //Used so that when dataPoint.x is a DateTime value, it doesn't get converted to number from dataTime everytime it is used.

		var yZeroToPixel = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (0 - plotUnit.axisY.conversionParameters.minimum)) << 0;

		var maxBarWidth = this.dataPointMaxWidth ? this.dataPointMaxWidth : Math.min((this.width * .15), this.plotArea.width / plotUnit.plotType.totalDataSeries * .9) << 0;
		var xMinDiff = plotUnit.axisX.dataInfo.minDiff;
		var barWidth = (((plotArea.width / Math.abs(plotUnit.axisX.viewportMaximum - plotUnit.axisX.viewportMinimum)) * Math.abs(xMinDiff)) / plotUnit.plotType.totalDataSeries * .9) << 0;

		if (barWidth > maxBarWidth)
			barWidth = maxBarWidth;
		else if (xMinDiff === Infinity) {
			barWidth = maxBarWidth / plotUnit.plotType.totalDataSeries * .9;
		} else if (barWidth < 1)
			barWidth = 1;

		ctx.save();
		if (isCanvasSupported)
			this._eventManager.ghostCtx.save();

		ctx.beginPath();
		ctx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
		ctx.clip();

		if (isCanvasSupported) {
			this._eventManager.ghostCtx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
			this._eventManager.ghostCtx.clip();
		}
		//ctx.beginPath();

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];

			var dataSeries = this.data[dataSeriesIndex];
			var dataPoints = dataSeries.dataPoints;
			var isFirstDataPointInPlotArea = true;


			// Reducing pixelPerUnit by 1 just to overcome any problems due to rounding off of pixels.
			//dataSeries.maxWidthInX = barWidth / (plotUnit.axisX.conversionParameters.pixelPerUnit > 1 ? plotUnit.axisX.conversionParameters.pixelPerUnit - 1 : plotUnit.axisX.conversionParameters.pixelPerUnit);

			//var offsetX = barWidth * plotUnit.index << 0;


			if (dataPoints.length > 0) {
				//var xy = this.getPixelCoordinatesOnPlotArea(dataPoints[0].x, dataPoints[0].y);

				var bevelEnabled = (barWidth > 5) && dataSeries.bevelEnabled ? true : false;

				for (i = 0; i < dataPoints.length; i++) {

					dataPoints[i].getTime ? dataPointX = dataPoints[i].x.getTime() : dataPointX = dataPoints[i].x;

					if (dataPointX < plotUnit.axisX.dataInfo.viewPortMin || dataPointX > plotUnit.axisX.dataInfo.viewPortMax) {
						continue;
					}

					if (typeof (dataPoints[i].y) !== "number")
						continue;

					x = (plotUnit.axisX.conversionParameters.reference + plotUnit.axisX.conversionParameters.pixelPerUnit * (dataPointX - plotUnit.axisX.conversionParameters.minimum) + .5) << 0;
					y = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;

					var x1 = x - (plotUnit.plotType.totalDataSeries * barWidth / 2) + ((plotUnit.previousDataSeriesCount + j) * barWidth) << 0;
					var x2 = x1 + barWidth << 0;
					var y1;
					var y2;

					if (dataPoints[i].y >= 0) {
						y1 = y;

						y2 = yZeroToPixel;

						if (y1 > y2) {
							var temp = y1;
							y1 = y2;
							y2 = y1;
						}

					} else {
						y2 = y;

						y1 = yZeroToPixel;

						if (y1 > y2) {
							var temp = y1;
							y1 = y2;
							y2 = y1;
						}
					}

					color = dataPoints[i].color ? dataPoints[i].color : dataSeries._colorSet[i % dataSeries._colorSet.length];
					drawRect(ctx, x1, y1, x2, y2, color, 0, null, bevelEnabled && (dataPoints[i].y >= 0), (dataPoints[i].y < 0) && bevelEnabled, false, false, dataSeries.fillOpacity);

					//if (dataSeries.markerType && dataSeries.markerSize > 0) {
					//    RenderHelper.drawMarker(x1 + (x2 - x1) / 2, y, ctx, dataSeries.markerType, dataSeries.markerSize, color, dataSeries.markerBorderColor, dataSeries.markerBorderThickness ? dataSeries.markerBorderThickness : 1);
					//}

					var id = dataSeries.dataPointIds[i];
					this._eventManager.objectMap[id] = {
						id: id, objectType: "dataPoint", dataSeriesIndex: dataSeriesIndex, dataPointIndex: i, x1: x1, y1: y1, x2: x2, y2: y2
					};

					color = intToHexColorString(id);
					if (isCanvasSupported)
						drawRect(this._eventManager.ghostCtx, x1, y1, x2, y2, color, 0, null, false, false, false, false);

					if (dataPoints[i].indexLabel || dataSeries.indexLabel || dataPoints[i].indexLabelFormatter || dataSeries.indexLabelFormatter) {

						this._indexLabels.push({
							chartType: "column",
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							point: {
								x: x1 + (x2 - x1) / 2, y: dataPoints[i].y >= 0 ? y1 : y2
							},
							direction: dataPoints[i].y >= 0 ? 1 : -1,
							bounds: {
								x1: x1, y1: Math.min(y1, y2), x2: x2, y2: Math.max(y1, y2)
							},
							color: color
						});

					}
				}
			}
		}

		ctx.restore();

		if (isCanvasSupported)
			this._eventManager.ghostCtx.restore();

		//source and dest would be same when animation is not enabled
		var animationBase = Math.min(yZeroToPixel, plotUnit.axisY.boundingRect.y2);
		var animationInfo = {
			source: ctx, dest: this.plotArea.ctx, animationCallback: AnimationHelper.yScaleAnimation, easingFunction: AnimationHelper.easing.easeOutQuart, animationBase: animationBase
		};
		return animationInfo;
	}

	Chart.prototype.renderStackedColumn = function (plotUnit) {
		var ctx = plotUnit.targetCanvasCtx || this.plotArea.ctx;
		var totalDataSeries = plotUnit.dataSeriesIndexes.length;

		if (totalDataSeries <= 0)
			return;

		var color = null;

		var plotArea = this.plotArea;

		var offsetPositiveY = [];
		var offsetNegativeY = [];

		var i = 0, x, y;
		var dataPointX; //Used so that when dataPoint.x is a DateTime value, it doesn't get converted to number everytime it is accessed.

		//var yZeroToPixel = (axisYProps.y2 - axisYProps.height / rangeY * Math.abs(0 - plotUnit.axisY.viewportMinimum) + .5) << 0;
		var yZeroToPixel = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (0 - plotUnit.axisY.conversionParameters.minimum)) << 0;

		var maxBarWidth = this.dataPointMaxWidth ? this.dataPointMaxWidth : this.width * .15 << 0;
		var xMinDiff = plotUnit.axisX.dataInfo.minDiff;
		var barWidth = (((plotArea.width / Math.abs(plotUnit.axisX.viewportMaximum - plotUnit.axisX.viewportMinimum)) * Math.abs(xMinDiff)) / plotUnit.plotType.plotUnits.length * .9) << 0;

		if (barWidth > maxBarWidth)
			barWidth = maxBarWidth;
		else if (xMinDiff === Infinity) {
			barWidth = maxBarWidth;
		} else if (barWidth < 1)
			barWidth = 1;



		ctx.save();
		if (isCanvasSupported)
			this._eventManager.ghostCtx.save();

		ctx.beginPath();
		ctx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
		ctx.clip();

		if (isCanvasSupported) {
			this._eventManager.ghostCtx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
			this._eventManager.ghostCtx.clip();
		}

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];
			var dataSeries = this.data[dataSeriesIndex];
			var dataPoints = dataSeries.dataPoints;
			var isFirstDataPointInPlotArea = true;

			// Reducing pixelPerUnit by 1 just to overcome any problems due to rounding off of pixels.
			//dataSeries.maxWidthInX = barWidth / (plotUnit.axisX.conversionParameters.pixelPerUnit > 1 ? plotUnit.axisX.conversionParameters.pixelPerUnit - 1 : plotUnit.axisX.conversionParameters.pixelPerUnit);


			if (dataPoints.length > 0) {
				//var xy = this.getPixelCoordinatesOnPlotArea(dataPoints[0].x, dataPoints[0].y);

				var bevelEnabled = (barWidth > 5) && dataSeries.bevelEnabled ? true : false;

				ctx.strokeStyle = "#4572A7 ";

				for (i = 0; i < dataPoints.length; i++) {

					dataPointX = dataPoints[i].x.getTime ? dataPoints[i].x.getTime() : dataPoints[i].x;


					if (dataPointX < plotUnit.axisX.dataInfo.viewPortMin || dataPointX > plotUnit.axisX.dataInfo.viewPortMax) {
						continue;
					}

					if (typeof (dataPoints[i].y) !== "number")
						continue;

					x = (plotUnit.axisX.conversionParameters.reference + plotUnit.axisX.conversionParameters.pixelPerUnit * (dataPointX - plotUnit.axisX.conversionParameters.minimum) + .5) << 0;
					y = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y - plotUnit.axisY.conversionParameters.minimum));

					var x1 = x - (plotUnit.plotType.plotUnits.length * barWidth / 2) + (plotUnit.index * barWidth) << 0;
					var x2 = x1 + barWidth << 0;
					var y1;
					var y2;


					if (dataPoints[i].y >= 0) {
						var offset = offsetPositiveY[dataPointX] ? offsetPositiveY[dataPointX] : 0;

						y1 = y - offset;
						y2 = yZeroToPixel - offset;

						offsetPositiveY[dataPointX] = offset + (y2 - y1);

					} else {
						var offset = offsetNegativeY[dataPointX] ? offsetNegativeY[dataPointX] : 0;

						y2 = y + offset;
						y1 = yZeroToPixel + offset;

						offsetNegativeY[dataPointX] = offset + (y2 - y1);
					}

					color = dataPoints[i].color ? dataPoints[i].color : dataSeries._colorSet[i % dataSeries._colorSet.length];

					drawRect(ctx, x1, y1, x2, y2, color, 0, null, bevelEnabled && (dataPoints[i].y >= 0), (dataPoints[i].y < 0) && bevelEnabled, false, false, dataSeries.fillOpacity);

					//if (dataSeries.markerType && dataSeries.markerSize > 0) {
					//    RenderHelper.drawMarker(x1 + (x2 - x1)/2, y1, ctx, dataSeries.markerType, dataSeries.markerSize, color, dataSeries.markerBorderColor, dataSeries.markerBorderThickness ? dataSeries.markerBorderThickness : 1);
					//}

					var id = dataSeries.dataPointIds[i];
					this._eventManager.objectMap[id] = {
						id: id, objectType: "dataPoint", dataSeriesIndex: dataSeriesIndex, dataPointIndex: i, x1: x1, y1: y1, x2: x2, y2: y2
					};
					color = intToHexColorString(id);

					if (isCanvasSupported)
						drawRect(this._eventManager.ghostCtx, x1, y1, x2, y2, color, 0, null, false, false, false, false);


					if (dataPoints[i].indexLabel || dataSeries.indexLabel || dataPoints[i].indexLabelFormatter || dataSeries.indexLabelFormatter) {

						this._indexLabels.push({
							chartType: "stackedColumn",
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							point: {
								x: x, y: dataPoints[i].y >= 0 ? y1 : y2
							},
							direction: dataPoints[i].y >= 0 ? 1 : -1,
							bounds: {
								x1: x1, y1: Math.min(y1, y2), x2: x2, y2: Math.max(y1, y2)
							},
							color: color
						});

					}
				}
			}
		}

		ctx.restore();

		if (isCanvasSupported)
			this._eventManager.ghostCtx.restore();

		//source and dest would be same when animation is not enabled
		var animationBase = Math.min(yZeroToPixel, plotUnit.axisY.boundingRect.y2);
		var animationInfo = {
			source: ctx, dest: this.plotArea.ctx, animationCallback: AnimationHelper.yScaleAnimation, easingFunction: AnimationHelper.easing.easeOutQuart, animationBase: animationBase
		};
		return animationInfo;
	}

	Chart.prototype.renderStackedColumn100 = function (plotUnit) {
		var ctx = plotUnit.targetCanvasCtx || this.plotArea.ctx;
		var totalDataSeries = plotUnit.dataSeriesIndexes.length;

		if (totalDataSeries <= 0)
			return;

		var color = null;

		var plotArea = this.plotArea;

		var offsetPositiveY = [];
		var offsetNegativeY = [];

		var i = 0, x, y;
		var dataPointX; //Used so that when dataPoint.x is a DateTime value, it doesn't get converted to number everytime it is accessed.

		//var yZeroToPixel = (axisYProps.y2 - axisYProps.height / rangeY * Math.abs(0 - plotUnit.axisY.viewportMinimum) + .5) << 0;
		var yZeroToPixel = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (0 - plotUnit.axisY.conversionParameters.minimum)) << 0;

		var maxBarWidth = this.dataPointMaxWidth ? this.dataPointMaxWidth : this.width * .15 << 0;
		var xMinDiff = plotUnit.axisX.dataInfo.minDiff;
		var barWidth = (((plotArea.width / Math.abs(plotUnit.axisX.viewportMaximum - plotUnit.axisX.viewportMinimum)) * Math.abs(xMinDiff)) / plotUnit.plotType.plotUnits.length * .9) << 0;

		if (barWidth > maxBarWidth)
			barWidth = maxBarWidth;
		else if (xMinDiff === Infinity) {
			barWidth = maxBarWidth;
		} else if (barWidth < 1)
			barWidth = 1;

		ctx.save();
		if (isCanvasSupported)
			this._eventManager.ghostCtx.save();

		ctx.beginPath();
		ctx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
		ctx.clip();

		if (isCanvasSupported) {
			this._eventManager.ghostCtx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
			this._eventManager.ghostCtx.clip();
		}

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];

			var dataSeries = this.data[dataSeriesIndex];
			var dataPoints = dataSeries.dataPoints;
			var isFirstDataPointInPlotArea = true;


			//dataSeries.maxWidthInX = barWidth / (plotUnit.axisX.conversionParameters.pixelPerUnit > 1 ? plotUnit.axisX.conversionParameters.pixelPerUnit - 1 : plotUnit.axisX.conversionParameters.pixelPerUnit);


			if (dataPoints.length > 0) {
				//var xy = this.getPixelCoordinatesOnPlotArea(dataPoints[0].x, dataPoints[0].y);

				var bevelEnabled = (barWidth > 5) && dataSeries.bevelEnabled ? true : false;

				//ctx.strokeStyle = "#4572A7 ";

				for (i = 0; i < dataPoints.length; i++) {

					dataPointX = dataPoints[i].x.getTime ? dataPoints[i].x.getTime() : dataPoints[i].x;


					if (dataPointX < plotUnit.axisX.dataInfo.viewPortMin || dataPointX > plotUnit.axisX.dataInfo.viewPortMax) {
						continue;
					}

					if (typeof (dataPoints[i].y) !== "number")
						continue;

					x = (plotUnit.axisX.conversionParameters.reference + plotUnit.axisX.conversionParameters.pixelPerUnit * (dataPointX - plotUnit.axisX.conversionParameters.minimum) + .5) << 0;

					var yPercent;
					if (plotUnit.dataPointYSums[dataPointX] !== 0)
						yPercent = dataPoints[i].y / plotUnit.dataPointYSums[dataPointX] * 100;
					else
						yPercent = 0;

					//y = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (yPercent - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;
					y = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (yPercent - plotUnit.axisY.conversionParameters.minimum));

					var x1 = x - (plotUnit.plotType.plotUnits.length * barWidth / 2) + (plotUnit.index * barWidth) << 0;
					var x2 = x1 + barWidth << 0;
					var y1;
					var y2;


					if (dataPoints[i].y >= 0) {
						var offset = offsetPositiveY[dataPointX] ? offsetPositiveY[dataPointX] : 0;

						y1 = y - offset;
						y2 = yZeroToPixel - offset;

						offsetPositiveY[dataPointX] = offset + (y2 - y1);

					} else {
						var offset = offsetNegativeY[dataPointX] ? offsetNegativeY[dataPointX] : 0;

						y2 = y + offset;
						y1 = yZeroToPixel + offset;

						offsetNegativeY[dataPointX] = offset + (y2 - y1);
					}


					color = dataPoints[i].color ? dataPoints[i].color : dataSeries._colorSet[i % dataSeries._colorSet.length];
					drawRect(ctx, x1, y1, x2, y2, color, 0, null, bevelEnabled && (dataPoints[i].y >= 0), (dataPoints[i].y < 0) && bevelEnabled, false, false, dataSeries.fillOpacity);

					var id = dataSeries.dataPointIds[i];
					this._eventManager.objectMap[id] = {
						id: id, objectType: "dataPoint", dataSeriesIndex: dataSeriesIndex, dataPointIndex: i, x1: x1, y1: y1, x2: x2, y2: y2
					};
					color = intToHexColorString(id);

					if (isCanvasSupported)
						drawRect(this._eventManager.ghostCtx, x1, y1, x2, y2, color, 0, null, false, false, false, false);


					if (dataPoints[i].indexLabel || dataSeries.indexLabel || dataPoints[i].indexLabelFormatter || dataSeries.indexLabelFormatter) {

						this._indexLabels.push({
							chartType: "stackedColumn100",
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							point: {
								x: x, y: dataPoints[i].y >= 0 ? y1 : y2
							},
							direction: dataPoints[i].y >= 0 ? 1 : -1,
							bounds: {
								x1: x1, y1: Math.min(y1, y2), x2: x2, y2: Math.max(y1, y2)
							},
							color: color
						});

					}
				}
			}
		}

		ctx.restore();

		if (isCanvasSupported)
			this._eventManager.ghostCtx.restore();

		//source and dest would be same when animation is not enabled
		var animationBase = Math.min(yZeroToPixel, plotUnit.axisY.boundingRect.y2);
		var animationInfo = {
			source: ctx, dest: this.plotArea.ctx, animationCallback: AnimationHelper.yScaleAnimation, easingFunction: AnimationHelper.easing.easeOutQuart, animationBase: animationBase
		};
		return animationInfo;
	}

	Chart.prototype.renderBar = function (plotUnit) {
		var ctx = plotUnit.targetCanvasCtx || this.plotArea.ctx;
		var totalDataSeries = plotUnit.dataSeriesIndexes.length;

		if (totalDataSeries <= 0)
			return;

		var color = null;

		var plotArea = this.plotArea;

		var i = 0, x, y;
		var dataPointX; //Used so that when dataPoint.x is a DateTime value, it doesn't get converted to number from dataTime everytime it is used.

		//In case of Bar Chart, yZeroToPixel is x co-ordinate!
		var yZeroToPixel = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (0 - plotUnit.axisY.conversionParameters.minimum)) << 0;

		var maxBarWidth = this.dataPointMaxWidth ? this.dataPointMaxWidth : Math.min((this.height * .15), this.plotArea.height / plotUnit.plotType.totalDataSeries * .9) << 0;
		var xMinDiff = plotUnit.axisX.dataInfo.minDiff;
		//var barWidth = (((plotArea.height / Math.abs(plotUnit.axisX.viewportMaximum - plotUnit.axisX.viewportMinimum)) * Math.abs(xMinDiff)) / totalDataSeries * .9) << 0;

		var barWidth = (((plotArea.height / Math.abs(plotUnit.axisX.viewportMaximum - plotUnit.axisX.viewportMinimum)) * Math.abs(xMinDiff)) / plotUnit.plotType.totalDataSeries * .9) << 0;

		if (barWidth > maxBarWidth)
			barWidth = maxBarWidth;
		else if (xMinDiff === Infinity) {
			barWidth = maxBarWidth / plotUnit.plotType.totalDataSeries * .9;
		} else if (barWidth < 1)
			barWidth = 1;

		ctx.save();

		if (isCanvasSupported)
			this._eventManager.ghostCtx.save();

		ctx.beginPath();
		ctx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
		ctx.clip();

		if (isCanvasSupported) {
			this._eventManager.ghostCtx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
			this._eventManager.ghostCtx.clip();
		}

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];

			var dataSeries = this.data[dataSeriesIndex];
			var dataPoints = dataSeries.dataPoints;
			var isFirstDataPointInPlotArea = true;


			//dataSeries.maxWidthInX = barWidth / (plotUnit.axisX.conversionParameters.pixelPerUnit > 1 ? plotUnit.axisX.conversionParameters.pixelPerUnit - 1 : plotUnit.axisX.conversionParameters.pixelPerUnit);


			if (dataPoints.length > 0) {
				//var xy = this.getPixelCoordinatesOnPlotArea(dataPoints[0].x, dataPoints[0].y);

				var bevelEnabled = (barWidth > 5) && dataSeries.bevelEnabled ? true : false;

				ctx.strokeStyle = "#4572A7 ";

				for (i = 0; i < dataPoints.length; i++) {

					dataPoints[i].getTime ? dataPointX = dataPoints[i].x.getTime() : dataPointX = dataPoints[i].x;

					if (dataPointX < plotUnit.axisX.dataInfo.viewPortMin || dataPointX > plotUnit.axisX.dataInfo.viewPortMax) {
						continue;
					}

					if (typeof (dataPoints[i].y) !== "number")
						continue;

					//x and y are pixel co-ordinates of point and should not be confused with X and Y values
					y = (plotUnit.axisX.conversionParameters.reference + plotUnit.axisX.conversionParameters.pixelPerUnit * (dataPointX - plotUnit.axisX.conversionParameters.minimum) + .5) << 0;
					x = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;


					var y1 = (y - (plotUnit.plotType.totalDataSeries * barWidth / 2) + ((plotUnit.previousDataSeriesCount + j) * barWidth)) << 0;
					var y2 = y1 + barWidth << 0;
					var x1;
					var x2;

					if (dataPoints[i].y >= 0) {
						x1 = yZeroToPixel;
						x2 = x;
					} else {
						x1 = x;
						x2 = yZeroToPixel;
					}

					//drawRect(ctx, x1, y1, plotArea.x2, y2, "#EEEEEE", 0, null, false, false, false, false);
					//drawRect(ctx, x1, y1, plotArea.x2, y2, "#BDCED3", 0, null, false, false, false, false);

					color = dataPoints[i].color ? dataPoints[i].color : dataSeries._colorSet[i % dataSeries._colorSet.length];
					//color = "#1B4962";
					drawRect(ctx, x1, y1, x2, y2, color, 0, null, bevelEnabled, false, false, false, dataSeries.fillOpacity);


					var id = dataSeries.dataPointIds[i];
					this._eventManager.objectMap[id] = {
						id: id, objectType: "dataPoint", dataSeriesIndex: dataSeriesIndex, dataPointIndex: i, x1: x1, y1: y1, x2: x2, y2: y2
					};
					color = intToHexColorString(id);

					if (isCanvasSupported)
						drawRect(this._eventManager.ghostCtx, x1, y1, x2, y2, color, 0, null, false, false, false, false);

					if (dataPoints[i].indexLabel || dataSeries.indexLabel || dataPoints[i].indexLabelFormatter || dataSeries.indexLabelFormatter)
						this._indexLabels.push({
							chartType: "bar",
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							point: {
								x: dataPoints[i].y >= 0 ? x2 : x1, y: y1 + (y2 - y1) / 2
							},
							direction: dataPoints[i].y >= 0 ? 1 : -1,
							bounds: {
								x1: Math.min(x1, x2), y1: y1, x2: Math.max(x1, x2), y2: y2
							},
							color: color
						});
				}
			}
		}

		ctx.restore();

		if (isCanvasSupported)
			this._eventManager.ghostCtx.restore();

		//source and dest would be same when animation is not enabled
		var animationBase = Math.max(yZeroToPixel, plotUnit.axisX.boundingRect.x2);
		var animationInfo = {
			source: ctx, dest: this.plotArea.ctx, animationCallback: AnimationHelper.xScaleAnimation, easingFunction: AnimationHelper.easing.easeOutQuart, animationBase: animationBase
		};
		return animationInfo;
	}

	Chart.prototype.renderStackedBar = function (plotUnit) {
		var ctx = plotUnit.targetCanvasCtx || this.plotArea.ctx;
		var totalDataSeries = plotUnit.dataSeriesIndexes.length;

		if (totalDataSeries <= 0)
			return;

		var color = null;

		var plotArea = this.plotArea;

		var offsetPositiveY = [];
		var offsetNegativeY = [];

		var i = 0, x, y;
		var dataPointX; //Used so that when dataPoint.x is a DateTime value, it doesn't get converted to number everytime it is accessed.

		//var yZeroToPixel = (axisYProps.y2 - axisYProps.height / rangeY * Math.abs(0 - plotUnit.axisY.viewportMinimum) + .5) << 0;
		var yZeroToPixel = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (0 - plotUnit.axisY.conversionParameters.minimum)) << 0;

		var maxBarWidth = this.dataPointMaxWidth ? this.dataPointMaxWidth : this.height * .15 << 0;
		var xMinDiff = plotUnit.axisX.dataInfo.minDiff;
		var barWidth = (((plotArea.height / Math.abs(plotUnit.axisX.viewportMaximum - plotUnit.axisX.viewportMinimum)) * Math.abs(xMinDiff)) / plotUnit.plotType.plotUnits.length * .9) << 0;

		if (barWidth > maxBarWidth)
			barWidth = maxBarWidth;
		else if (xMinDiff === Infinity) {
			barWidth = maxBarWidth;
		} else if (barWidth < 1)
			barWidth = 1;

		ctx.save();

		if (isCanvasSupported)
			this._eventManager.ghostCtx.save();

		ctx.beginPath();
		ctx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
		ctx.clip();

		if (isCanvasSupported) {
			this._eventManager.ghostCtx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
			this._eventManager.ghostCtx.clip();
		}

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];

			var dataSeries = this.data[dataSeriesIndex];
			var dataPoints = dataSeries.dataPoints;
			var isFirstDataPointInPlotArea = true;

			//dataSeries.maxWidthInX = barWidth / (plotUnit.axisX.conversionParameters.pixelPerUnit > 1 ? plotUnit.axisX.conversionParameters.pixelPerUnit - 1 : plotUnit.axisX.conversionParameters.pixelPerUnit);

			if (dataPoints.length > 0) {
				//var xy = this.getPixelCoordinatesOnPlotArea(dataPoints[0].x, dataPoints[0].y);

				var bevelEnabled = (barWidth > 5) && dataSeries.bevelEnabled ? true : false;

				ctx.strokeStyle = "#4572A7 ";

				for (i = 0; i < dataPoints.length; i++) {

					dataPointX = dataPoints[i].x.getTime ? dataPoints[i].x.getTime() : dataPoints[i].x;


					if (dataPointX < plotUnit.axisX.dataInfo.viewPortMin || dataPointX > plotUnit.axisX.dataInfo.viewPortMax) {
						continue;
					}

					if (typeof (dataPoints[i].y) !== "number")
						continue;

					y = (plotUnit.axisX.conversionParameters.reference + plotUnit.axisX.conversionParameters.pixelPerUnit * (dataPointX - plotUnit.axisX.conversionParameters.minimum) + .5) << 0;
					//x = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;
					x = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y - plotUnit.axisY.conversionParameters.minimum));

					//var x1 = x - (plotUnit.plotType.plotUnits.length * barWidth / 2) + (plotUnit.index * barWidth) << 0;

					var y1 = y - (plotUnit.plotType.plotUnits.length * barWidth / 2) + (plotUnit.index * barWidth) << 0;
					var y2 = y1 + barWidth << 0;
					var x1;
					var x2;

					if (dataPoints[i].y >= 0) {
						var offset = offsetPositiveY[dataPointX] ? offsetPositiveY[dataPointX] : 0;

						x1 = yZeroToPixel + offset;
						x2 = x + offset;

						offsetPositiveY[dataPointX] = offset + (x2 - x1);

					} else {
						var offset = offsetNegativeY[dataPointX] ? offsetNegativeY[dataPointX] : 0;

						x1 = x - offset;
						x2 = yZeroToPixel - offset;

						offsetNegativeY[dataPointX] = offset + (x2 - x1);
					}


					color = dataPoints[i].color ? dataPoints[i].color : dataSeries._colorSet[i % dataSeries._colorSet.length];
					drawRect(ctx, x1, y1, x2, y2, color, 0, null, bevelEnabled, false, false, false, dataSeries.fillOpacity);

					var id = dataSeries.dataPointIds[i];
					this._eventManager.objectMap[id] = {
						id: id, objectType: "dataPoint", dataSeriesIndex: dataSeriesIndex, dataPointIndex: i, x1: x1, y1: y1, x2: x2, y2: y2
					};
					color = intToHexColorString(id);

					if (isCanvasSupported)
						drawRect(this._eventManager.ghostCtx, x1, y1, x2, y2, color, 0, null, false, false, false, false);

					if (dataPoints[i].indexLabel || dataSeries.indexLabel || dataPoints[i].indexLabelFormatter || dataSeries.indexLabelFormatter)
						this._indexLabels.push({
							chartType: "stackedBar",
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							point: {
								x: dataPoints[i].y >= 0 ? x2 : x1, y: y
							},
							direction: dataPoints[i].y >= 0 ? 1 : -1,
							bounds: {
								x1: Math.min(x1, x2), y1: y1, x2: Math.max(x1, x2), y2: y2
							},
							color: color
						});
				}
			}
		}

		ctx.restore();

		if (isCanvasSupported)
			this._eventManager.ghostCtx.restore();

		//source and dest would be same when animation is not enabled
		var animationBase = Math.max(yZeroToPixel, plotUnit.axisX.boundingRect.x2);
		var animationInfo = {
			source: ctx, dest: this.plotArea.ctx, animationCallback: AnimationHelper.xScaleAnimation, easingFunction: AnimationHelper.easing.easeOutQuart, animationBase: animationBase
		};
		return animationInfo;
	}

	Chart.prototype.renderStackedBar100 = function (plotUnit) {
		var ctx = plotUnit.targetCanvasCtx || this.plotArea.ctx;
		var totalDataSeries = plotUnit.dataSeriesIndexes.length;

		if (totalDataSeries <= 0)
			return;

		var color = null;

		var plotArea = this.plotArea;

		var offsetPositiveY = [];
		var offsetNegativeY = [];

		var i = 0, x, y;
		var dataPointX; //Used so that when dataPoint.x is a DateTime value, it doesn't get converted to number everytime it is accessed.

		//var yZeroToPixel = (axisYProps.y2 - axisYProps.height / rangeY * Math.abs(0 - plotUnit.axisY.viewportMinimum) + .5) << 0;
		var yZeroToPixel = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (0 - plotUnit.axisY.conversionParameters.minimum)) << 0;

		var maxBarWidth = this.dataPointMaxWidth ? this.dataPointMaxWidth : this.height * .15 << 0;
		var xMinDiff = plotUnit.axisX.dataInfo.minDiff;
		var barWidth = (((plotArea.height / Math.abs(plotUnit.axisX.viewportMaximum - plotUnit.axisX.viewportMinimum)) * Math.abs(xMinDiff)) / plotUnit.plotType.plotUnits.length * .9) << 0;

		if (barWidth > maxBarWidth)
			barWidth = maxBarWidth;
		else if (xMinDiff === Infinity) {
			barWidth = maxBarWidth;
		} else if (barWidth < 1)
			barWidth = 1;

		ctx.save();

		if (isCanvasSupported)
			this._eventManager.ghostCtx.save();

		ctx.beginPath();
		ctx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
		ctx.clip();

		if (isCanvasSupported) {
			this._eventManager.ghostCtx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
			this._eventManager.ghostCtx.clip();
		}

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];

			var dataSeries = this.data[dataSeriesIndex];
			var dataPoints = dataSeries.dataPoints;
			var isFirstDataPointInPlotArea = true;

			//dataSeries.maxWidthInX = barWidth / (plotUnit.axisX.conversionParameters.pixelPerUnit > 1 ? plotUnit.axisX.conversionParameters.pixelPerUnit - 1 : plotUnit.axisX.conversionParameters.pixelPerUnit);

			if (dataPoints.length > 0) {
				//var xy = this.getPixelCoordinatesOnPlotArea(dataPoints[0].x, dataPoints[0].y);

				var bevelEnabled = (barWidth > 5) && dataSeries.bevelEnabled ? true : false;

				ctx.strokeStyle = "#4572A7 ";

				for (i = 0; i < dataPoints.length; i++) {

					dataPointX = dataPoints[i].x.getTime ? dataPoints[i].x.getTime() : dataPoints[i].x;


					if (dataPointX < plotUnit.axisX.dataInfo.viewPortMin || dataPointX > plotUnit.axisX.dataInfo.viewPortMax) {
						continue;
					}

					if (typeof (dataPoints[i].y) !== "number")
						continue;

					y = (plotUnit.axisX.conversionParameters.reference + plotUnit.axisX.conversionParameters.pixelPerUnit * (dataPointX - plotUnit.axisX.conversionParameters.minimum) + .5) << 0;

					var yPercent;
					if (plotUnit.dataPointYSums[dataPointX] !== 0)
						yPercent = dataPoints[i].y / plotUnit.dataPointYSums[dataPointX] * 100;
					else
						yPercent = 0;

					//x = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (yPercent - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;
					x = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (yPercent - plotUnit.axisY.conversionParameters.minimum));

					var y1 = y - (plotUnit.plotType.plotUnits.length * barWidth / 2) + (plotUnit.index * barWidth) << 0;
					var y2 = y1 + barWidth << 0;
					var x1;
					var x2;


					if (dataPoints[i].y >= 0) {
						var offset = offsetPositiveY[dataPointX] ? offsetPositiveY[dataPointX] : 0;

						x1 = yZeroToPixel + offset;
						x2 = x + offset;

						offsetPositiveY[dataPointX] = offset + (x2 - x1);

					} else {
						var offset = offsetNegativeY[dataPointX] ? offsetNegativeY[dataPointX] : 0;

						x1 = x - offset;
						x2 = yZeroToPixel - offset;

						offsetNegativeY[dataPointX] = offset + (x2 - x1);
					}


					color = dataPoints[i].color ? dataPoints[i].color : dataSeries._colorSet[i % dataSeries._colorSet.length];
					drawRect(ctx, x1, y1, x2, y2, color, 0, null, bevelEnabled, false, false, false, dataSeries.fillOpacity);

					var id = dataSeries.dataPointIds[i];
					this._eventManager.objectMap[id] = {
						id: id, objectType: "dataPoint", dataSeriesIndex: dataSeriesIndex, dataPointIndex: i, x1: x1, y1: y1, x2: x2, y2: y2
					};
					color = intToHexColorString(id);

					if (isCanvasSupported)
						drawRect(this._eventManager.ghostCtx, x1, y1, x2, y2, color, 0, null, false, false, false, false);

					if (dataPoints[i].indexLabel || dataSeries.indexLabel || dataPoints[i].indexLabelFormatter || dataSeries.indexLabelFormatter)
						this._indexLabels.push({
							chartType: "stackedBar100",
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							point: {
								x: dataPoints[i].y >= 0 ? x2 : x1, y: y
							},
							direction: dataPoints[i].y >= 0 ? 1 : -1,
							bounds: {
								x1: Math.min(x1, x2), y1: y1, x2: Math.max(x1, x2), y2: y2
							},
							color: color
						});
				}
			}
		}

		ctx.restore();

		if (isCanvasSupported)
			this._eventManager.ghostCtx.restore();

		//source and dest would be same when animation is not enabled
		var animationBase = Math.max(yZeroToPixel, plotUnit.axisX.boundingRect.x2);
		var animationInfo = {
			source: ctx, dest: this.plotArea.ctx, animationCallback: AnimationHelper.xScaleAnimation, easingFunction: AnimationHelper.easing.easeOutQuart, animationBase: animationBase
		};
		return animationInfo;
	}

	Chart.prototype.renderArea = function (plotUnit) {
		var ctx = plotUnit.targetCanvasCtx || this.plotArea.ctx;

		var totalDataSeries = plotUnit.dataSeriesIndexes.length;

		if (totalDataSeries <= 0)
			return;

		var ghostCtx = this._eventManager.ghostCtx;

		var axisXProps = plotUnit.axisX.lineCoordinates;
		var axisYProps = plotUnit.axisY.lineCoordinates;
		var markers = [];

		var plotArea = this.plotArea;
		ctx.save();

		if (isCanvasSupported)
			ghostCtx.save();

		ctx.beginPath();
		ctx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
		ctx.clip();

		if (isCanvasSupported) {
			ghostCtx.beginPath();
			ghostCtx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
			ghostCtx.clip();
		}

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];

			var dataSeries = this.data[dataSeriesIndex];

			var dataPoints = dataSeries.dataPoints;

			var seriesId = dataSeries.id;
			this._eventManager.objectMap[seriesId] = {
				objectType: "dataSeries", dataSeriesIndex: dataSeriesIndex
			};

			var hexColor = intToHexColorString(seriesId);
			ghostCtx.fillStyle = hexColor;
			//ghostCtx.lineWidth = dataSeries.lineThickness;
			//ghostCtx.lineWidth = 20;

			markers = [];

			var isFirstDataPointInPlotArea = true;
			var i = 0, x, y;
			var dataPointX; //Used so that when dataPoint.x is a DateTime value, it doesn't get converted to number back and forth.

			var yZeroToPixel = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (0 - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;
			var baseY;

			var startPoint = null;

			if (dataPoints.length > 0) {
				//ctx.strokeStyle = "#4572A7 ";
				var color = dataSeries._colorSet[i % dataSeries._colorSet.length];
				//ctx.strokeStyle = "red";
				ctx.fillStyle = color;
				ctx.strokeStyle = color;
				ctx.lineWidth = dataSeries.lineThickness;

				if (ctx.setLineDash) {
					ctx.setLineDash(getLineDashArray(dataSeries.lineDashType, dataSeries.lineThickness));
				}

				var prevDataNull = true;
				for (; i < dataPoints.length; i++) {

					dataPointX = dataPoints[i].x.getTime ? dataPoints[i].x.getTime() : dataPoints[i].x;

					if (dataPointX < plotUnit.axisX.dataInfo.viewPortMin || dataPointX > plotUnit.axisX.dataInfo.viewPortMax) {
						continue;
					}

					if (typeof (dataPoints[i].y) !== "number") {
						closeArea();

						prevDataNull = true;
						continue;
					}

					x = (plotUnit.axisX.conversionParameters.reference + plotUnit.axisX.conversionParameters.pixelPerUnit * (dataPointX - plotUnit.axisX.conversionParameters.minimum) + .5) << 0;
					y = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;

					if (isFirstDataPointInPlotArea || prevDataNull) {
						ctx.beginPath();
						ctx.moveTo(x, y);
						startPoint = {
							x: x, y: y
						};

						if (isCanvasSupported) {
							ghostCtx.beginPath();
							ghostCtx.moveTo(x, y);
						}

						isFirstDataPointInPlotArea = false;
						prevDataNull = false;
					}
					else {

						ctx.lineTo(x, y);

						if (isCanvasSupported)
							ghostCtx.lineTo(x, y);

						if (i % 250 == 0) {
							closeArea();
						}
					}


					var id = dataSeries.dataPointIds[i];
					this._eventManager.objectMap[id] = {
						id: id, objectType: "dataPoint", dataSeriesIndex: dataSeriesIndex, dataPointIndex: i, x1: x, y1: y
					};

					//Render Marker
					if (dataPoints[i].markerSize !== 0) {
						if (dataPoints[i].markerSize > 0 || dataSeries.markerSize > 0) {
							var markerProps = dataSeries.getMarkerProperties(i, x, y, ctx);
							markers.push(markerProps);

							//if (!dataSeries.maxWidthInX || markerProps.size > dataSeries.maxWidthInX) {
							//	dataSeries.maxWidthInX = markerProps.size / (plotUnit.axisX.conversionParameters.pixelPerUnit > 1 ? plotUnit.axisX.conversionParameters.pixelPerUnit - 1 : plotUnit.axisX.conversionParameters.pixelPerUnit);
							//}

							var markerColor = intToHexColorString(id);

							if (isCanvasSupported) {
								markers.push({
									x: x, y: y, ctx: ghostCtx,
									type: markerProps.type,
									size: markerProps.size,
									color: markerColor,
									borderColor: markerColor,
									borderThickness: markerProps.borderThickness
								});
							}
						}
					}

					if (dataPoints[i].indexLabel || dataSeries.indexLabel || dataPoints[i].indexLabelFormatter || dataSeries.indexLabelFormatter) {

						this._indexLabels.push({
							chartType: "area",
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							point: {
								x: x, y: y
							},
							direction: dataPoints[i].y >= 0 ? 1 : -1,
							color: color
						});

					}
				}

				closeArea();

				//startPoint = { x: x, y: y };
				RenderHelper.drawMarkers(markers);
			}
		}

		ctx.restore();
		if (isCanvasSupported)
			this._eventManager.ghostCtx.restore();

		function closeArea() {

			if (!startPoint)
				return;

			if (dataSeries.lineThickness > 0)
				ctx.stroke();

			if (plotUnit.axisY.viewportMinimum <= 0 && plotUnit.axisY.viewportMaximum >= 0) {
				baseY = yZeroToPixel;
			}
			else if (plotUnit.axisY.viewportMaximum < 0)
				baseY = axisYProps.y1;
			else if (plotUnit.axisY.viewportMinimum > 0)
				baseY = axisXProps.y2;

			ctx.lineTo(x, baseY);
			ctx.lineTo(startPoint.x, baseY);
			ctx.closePath();

			ctx.globalAlpha = dataSeries.fillOpacity;
			ctx.fill();
			ctx.globalAlpha = 1;

			if (isCanvasSupported) {
				ghostCtx.lineTo(x, baseY);
				ghostCtx.lineTo(startPoint.x, baseY);
				ghostCtx.closePath();
				ghostCtx.fill();
			}

			ctx.beginPath();
			ctx.moveTo(x, y);
			ghostCtx.beginPath();
			ghostCtx.moveTo(x, y);

			startPoint = {
				x: x, y: y
			};
		}

		//source and dest would be same when animation is not enabled
		var animationInfo = {
			source: ctx, dest: this.plotArea.ctx, animationCallback: AnimationHelper.xClipAnimation, easingFunction: AnimationHelper.easing.linear, animationBase: 0
		};
		return animationInfo;
	}

	Chart.prototype.renderSplineArea = function (plotUnit) {
		var ctx = plotUnit.targetCanvasCtx || this.plotArea.ctx;

		var totalDataSeries = plotUnit.dataSeriesIndexes.length;

		if (totalDataSeries <= 0)
			return;

		var ghostCtx = this._eventManager.ghostCtx;

		var axisXProps = plotUnit.axisX.lineCoordinates;
		var axisYProps = plotUnit.axisY.lineCoordinates;
		var markers = [];

		var plotArea = this.plotArea;
		ctx.save();

		if (isCanvasSupported)
			ghostCtx.save();

		ctx.beginPath();
		ctx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
		ctx.clip();

		if (isCanvasSupported) {
			ghostCtx.beginPath();
			ghostCtx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
			ghostCtx.clip();
		}

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];

			var dataSeries = this.data[dataSeriesIndex];

			var dataPoints = dataSeries.dataPoints;

			var seriesId = dataSeries.id;
			this._eventManager.objectMap[seriesId] = {
				objectType: "dataSeries", dataSeriesIndex: dataSeriesIndex
			};

			var hexColor = intToHexColorString(seriesId);
			ghostCtx.fillStyle = hexColor;
			//ghostCtx.lineWidth = dataSeries.lineThickness;
			//ghostCtx.lineWidth = 20;

			markers = [];

			var isFirstDataPointInPlotArea = true;
			var i = 0, x, y;
			var dataPointX; //Used so that when dataPoint.x is a DateTime value, it doesn't get converted to number back and forth.

			var yZeroToPixel = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (0 - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;
			var baseY;

			var startPoint = null;

			var pixels = [];

			if (dataPoints.length > 0) {
				//ctx.strokeStyle = "#4572A7 ";
				color = dataSeries._colorSet[i % dataSeries._colorSet.length];
				ctx.fillStyle = color;
				ctx.strokeStyle = color;
				ctx.lineWidth = dataSeries.lineThickness;

				if (ctx.setLineDash) {
					ctx.setLineDash(getLineDashArray(dataSeries.lineDashType, dataSeries.lineThickness));
				}

				for (; i < dataPoints.length; i++) {

					dataPointX = dataPoints[i].x.getTime ? dataPoints[i].x.getTime() : dataPoints[i].x;

					if (dataPointX < plotUnit.axisX.dataInfo.viewPortMin || dataPointX > plotUnit.axisX.dataInfo.viewPortMax) {
						continue;
					}

					if (typeof (dataPoints[i].y) !== "number") {
						if (i > 0) {
							renderBezierArea();
							pixels = [];
						}
						continue;
					}

					x = (plotUnit.axisX.conversionParameters.reference + plotUnit.axisX.conversionParameters.pixelPerUnit * (dataPointX - plotUnit.axisX.conversionParameters.minimum) + .5) << 0;
					y = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;


					var id = dataSeries.dataPointIds[i];
					this._eventManager.objectMap[id] = {
						id: id, objectType: "dataPoint", dataSeriesIndex: dataSeriesIndex, dataPointIndex: i, x1: x, y1: y
					};

					pixels[pixels.length] = {
						x: x, y: y
					};

					//Render Marker
					if (dataPoints[i].markerSize !== 0) {
						if (dataPoints[i].markerSize > 0 || dataSeries.markerSize > 0) {
							var markerProps = dataSeries.getMarkerProperties(i, x, y, ctx);
							markers.push(markerProps);

							//if (!dataSeries.maxWidthInX || markerProps.size > dataSeries.maxWidthInX) {
							//	dataSeries.maxWidthInX = markerProps.size / (plotUnit.axisX.conversionParameters.pixelPerUnit > 1 ? plotUnit.axisX.conversionParameters.pixelPerUnit - 1 : plotUnit.axisX.conversionParameters.pixelPerUnit);
							//}

							var markerColor = intToHexColorString(id);

							if (isCanvasSupported) {
								markers.push({
									x: x, y: y, ctx: ghostCtx,
									type: markerProps.type,
									size: markerProps.size,
									color: markerColor,
									borderColor: markerColor,
									borderThickness: markerProps.borderThickness
								});
							}
						}
					}


					//Render Index Labels
					if (dataPoints[i].indexLabel || dataSeries.indexLabel || dataPoints[i].indexLabelFormatter || dataSeries.indexLabelFormatter) {

						this._indexLabels.push({
							chartType: "splineArea",
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							point: {
								x: x, y: y
							},
							direction: dataPoints[i].y >= 0 ? 1 : -1,
							color: color
						});

					}
				}

				renderBezierArea();

				RenderHelper.drawMarkers(markers);
			}
		}

		ctx.restore();

		if (isCanvasSupported)
			this._eventManager.ghostCtx.restore();

		function renderBezierArea() {
			var bp = getBezierPoints(pixels, 2);

			if (bp.length > 0) {
				ctx.beginPath();
				ctx.moveTo(bp[0].x, bp[0].y);

				if (isCanvasSupported) {
					ghostCtx.beginPath();
					ghostCtx.moveTo(bp[0].x, bp[0].y);
				}


				for (var i = 0; i < bp.length - 3; i += 3) {

					ctx.bezierCurveTo(bp[i + 1].x, bp[i + 1].y, bp[i + 2].x, bp[i + 2].y, bp[i + 3].x, bp[i + 3].y);

					if (isCanvasSupported)
						ghostCtx.bezierCurveTo(bp[i + 1].x, bp[i + 1].y, bp[i + 2].x, bp[i + 2].y, bp[i + 3].x, bp[i + 3].y);

				}

				if (dataSeries.lineThickness > 0)
					ctx.stroke();

				if (plotUnit.axisY.viewportMinimum <= 0 && plotUnit.axisY.viewportMaximum >= 0) {
					baseY = yZeroToPixel;
				}
				else if (plotUnit.axisY.viewportMaximum < 0)
					baseY = axisYProps.y1;
				else if (plotUnit.axisY.viewportMinimum > 0)
					baseY = axisXProps.y2;

				startPoint = {
					x: bp[0].x, y: bp[0].y
				};

				ctx.lineTo(bp[bp.length - 1].x, baseY);
				ctx.lineTo(startPoint.x, baseY);
				ctx.closePath();

				ctx.globalAlpha = dataSeries.fillOpacity;
				ctx.fill();
				ctx.globalAlpha = 1;

				if (isCanvasSupported) {
					ghostCtx.lineTo(bp[bp.length - 1].x, baseY);
					ghostCtx.lineTo(startPoint.x, baseY);
					ghostCtx.closePath();
					ghostCtx.fill();
				}
			}
		}

		//source and dest would be same when animation is not enabled
		var animationInfo = {
			source: ctx, dest: this.plotArea.ctx, animationCallback: AnimationHelper.xClipAnimation, easingFunction: AnimationHelper.easing.linear, animationBase: 0
		};
		return animationInfo;
	}

	Chart.prototype.renderStepArea = function (plotUnit) {
		var ctx = plotUnit.targetCanvasCtx || this.plotArea.ctx;

		var totalDataSeries = plotUnit.dataSeriesIndexes.length;

		if (totalDataSeries <= 0)
			return;

		var ghostCtx = this._eventManager.ghostCtx;

		var axisXProps = plotUnit.axisX.lineCoordinates;
		var axisYProps = plotUnit.axisY.lineCoordinates;
		var markers = [];

		var plotArea = this.plotArea;
		ctx.save();

		if (isCanvasSupported)
			ghostCtx.save();

		ctx.beginPath();
		ctx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
		ctx.clip();

		if (isCanvasSupported) {
			ghostCtx.beginPath();
			ghostCtx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
			ghostCtx.clip();
		}

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];

			var dataSeries = this.data[dataSeriesIndex];

			var dataPoints = dataSeries.dataPoints;

			var seriesId = dataSeries.id;
			this._eventManager.objectMap[seriesId] = {
				objectType: "dataSeries", dataSeriesIndex: dataSeriesIndex
			};

			var hexColor = intToHexColorString(seriesId);
			ghostCtx.fillStyle = hexColor;
			//ghostCtx.lineWidth = dataSeries.lineThickness;
			//ghostCtx.lineWidth = 20;

			markers = [];

			var isFirstDataPointInPlotArea = true;
			var i = 0, x, y;
			var dataPointX; //Used so that when dataPoint.x is a DateTime value, it doesn't get converted to number back and forth.

			var yZeroToPixel = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (0 - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;
			var baseY;

			var startPoint = null;

			var prevDataNull = false;
			if (dataPoints.length > 0) {
				//ctx.strokeStyle = "#4572A7 ";
				var color = dataSeries._colorSet[i % dataSeries._colorSet.length];
				//ctx.strokeStyle = "red";
				ctx.fillStyle = color;
				ctx.strokeStyle = color;
				ctx.lineWidth = dataSeries.lineThickness;

				if (ctx.setLineDash) {
					ctx.setLineDash(getLineDashArray(dataSeries.lineDashType, dataSeries.lineThickness));
				}

				for (; i < dataPoints.length; i++) {

					dataPointX = dataPoints[i].x.getTime ? dataPoints[i].x.getTime() : dataPoints[i].x;

					if (dataPointX < plotUnit.axisX.dataInfo.viewPortMin || dataPointX > plotUnit.axisX.dataInfo.viewPortMax) {
						continue;
					}

					var prevY = y;

					if (typeof (dataPoints[i].y) !== "number") {
						closeArea();

						prevDataNull = true;
						continue;
					}

					x = (plotUnit.axisX.conversionParameters.reference + plotUnit.axisX.conversionParameters.pixelPerUnit * (dataPointX - plotUnit.axisX.conversionParameters.minimum) + .5) << 0;
					y = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;



					if (isFirstDataPointInPlotArea || prevDataNull) {
						ctx.beginPath();
						ctx.moveTo(x, y);
						startPoint = {
							x: x, y: y
						};

						if (isCanvasSupported) {
							ghostCtx.beginPath();
							ghostCtx.moveTo(x, y);
						}

						isFirstDataPointInPlotArea = false;
						prevDataNull = false;
					}
					else {

						ctx.lineTo(x, prevY);
						if (isCanvasSupported)
							ghostCtx.lineTo(x, prevY);

						ctx.lineTo(x, y);

						if (isCanvasSupported)
							ghostCtx.lineTo(x, y);

						if (i % 250 == 0) {
							closeArea();
						}
					}


					var id = dataSeries.dataPointIds[i];
					this._eventManager.objectMap[id] = {
						id: id, objectType: "dataPoint", dataSeriesIndex: dataSeriesIndex, dataPointIndex: i, x1: x, y1: y
					};

					//Render Marker
					if (dataPoints[i].markerSize !== 0) {
						if (dataPoints[i].markerSize > 0 || dataSeries.markerSize > 0) {
							var markerProps = dataSeries.getMarkerProperties(i, x, y, ctx);
							markers.push(markerProps);

							//if (!dataSeries.maxWidthInX || markerProps.size > dataSeries.maxWidthInX) {
							//	dataSeries.maxWidthInX = markerProps.size / (plotUnit.axisX.conversionParameters.pixelPerUnit > 1 ? plotUnit.axisX.conversionParameters.pixelPerUnit - 1 : plotUnit.axisX.conversionParameters.pixelPerUnit);
							//}

							var markerColor = intToHexColorString(id);

							if (isCanvasSupported) {
								markers.push({
									x: x, y: y, ctx: ghostCtx,
									type: markerProps.type,
									size: markerProps.size,
									color: markerColor,
									borderColor: markerColor,
									borderThickness: markerProps.borderThickness
								});
							}
						}
					}

					if (dataPoints[i].indexLabel || dataSeries.indexLabel || dataPoints[i].indexLabelFormatter || dataSeries.indexLabelFormatter) {

						this._indexLabels.push({
							chartType: "stepArea",
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							point: {
								x: x, y: y
							},
							direction: dataPoints[i].y >= 0 ? 1 : -1,
							color: color
						});

					}
				}

				closeArea();

				RenderHelper.drawMarkers(markers);
			}
		}

		ctx.restore();
		if (isCanvasSupported)
			this._eventManager.ghostCtx.restore();

		function closeArea() {

			if (!startPoint)
				return;

			if (dataSeries.lineThickness > 0)
				ctx.stroke();

			if (plotUnit.axisY.viewportMinimum <= 0 && plotUnit.axisY.viewportMaximum >= 0) {
				baseY = yZeroToPixel;
			}
			else if (plotUnit.axisY.viewportMaximum < 0)
				baseY = axisYProps.y1;
			else if (plotUnit.axisY.viewportMinimum > 0)
				baseY = axisXProps.y2;

			ctx.lineTo(x, baseY);
			ctx.lineTo(startPoint.x, baseY);
			ctx.closePath();

			ctx.globalAlpha = dataSeries.fillOpacity;
			ctx.fill();
			ctx.globalAlpha = 1;

			if (isCanvasSupported) {
				ghostCtx.lineTo(x, baseY);
				ghostCtx.lineTo(startPoint.x, baseY);
				ghostCtx.closePath();
				ghostCtx.fill();
			}

			ctx.beginPath();
			ctx.moveTo(x, y);
			ghostCtx.beginPath();
			ghostCtx.moveTo(x, y);

			startPoint = {
				x: x, y: y
			};
		}

		//source and dest would be same when animation is not enabled
		var animationInfo = {
			source: ctx, dest: this.plotArea.ctx, animationCallback: AnimationHelper.xClipAnimation, easingFunction: AnimationHelper.easing.linear, animationBase: 0
		};
		return animationInfo;
	}

	Chart.prototype.renderStackedArea = function (plotUnit) {
		var ctx = plotUnit.targetCanvasCtx || this.plotArea.ctx;

		var totalDataSeries = plotUnit.dataSeriesIndexes.length;

		if (totalDataSeries <= 0)
			return;

		var color = null;
		var markers = [];

		var plotArea = this.plotArea;

		var offsetY = [];

		var allXValues = [];
		//var offsetNegativeY = [];

		var i = 0, x, y;
		var dataPointX; //Used so that when dataPoint.x is a DateTime value, it doesn't get converted to number everytime it is accessed.

		//var yZeroToPixel = (axisYProps.y2 - axisYProps.height / rangeY * Math.abs(0 - plotUnit.axisY.viewportMinimum) + .5) << 0;
		var yZeroToPixel = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (0 - plotUnit.axisY.conversionParameters.minimum)) << 0;

		var xMinDiff = plotUnit.axisX.dataInfo.minDiff;

		var ghostCtx = this._eventManager.ghostCtx;

		if (isCanvasSupported)
			ghostCtx.beginPath();

		ctx.save();

		if (isCanvasSupported)
			ghostCtx.save();

		ctx.beginPath();
		ctx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
		ctx.clip();

		if (isCanvasSupported) {
			ghostCtx.beginPath();
			ghostCtx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
			ghostCtx.clip();
		}

		xValuePresent = [];
		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];
			var dataSeries = this.data[dataSeriesIndex];
			var dataPoints = dataSeries.dataPoints;
			var xValue;

			dataSeries.dataPointIndexes = [];

			for (i = 0; i < dataPoints.length; i++) {
				xValue = dataPoints[i].x.getTime ? dataPoints[i].x.getTime() : dataPoints[i].x;
				dataSeries.dataPointIndexes[xValue] = i;

				if (!xValuePresent[xValue]) {
					allXValues.push(xValue);
					xValuePresent[xValue] = true;
				}
			}

			allXValues.sort(compareNumbers);
		}

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];

			var dataSeries = this.data[dataSeriesIndex];
			var dataPoints = dataSeries.dataPoints;
			var isFirstDataPointInPlotArea = true;

			var currentBaseValues = [];


			var seriesId = dataSeries.id;
			this._eventManager.objectMap[seriesId] = {
				objectType: "dataSeries", dataSeriesIndex: dataSeriesIndex
			};
			var hexColor = intToHexColorString(seriesId);
			ghostCtx.fillStyle = hexColor;



			if (allXValues.length > 0) {

				color = dataSeries._colorSet[0];
				//ctx.strokeStyle = "red";
				ctx.fillStyle = color;
				ctx.strokeStyle = color;
				ctx.lineWidth = dataSeries.lineThickness;

				if (ctx.setLineDash) {
					ctx.setLineDash(getLineDashArray(dataSeries.lineDashType, dataSeries.lineThickness));
				}

				for (i = 0; i < allXValues.length; i++) {

					dataPointX = allXValues[i];
					var dataPoint = null;

					if (dataSeries.dataPointIndexes[dataPointX] >= 0)
						dataPoint = dataPoints[dataSeries.dataPointIndexes[dataPointX]];
					else
						dataPoint = {
							x: dataPointX, y: 0
						};

					if (dataPointX < plotUnit.axisX.dataInfo.viewPortMin || dataPointX > plotUnit.axisX.dataInfo.viewPortMax) {
						continue;
					}

					if (typeof (dataPoint.y) !== "number")
						continue;

					var x = (plotUnit.axisX.conversionParameters.reference + plotUnit.axisX.conversionParameters.pixelPerUnit * (dataPointX - plotUnit.axisX.conversionParameters.minimum) + .5) << 0;
					//var y = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoint.y - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;
					var y = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoint.y - plotUnit.axisY.conversionParameters.minimum));

					var offset = offsetY[dataPointX] ? offsetY[dataPointX] : 0;

					y = y - offset;
					currentBaseValues.push({ x: x, y: yZeroToPixel - offset });
					offsetY[dataPointX] = yZeroToPixel - y;

					if (isFirstDataPointInPlotArea) {
						ctx.beginPath();
						ctx.moveTo(x, y);

						if (isCanvasSupported) {
							ghostCtx.beginPath();
							ghostCtx.moveTo(x, y);
						}

						isFirstDataPointInPlotArea = false;
					}
					else {

						ctx.lineTo(x, y);

						if (isCanvasSupported)
							ghostCtx.lineTo(x, y);

						if (i % 250 == 0) {

							if (dataSeries.lineThickness > 0)
								ctx.stroke();

							while (currentBaseValues.length > 0) {
								var point = currentBaseValues.pop();
								ctx.lineTo(point.x, point.y);

								if (isCanvasSupported)
									ghostCtx.lineTo(point.x, point.y);

							}

							ctx.closePath();

							ctx.globalAlpha = dataSeries.fillOpacity;
							ctx.fill();
							ctx.globalAlpha = 1;

							ctx.beginPath();
							ctx.moveTo(x, y);

							if (isCanvasSupported) {
								ghostCtx.closePath();
								ghostCtx.fill();

								ghostCtx.beginPath();
								ghostCtx.moveTo(x, y);
							}

							currentBaseValues.push({ x: x, y: yZeroToPixel - offset });
						}

					}

					if (dataSeries.dataPointIndexes[dataPointX] >= 0) {
						var id = dataSeries.dataPointIds[dataSeries.dataPointIndexes[dataPointX]];
						this._eventManager.objectMap[id] = {
							id: id, objectType: "dataPoint", dataSeriesIndex: dataSeriesIndex, dataPointIndex: dataSeries.dataPointIndexes[dataPointX], x1: x, y1: y
						};
					}

					//Render Marker
					if (dataSeries.dataPointIndexes[dataPointX] >= 0 && dataPoint.markerSize !== 0) {
						if (dataPoint.markerSize > 0 || dataSeries.markerSize > 0) {

							var markerProps = dataSeries.getMarkerProperties(i, x, y, ctx);
							markers.push(markerProps);

							//if (!dataSeries.maxWidthInX || markerProps.size > dataSeries.maxWidthInX) {
							//	dataSeries.maxWidthInX = markerProps.size / (plotUnit.axisX.conversionParameters.pixelPerUnit > 1 ? plotUnit.axisX.conversionParameters.pixelPerUnit - 1 : plotUnit.axisX.conversionParameters.pixelPerUnit);
							//}

							markerColor = intToHexColorString(id);

							if (isCanvasSupported) {
								markers.push({
									x: x, y: y, ctx: ghostCtx,
									type: markerProps.type,
									size: markerProps.size,
									color: markerColor,
									borderColor: markerColor,
									borderThickness: markerProps.borderThickness
								});
							}
						}
					}

					if (dataPoint.indexLabel || dataSeries.indexLabel || dataPoint.indexLabelFormatter || dataSeries.indexLabelFormatter) {

						this._indexLabels.push({
							chartType: "stackedArea",
							dataPoint: dataPoint,
							dataSeries: dataSeries,
							point: {
								x: x, y: y
							},
							direction: dataPoints[i].y >= 0 ? 1 : -1,
							color: color
						});

					}
				}

				if (dataSeries.lineThickness > 0)
					ctx.stroke();

				while (currentBaseValues.length > 0) {
					var point = currentBaseValues.pop();
					ctx.lineTo(point.x, point.y);

					if (isCanvasSupported)
						ghostCtx.lineTo(point.x, point.y);
				}

				ctx.closePath();

				ctx.globalAlpha = dataSeries.fillOpacity;
				ctx.fill();
				ctx.globalAlpha = 1;

				ctx.beginPath();
				ctx.moveTo(x, y);

				if (isCanvasSupported) {
					ghostCtx.closePath();
					ghostCtx.fill();
					ghostCtx.beginPath();
					ghostCtx.moveTo(x, y);
				}
			}

			delete (dataSeries.dataPointIndexes);
		}

		RenderHelper.drawMarkers(markers);


		ctx.restore();

		if (isCanvasSupported)
			ghostCtx.restore();

		//source and dest would be same when animation is not enabled
		var animationInfo = {
			source: ctx, dest: this.plotArea.ctx, animationCallback: AnimationHelper.xClipAnimation, easingFunction: AnimationHelper.easing.linear, animationBase: 0
		};
		return animationInfo;
	}

	Chart.prototype.renderStackedArea100 = function (plotUnit) {
		var ctx = plotUnit.targetCanvasCtx || this.plotArea.ctx;

		var totalDataSeries = plotUnit.dataSeriesIndexes.length;

		if (totalDataSeries <= 0)
			return;

		var color = null;

		var plotArea = this.plotArea;
		var markers = [];

		var offsetY = [];

		var allXValues = [];
		//var offsetNegativeY = [];

		var i = 0, x, y;
		var dataPointX; //Used so that when dataPoint.x is a DateTime value, it doesn't get converted to number everytime it is accessed.


		//var yZeroToPixel = (axisYProps.y2 - axisYProps.height / rangeY * Math.abs(0 - plotUnit.axisY.viewportMinimum) + .5) << 0;
		var yZeroToPixel = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (0 - plotUnit.axisY.conversionParameters.minimum)) << 0;

		var maxBarWidth = this.dataPointMaxWidth ? this.dataPointMaxWidth : this.width * .15 << 0;
		var xMinDiff = plotUnit.axisX.dataInfo.minDiff;
		var barWidth = (((plotArea.width / Math.abs(plotUnit.axisX.viewportMaximum - plotUnit.axisX.viewportMinimum)) * Math.abs(xMinDiff)) * .9) << 0;

		var ghostCtx = this._eventManager.ghostCtx;

		ctx.save();

		if (isCanvasSupported)
			ghostCtx.save();


		ctx.beginPath();
		ctx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
		ctx.clip();

		if (isCanvasSupported) {
			ghostCtx.beginPath();
			ghostCtx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
			ghostCtx.clip();
		}

		xValuePresent = [];
		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];
			var dataSeries = this.data[dataSeriesIndex];
			var dataPoints = dataSeries.dataPoints;
			var xValue;

			dataSeries.dataPointIndexes = [];

			for (i = 0; i < dataPoints.length; i++) {
				xValue = dataPoints[i].x.getTime ? dataPoints[i].x.getTime() : dataPoints[i].x;
				dataSeries.dataPointIndexes[xValue] = i;

				if (!xValuePresent[xValue]) {
					allXValues.push(xValue);
					xValuePresent[xValue] = true;
				}
			}

			allXValues.sort(compareNumbers);
		}

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];

			var dataSeries = this.data[dataSeriesIndex];
			var dataPoints = dataSeries.dataPoints;
			var isFirstDataPointInPlotArea = true;


			var seriesId = dataSeries.id;
			this._eventManager.objectMap[seriesId] = {
				objectType: "dataSeries", dataSeriesIndex: dataSeriesIndex
			};
			var hexColor = intToHexColorString(seriesId);
			ghostCtx.fillStyle = hexColor;

			if (dataPoints.length == 1)
				barWidth = maxBarWidth;

			if (barWidth < 1)
				barWidth = 1;
			else if (barWidth > maxBarWidth)
				barWidth = maxBarWidth;

			var currentBaseValues = [];

			if (allXValues.length > 0) {

				color = dataSeries._colorSet[i % dataSeries._colorSet.length];
				//ctx.strokeStyle = "red";
				ctx.fillStyle = color;
				ctx.strokeStyle = color;
				ctx.lineWidth = dataSeries.lineThickness;

				if (ctx.setLineDash) {
					ctx.setLineDash(getLineDashArray(dataSeries.lineDashType, dataSeries.lineThickness));
				}

				var bevelEnabled = (barWidth > 5) ? false : false;

				//ctx.strokeStyle = "#4572A7 ";

				for (i = 0; i < allXValues.length; i++) {

					dataPointX = allXValues[i];
					var dataPoint = null;

					if (dataSeries.dataPointIndexes[dataPointX] >= 0)
						dataPoint = dataPoints[dataSeries.dataPointIndexes[dataPointX]];
					else
						dataPoint = {
							x: dataPointX, y: 0
						};

					if (dataPointX < plotUnit.axisX.dataInfo.viewPortMin || dataPointX > plotUnit.axisX.dataInfo.viewPortMax) {
						continue;
					}

					if (typeof (dataPoint.y) !== "number")
						continue;

					var yPercent;
					if (plotUnit.dataPointYSums[dataPointX] !== 0)
						yPercent = dataPoint.y / plotUnit.dataPointYSums[dataPointX] * 100;
					else
						yPercent = 0;

					var x = (plotUnit.axisX.conversionParameters.reference + plotUnit.axisX.conversionParameters.pixelPerUnit * (dataPointX - plotUnit.axisX.conversionParameters.minimum) + .5) << 0;
					var y = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (yPercent - plotUnit.axisY.conversionParameters.minimum));

					var offset = offsetY[dataPointX] ? offsetY[dataPointX] : 0;

					y = y - offset;
					currentBaseValues.push({ x: x, y: yZeroToPixel - offset });
					offsetY[dataPointX] = yZeroToPixel - y;

					if (isFirstDataPointInPlotArea) {
						ctx.beginPath();
						ctx.moveTo(x, y);

						if (isCanvasSupported) {
							ghostCtx.beginPath();
							ghostCtx.moveTo(x, y);
						}

						isFirstDataPointInPlotArea = false;
					}
					else {

						ctx.lineTo(x, y);

						if (isCanvasSupported)
							ghostCtx.lineTo(x, y);

						if (i % 250 == 0) {

							if (dataSeries.lineThickness > 0)
								ctx.stroke();

							while (currentBaseValues.length > 0) {
								var point = currentBaseValues.pop();
								ctx.lineTo(point.x, point.y);

								if (isCanvasSupported)
									ghostCtx.lineTo(point.x, point.y);
							}

							ctx.closePath();

							ctx.globalAlpha = dataSeries.fillOpacity;
							ctx.fill();
							ctx.globalAlpha = 1;

							ctx.beginPath();
							ctx.moveTo(x, y);

							if (isCanvasSupported) {
								ghostCtx.closePath();
								ghostCtx.fill();
								ghostCtx.beginPath();
								ghostCtx.moveTo(x, y);
							}

							currentBaseValues.push({ x: x, y: yZeroToPixel - offset });
						}
					}


					if (dataSeries.dataPointIndexes[dataPointX] >= 0) {
						var id = dataSeries.dataPointIds[dataSeries.dataPointIndexes[dataPointX]];
						this._eventManager.objectMap[id] = {
							id: id, objectType: "dataPoint", dataSeriesIndex: dataSeriesIndex, dataPointIndex: dataSeries.dataPointIndexes[dataPointX], x1: x, y1: y
						};
					}

					//Render Marker
					if (dataSeries.dataPointIndexes[dataPointX] >= 0 && dataPoint.markerSize !== 0) {
						if (dataPoint.markerSize > 0 || dataSeries.markerSize > 0) {
							var markerProps = dataSeries.getMarkerProperties(i, x, y, ctx);
							markers.push(markerProps);

							//if (!dataSeries.maxWidthInX || markerProps.size > dataSeries.maxWidthInX) {
							//	dataSeries.maxWidthInX = markerProps.size / (plotUnit.axisX.conversionParameters.pixelPerUnit > 1 ? plotUnit.axisX.conversionParameters.pixelPerUnit - 1 : plotUnit.axisX.conversionParameters.pixelPerUnit);
							//}

							markerColor = intToHexColorString(id);

							if (isCanvasSupported) {
								markers.push({
									x: x, y: y, ctx: ghostCtx,
									type: markerProps.type,
									size: markerProps.size,
									color: markerColor,
									borderColor: markerColor,
									borderThickness: markerProps.borderThickness
								});
							}
						}
					}

					if (dataPoint.indexLabel || dataSeries.indexLabel || dataPoint.indexLabelFormatter || dataSeries.indexLabelFormatter) {

						this._indexLabels.push({
							chartType: "stackedArea100",
							dataPoint: dataPoint,
							dataSeries: dataSeries,
							point: {
								x: x, y: y
							},
							direction: dataPoints[i].y >= 0 ? 1 : -1,
							color: color
						});

					}
				}

				if (dataSeries.lineThickness > 0)
					ctx.stroke();

				while (currentBaseValues.length > 0) {
					var point = currentBaseValues.pop();
					ctx.lineTo(point.x, point.y);

					if (isCanvasSupported)
						ghostCtx.lineTo(point.x, point.y);
				}

				ctx.closePath();

				ctx.globalAlpha = dataSeries.fillOpacity;
				ctx.fill();
				ctx.globalAlpha = 1;

				ctx.beginPath();
				ctx.moveTo(x, y);

				if (isCanvasSupported) {
					ghostCtx.closePath();
					ghostCtx.fill();
					ghostCtx.beginPath();
					ghostCtx.moveTo(x, y);
				}
			}

			delete (dataSeries.dataPointIndexes);
		}

		RenderHelper.drawMarkers(markers);

		ctx.restore();

		if (isCanvasSupported)
			ghostCtx.restore();

		//source and dest would be same when animation is not enabled
		var animationInfo = {
			source: ctx, dest: this.plotArea.ctx, animationCallback: AnimationHelper.xClipAnimation, easingFunction: AnimationHelper.easing.linear, animationBase: 0
		};
		return animationInfo;
	}

	Chart.prototype.renderBubble = function (plotUnit) {

		var ctx = plotUnit.targetCanvasCtx || this.plotArea.ctx;

		var totalDataSeries = plotUnit.dataSeriesIndexes.length;

		if (totalDataSeries <= 0)
			return;

		var color = null;

		var plotArea = this.plotArea;

		var i = 0, x, y;
		var dataPointX; //Used so that when dataPoint.x is a DateTime value, it doesn't get converted to number from dataTime everytime it is used.

		var yZeroToPixel = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (0 - plotUnit.axisY.conversionParameters.minimum)) << 0;

		var maxBarWidth = this.dataPointMaxWidth ? this.dataPointMaxWidth : this.width * .15 << 0;
		var xMinDiff = plotUnit.axisX.dataInfo.minDiff;
		var barWidth = (((plotArea.width / Math.abs(plotUnit.axisX.viewportMaximum - plotUnit.axisX.viewportMinimum)) * Math.abs(xMinDiff)) / totalDataSeries * .9) << 0;


		ctx.save();

		if (isCanvasSupported)
			this._eventManager.ghostCtx.save();

		ctx.beginPath();
		ctx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
		ctx.clip();

		if (isCanvasSupported) {
			this._eventManager.ghostCtx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
			this._eventManager.ghostCtx.clip();
		}

		var maxZ = -Infinity;
		var minZ = Infinity;

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];
			var dataSeries = this.data[dataSeriesIndex];
			var dataPoints = dataSeries.dataPoints;
			var z = 0;

			for (var i = 0; i < dataPoints.length; i++) {

				dataPointX = dataPoints[i].getTime ? dataPointX = dataPoints[i].x.getTime() : dataPointX = dataPoints[i].x;

				if (dataPointX < plotUnit.axisX.dataInfo.viewPortMin || dataPointX > plotUnit.axisX.dataInfo.viewPortMax) {
					continue;
				}

				if (typeof (dataPoints[i].z) !== "undefined") {

					z = dataPoints[i].z;

					if (z > maxZ)
						maxZ = z;

					if (z < minZ)
						minZ = z;
				}
			}
		}

		var minArea = Math.PI * 5 * 5;
		var maxArea = Math.max(Math.pow(Math.min(plotArea.height, plotArea.width) * .25 / 2, 2) * Math.PI, minArea);

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];

			var dataSeries = this.data[dataSeriesIndex];
			var dataPoints = dataSeries.dataPoints;
			var isFirstDataPointInPlotArea = true;

			if (dataPoints.length == 1)
				barWidth = maxBarWidth;

			if (barWidth < 1)
				barWidth = 1;
			else if (barWidth > maxBarWidth)
				barWidth = maxBarWidth;

			if (dataPoints.length > 0) {
				//var xy = this.getPixelCoordinatesOnPlotArea(dataPoints[0].x, dataPoints[0].y);
				//var bevelEnabled = (barWidth > 5) ? false : false;

				ctx.strokeStyle = "#4572A7 ";



				for (var i = 0; i < dataPoints.length; i++) {

					dataPointX = dataPoints[i].getTime ? dataPointX = dataPoints[i].x.getTime() : dataPointX = dataPoints[i].x;

					if (dataPointX < plotUnit.axisX.dataInfo.viewPortMin || dataPointX > plotUnit.axisX.dataInfo.viewPortMax) {
						continue;
					}

					if (typeof (dataPoints[i].y) !== "number")
						continue;

					x = (plotUnit.axisX.conversionParameters.reference + plotUnit.axisX.conversionParameters.pixelPerUnit * (dataPointX - plotUnit.axisX.conversionParameters.minimum) + .5) << 0;
					y = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;

					var z = dataPoints[i].z;

					var area = (maxZ === minZ) ? maxArea / 2 : minArea + (maxArea - minArea) / (maxZ - minZ) * (z - minZ);
					var radius = Math.max(Math.sqrt(area / Math.PI) << 0, 1);

					var markerSize = radius * 2;
					var markerProps = dataSeries.getMarkerProperties(i, ctx);
					markerProps.size = markerSize;


					ctx.globalAlpha = dataSeries.fillOpacity;
					RenderHelper.drawMarker(x, y, ctx, markerProps.type, markerProps.size, markerProps.color, markerProps.borderColor, markerProps.borderThickness);
					ctx.globalAlpha = 1;

					var id = dataSeries.dataPointIds[i];
					this._eventManager.objectMap[id] = {
						id: id, objectType: "dataPoint", dataSeriesIndex: dataSeriesIndex, dataPointIndex: i, x1: x, y1: y, size: markerSize
					};
					var markerColor = intToHexColorString(id);
					//RenderHelper.drawMarker(x, y, this._eventManager.ghostCtx, markerType, markerSize, markerColor, markerColor, dataSeries.markerBorderThickness);
					if (isCanvasSupported)
						RenderHelper.drawMarker(x, y, this._eventManager.ghostCtx, markerProps.type, markerProps.size, markerColor, markerColor, markerProps.borderThickness);


					if (dataPoints[i].indexLabel || dataSeries.indexLabel || dataPoints[i].indexLabelFormatter || dataSeries.indexLabelFormatter) {

						this._indexLabels.push({
							chartType: "bubble",
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							point: {
								x: x, y: y
							},
							direction: 1,
							bounds: {
								x1: x - markerProps.size / 2, y1: y - markerProps.size / 2, x2: x + markerProps.size / 2, y2: y + markerProps.size / 2
							},
							color: color
						});
					}
				}
			}
		}

		ctx.restore();

		if (isCanvasSupported)
			this._eventManager.ghostCtx.restore();

		//source and dest would be same when animation is not enabled
		var animationInfo = {
			source: ctx, dest: this.plotArea.ctx, animationCallback: AnimationHelper.fadeInAnimation, easingFunction: AnimationHelper.easing.easeInQuad, animationBase: 0
		};
		return animationInfo;
	}

	Chart.prototype.renderScatter = function (plotUnit) {
		var ctx = plotUnit.targetCanvasCtx || this.plotArea.ctx;
		var totalDataSeries = plotUnit.dataSeriesIndexes.length;

		if (totalDataSeries <= 0)
			return;

		var color = null;

		var plotArea = this.plotArea;

		var i = 0, x, y;
		var dataPointX; //Used so that when dataPoint.x is a DateTime value, it doesn't get converted to number from dataTime everytime it is used.

		var yZeroToPixel = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (0 - plotUnit.axisY.conversionParameters.minimum)) << 0;

		var maxBarWidth = this.dataPointMaxWidth ? this.dataPointMaxWidth : this.width * .15 << 0;
		var xMinDiff = plotUnit.axisX.dataInfo.minDiff;
		var barWidth = (((plotArea.width / Math.abs(plotUnit.axisX.viewportMaximum - plotUnit.axisX.viewportMinimum)) * Math.abs(xMinDiff)) / totalDataSeries * .9) << 0;


		ctx.save();
		if (isCanvasSupported)
			this._eventManager.ghostCtx.save();

		ctx.beginPath();
		ctx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
		ctx.clip();

		if (isCanvasSupported) {
			this._eventManager.ghostCtx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
			this._eventManager.ghostCtx.clip();
		}

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];

			var dataSeries = this.data[dataSeriesIndex];
			var dataPoints = dataSeries.dataPoints;
			var isFirstDataPointInPlotArea = true;

			if (dataPoints.length == 1)
				barWidth = maxBarWidth;

			if (barWidth < 1)
				barWidth = 1;
			else if (barWidth > maxBarWidth)
				barWidth = maxBarWidth;

			if (dataPoints.length > 0) {
				//var bevelEnabled = (barWidth > 5) ? false : false;

				ctx.strokeStyle = "#4572A7 ";

				var maxArea = Math.pow(Math.min(plotArea.height, plotArea.width) * .3 / 2, 2) * Math.PI;

				var prevDataPointX = 0;
				var prevDataPointY = 0;

				for (var i = 0; i < dataPoints.length; i++) {

					dataPointX = dataPoints[i].getTime ? dataPointX = dataPoints[i].x.getTime() : dataPointX = dataPoints[i].x;

					if (dataPointX < plotUnit.axisX.dataInfo.viewPortMin || dataPointX > plotUnit.axisX.dataInfo.viewPortMax) {
						continue;
					}

					if (typeof (dataPoints[i].y) !== "number")
						continue;

					x = (plotUnit.axisX.conversionParameters.reference + plotUnit.axisX.conversionParameters.pixelPerUnit * (dataPointX - plotUnit.axisX.conversionParameters.minimum) + .5) << 0;
					y = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;

					var markerProps = dataSeries.getMarkerProperties(i, x, y, ctx);

					ctx.globalAlpha = dataSeries.fillOpacity;
					RenderHelper.drawMarker(markerProps.x, markerProps.y, markerProps.ctx, markerProps.type, markerProps.size, markerProps.color, markerProps.borderColor, markerProps.borderThickness);
					ctx.globalAlpha = 1;


					//if (Math.abs(prevDataPointX - x) < markerProps.size / 2 && Math.abs(prevDataPointY - y) < markerProps.size / 2) {
					//    continue;
					//}

					//if (!dataSeries.maxWidthInX || markerProps.size > dataSeries.maxWidthInX) {
					//	dataSeries.maxWidthInX = markerProps.size / (plotUnit.axisX.conversionParameters.pixelPerUnit > 1 ? plotUnit.axisX.conversionParameters.pixelPerUnit - 1 : plotUnit.axisX.conversionParameters.pixelPerUnit);
					//}

					if ((Math.sqrt((prevDataPointX - x) * (prevDataPointX - x) + (prevDataPointY - y) * (prevDataPointY - y)) < Math.min(markerProps.size, 5))
						&& dataPoints.length > (Math.min(this.plotArea.width, this.plotArea.height))) {
						continue;
					}

					//Render ID on Ghost Canvas - for event handling
					var id = dataSeries.dataPointIds[i];
					this._eventManager.objectMap[id] = {
						id: id, objectType: "dataPoint", dataSeriesIndex: dataSeriesIndex, dataPointIndex: i, x1: x, y1: y
					};
					var markerColor = intToHexColorString(id);

					if (isCanvasSupported) {
						RenderHelper.drawMarker(
								markerProps.x, markerProps.y, this._eventManager.ghostCtx,
								markerProps.type,
								markerProps.size,
								markerColor,
								markerColor,
								markerProps.borderThickness
							);
					}
					//markers.push();

					if (dataPoints[i].indexLabel || dataSeries.indexLabel || dataPoints[i].indexLabelFormatter || dataSeries.indexLabelFormatter) {

						this._indexLabels.push({
							chartType: "scatter",
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							point: {
								x: x, y: y
							},
							direction: 1,
							bounds: {
								x1: x - markerProps.size / 2, y1: y - markerProps.size / 2, x2: x + markerProps.size / 2, y2: y + markerProps.size / 2
							},
							color: color
						});
					}

					prevDataPointX = x;
					prevDataPointY = y;
				}
			}
		}

		ctx.restore();

		if (isCanvasSupported)
			this._eventManager.ghostCtx.restore();

		//source and dest would be same when animation is not enabled
		var animationInfo = {
			source: ctx, dest: this.plotArea.ctx, animationCallback: AnimationHelper.fadeInAnimation, easingFunction: AnimationHelper.easing.easeInQuad, animationBase: 0
		};
		return animationInfo;
	}

	Chart.prototype.renderCandlestick = function (plotUnit) {
		var ctx = plotUnit.targetCanvasCtx || this.plotArea.ctx;
		var ghostCtx = this._eventManager.ghostCtx;

		var totalDataSeries = plotUnit.dataSeriesIndexes.length;
		if (totalDataSeries <= 0)
			return;

		var color = null;

		var plotArea = this.plotArea;

		var i = 0, x, y1, y2, y3, y4;
		var dataPointX; //Used so that when dataPoint.x is a DateTime value, it doesn't get converted to number from dataTime everytime it is used.

		var yZeroToPixel = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (0 - plotUnit.axisY.conversionParameters.minimum)) << 0;

		var maxBarWidth = this.dataPointMaxWidth ? this.dataPointMaxWidth : (this.width * .015);
		var xMinDiff = plotUnit.axisX.dataInfo.minDiff;
		var barWidth = (((plotArea.width / Math.abs(plotUnit.axisX.viewportMaximum - plotUnit.axisX.viewportMinimum)) * Math.abs(xMinDiff)) * .7) << 0;

		if (barWidth > maxBarWidth)
			barWidth = maxBarWidth;
		else if (xMinDiff === Infinity) {
			barWidth = maxBarWidth;
		} else if (barWidth < 1)
			barWidth = 1;

		ctx.save();
		if (isCanvasSupported)
			ghostCtx.save();

		ctx.beginPath();
		ctx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
		ctx.clip();

		if (isCanvasSupported) {
			ghostCtx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
			ghostCtx.clip();
		}
		//ctx.beginPath();

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];

			var dataSeries = this.data[dataSeriesIndex];
			var dataPoints = dataSeries.dataPoints;
			var isFirstDataPointInPlotArea = true;


			// Reducing pixelPerUnit by 1 just to overcome any problems due to rounding off of pixels.
			//dataSeries.maxWidthInX = barWidth / (plotUnit.axisX.conversionParameters.pixelPerUnit > 1 ? plotUnit.axisX.conversionParameters.pixelPerUnit - 1 : plotUnit.axisX.conversionParameters.pixelPerUnit);

			//var offsetX = barWidth * plotUnit.index << 0;


			if (dataPoints.length > 0) {
				//var xy = this.getPixelCoordinatesOnPlotArea(dataPoints[0].x, dataPoints[0].y);

				var bevelEnabled = (barWidth > 5) && dataSeries.bevelEnabled ? true : false;

				for (i = 0; i < dataPoints.length; i++) {

					dataPoints[i].getTime ? dataPointX = dataPoints[i].x.getTime() : dataPointX = dataPoints[i].x;

					if (dataPointX < plotUnit.axisX.dataInfo.viewPortMin || dataPointX > plotUnit.axisX.dataInfo.viewPortMax) {
						continue;
					}

					if (dataPoints[i].y === null || !dataPoints[i].y.length
						|| typeof (dataPoints[i].y[0]) !== "number" || typeof (dataPoints[i].y[1]) !== "number"
						|| typeof (dataPoints[i].y[2]) !== "number" || typeof (dataPoints[i].y[3]) !== "number")
						continue;

					x = (plotUnit.axisX.conversionParameters.reference + plotUnit.axisX.conversionParameters.pixelPerUnit * (dataPointX - plotUnit.axisX.conversionParameters.minimum) + .5) << 0;
					y1 = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y[0] - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;
					y2 = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y[1] - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;

					y3 = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y[2] - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;
					y4 = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y[3] - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;

					var x1 = (x - barWidth / 2) << 0;
					var x2 = (x1 + barWidth) << 0;


					color = dataPoints[i].color ? dataPoints[i].color : dataSeries._colorSet[0];


					//var borderThickness = Math.max(2, ((barWidth * .1) / 2 << 0) * 2); // Set only even numbers for border
					var borderThickness = Math.round(Math.max(1, (barWidth * .15)));
					//borderThickness = (borderThickness / 2 << 0) * 2;
					//borderThickness = 2;
					var offset = borderThickness % 2 === 0 ? 0 : .5;


					var id = dataSeries.dataPointIds[i];
					this._eventManager.objectMap[id] = {
						id: id, objectType: "dataPoint", dataSeriesIndex: dataSeriesIndex, dataPointIndex: i, x1: x1, y1: y1, x2: x2, y2: y2,
						x3: x, y3: y3, x4: x, y4: y4, borderThickness: borderThickness, color: color
					};

					ctx.strokeStyle = color;
					ctx.beginPath();
					ctx.lineWidth = borderThickness;
					ghostCtx.lineWidth = Math.max(borderThickness, 4);

					if (dataSeries.type === "candlestick") {

						ctx.moveTo(x - offset, y2);
						ctx.lineTo(x - offset, Math.min(y1, y4));
						ctx.stroke();
						ctx.moveTo(x - offset, Math.max(y1, y4));
						ctx.lineTo(x - offset, y3);
						ctx.stroke();

						drawRect(ctx, x1, Math.min(y1, y4), x2, Math.max(y1, y4), dataPoints[i].y[0] <= dataPoints[i].y[3] ? dataSeries.risingColor : color, borderThickness, color, bevelEnabled, bevelEnabled, false, false, dataSeries.fillOpacity);


						if (isCanvasSupported) {
							color = intToHexColorString(id);
							ghostCtx.strokeStyle = color;

							ghostCtx.moveTo(x - offset, y2);
							ghostCtx.lineTo(x - offset, Math.min(y1, y4));
							ghostCtx.stroke();
							ghostCtx.moveTo(x - offset, Math.max(y1, y4));
							ghostCtx.lineTo(x - offset, y3);
							ghostCtx.stroke();
							drawRect(ghostCtx, x1, Math.min(y1, y4), x2, Math.max(y1, y4), color, 0, null, false, false, false, false);
						}
					}
					else if (dataSeries.type === "ohlc") {

						ctx.moveTo(x - offset, y2);
						ctx.lineTo(x - offset, y3);
						ctx.stroke();

						ctx.beginPath();
						ctx.moveTo(x, y1);
						ctx.lineTo(x1, y1);
						ctx.stroke();

						ctx.beginPath();
						ctx.moveTo(x, y4);
						ctx.lineTo(x2, y4);
						ctx.stroke();

						if (isCanvasSupported) {

							color = intToHexColorString(id);
							ghostCtx.strokeStyle = color;

							ghostCtx.moveTo(x - offset, y2);
							ghostCtx.lineTo(x - offset, y3);
							ghostCtx.stroke();

							ghostCtx.beginPath();
							ghostCtx.moveTo(x, y1);
							ghostCtx.lineTo(x1, y1);
							ghostCtx.stroke();

							ghostCtx.beginPath();
							ghostCtx.moveTo(x, y4);
							ghostCtx.lineTo(x2, y4);
							ghostCtx.stroke();
						}
					}

					if (dataPoints[i].indexLabel || dataSeries.indexLabel || dataPoints[i].indexLabelFormatter || dataSeries.indexLabelFormatter) {

						this._indexLabels.push({
							chartType: dataSeries.type,
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							point: {
								x: x1 + (x2 - x1) / 2, y: y2
							},
							direction: 1,
							bounds: {
								x1: x1, y1: Math.min(y2, y3), x2: x2, y2: Math.max(y2, y3)
							},
							color: color
						});

					}
				}
			}
		}

		ctx.restore();

		if (isCanvasSupported)
			ghostCtx.restore();

		//source and dest would be same when animation is not enabled
		var animationInfo = {
			source: ctx, dest: this.plotArea.ctx, animationCallback: AnimationHelper.fadeInAnimation, easingFunction: AnimationHelper.easing.easeInQuad, animationBase: 0
		};
		return animationInfo;
	}

	Chart.prototype.renderRangeColumn = function (plotUnit) {
		var ctx = plotUnit.targetCanvasCtx || this.plotArea.ctx;
		var totalDataSeries = plotUnit.dataSeriesIndexes.length;

		if (totalDataSeries <= 0)
			return;

		var color = null;

		var plotArea = this.plotArea;

		var i = 0, x, y1, y2;
		var dataPointX; //Used so that when dataPoint.x is a DateTime value, it doesn't get converted to number from dataTime everytime it is used.

		var yZeroToPixel = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (0 - plotUnit.axisY.conversionParameters.minimum)) << 0;

		var maxBarWidth = this.dataPointMaxWidth ? this.dataPointMaxWidth : (this.width * .03);
		//var maxBarWidth = (this.width * .015);
		var xMinDiff = plotUnit.axisX.dataInfo.minDiff;
		//var barWidth = (((plotArea.width / Math.abs(plotUnit.axisX.viewportMaximum - plotUnit.axisX.viewportMinimum)) * Math.abs(xMinDiff)) * .9) << 0;
		var barWidth = (((plotArea.width / Math.abs(plotUnit.axisX.viewportMaximum - plotUnit.axisX.viewportMinimum)) * Math.abs(xMinDiff)) / plotUnit.plotType.totalDataSeries * .9) << 0;

		if (barWidth > maxBarWidth)
			barWidth = maxBarWidth;
		else if (xMinDiff === Infinity) {
			barWidth = maxBarWidth / plotUnit.plotType.totalDataSeries * .9;
		} else if (barWidth < 1)
			barWidth = 1;

		ctx.save();
		if (isCanvasSupported)
			this._eventManager.ghostCtx.save();

		ctx.beginPath();
		ctx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
		ctx.clip();

		if (isCanvasSupported) {
			this._eventManager.ghostCtx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
			this._eventManager.ghostCtx.clip();
		}
		//ctx.beginPath();

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];

			var dataSeries = this.data[dataSeriesIndex];
			var dataPoints = dataSeries.dataPoints;
			var isFirstDataPointInPlotArea = true;


			// Reducing pixelPerUnit by 1 just to overcome any problems due to rounding off of pixels.
			//dataSeries.maxWidthInX = barWidth / (plotUnit.axisX.conversionParameters.pixelPerUnit > 1 ? plotUnit.axisX.conversionParameters.pixelPerUnit - 1 : plotUnit.axisX.conversionParameters.pixelPerUnit);

			//var offsetX = barWidth * plotUnit.index << 0;


			if (dataPoints.length > 0) {
				//var xy = this.getPixelCoordinatesOnPlotArea(dataPoints[0].x, dataPoints[0].y);

				var bevelEnabled = (barWidth > 5) && dataSeries.bevelEnabled ? true : false;

				for (i = 0; i < dataPoints.length; i++) {

					dataPoints[i].getTime ? dataPointX = dataPoints[i].x.getTime() : dataPointX = dataPoints[i].x;

					if (dataPointX < plotUnit.axisX.dataInfo.viewPortMin || dataPointX > plotUnit.axisX.dataInfo.viewPortMax) {
						continue;
					}

					if (dataPoints[i].y === null || !dataPoints[i].y.length
						|| typeof (dataPoints[i].y[0]) !== "number" || typeof (dataPoints[i].y[1]) !== "number")
						continue;

					x = (plotUnit.axisX.conversionParameters.reference + plotUnit.axisX.conversionParameters.pixelPerUnit * (dataPointX - plotUnit.axisX.conversionParameters.minimum) + .5) << 0;
					y1 = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y[0] - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;
					y2 = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y[1] - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;

					//var x1 = x - barWidth / 2 << 0;
					var x1 = x - (plotUnit.plotType.totalDataSeries * barWidth / 2) + ((plotUnit.previousDataSeriesCount + j) * barWidth) << 0;
					var x2 = x1 + barWidth << 0;
					var y1;
					var y2;


					color = dataPoints[i].color ? dataPoints[i].color : dataSeries._colorSet[i % dataSeries._colorSet.length];

					if (y1 > y2) {
						var temp = y1;
						y1 = y2;
						y2 = temp;
					}

					var id = dataSeries.dataPointIds[i];
					this._eventManager.objectMap[id] = {
						id: id, objectType: "dataPoint", dataSeriesIndex: dataSeriesIndex, dataPointIndex: i, x1: x1, y1: y1, x2: x2, y2: y2
					};

					//var borderThickness = Math.max(1, (barWidth * .1 << 0));
					var borderThickness = 0;

					drawRect(ctx, x1, y1, x2, y2, color, borderThickness, color, bevelEnabled, bevelEnabled, false, false, dataSeries.fillOpacity);
					color = intToHexColorString(id);

					if (isCanvasSupported)
						drawRect(this._eventManager.ghostCtx, x1, y1, x2, y2, color, 0, null, false, false, false, false);


					if (dataPoints[i].indexLabel || dataSeries.indexLabel || dataPoints[i].indexLabelFormatter || dataSeries.indexLabelFormatter) {

						this._indexLabels.push({
							chartType: "rangeColumn",
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							indexKeyword: 0,
							point: {
								x: x1 + (x2 - x1) / 2, y: dataPoints[i].y[1] >= dataPoints[i].y[0] ? y2 : y1
							},
							direction: dataPoints[i].y[1] >= dataPoints[i].y[0] ? -1 : 1,
							bounds: {
								x1: x1, y1: Math.min(y1, y2), x2: x2, y2: Math.max(y1, y2)
							},
							color: color
						});

						this._indexLabels.push({
							chartType: "rangeColumn",
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							indexKeyword: 1,
							point: {
								x: x1 + (x2 - x1) / 2, y: dataPoints[i].y[1] >= dataPoints[i].y[0] ? y1 : y2
							},
							direction: dataPoints[i].y[1] >= dataPoints[i].y[0] ? 1 : -1,
							bounds: {
								x1: x1, y1: Math.min(y1, y2), x2: x2, y2: Math.max(y1, y2)
							},
							color: color
						});

					}
				}
			}
		}

		ctx.restore();

		if (isCanvasSupported)
			this._eventManager.ghostCtx.restore();


		//source and dest would be same when animation is not enabled
		var animationInfo = {
			source: ctx, dest: this.plotArea.ctx, animationCallback: AnimationHelper.fadeInAnimation, easingFunction: AnimationHelper.easing.easeInQuad, animationBase: 0
		};
		return animationInfo;
	}

	Chart.prototype.renderRangeBar = function (plotUnit) {
		var ctx = plotUnit.targetCanvasCtx || this.plotArea.ctx;
		var totalDataSeries = plotUnit.dataSeriesIndexes.length;

		if (totalDataSeries <= 0)
			return;

		var color = null;

		var plotArea = this.plotArea;

		var i = 0, x1, x2, y;
		var dataPointX; //Used so that when dataPoint.x is a DateTime value, it doesn't get converted to number from dataTime everytime it is used.

		//In case of Bar Chart, yZeroToPixel is x co-ordinate!
		var yZeroToPixel = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (0 - plotUnit.axisY.conversionParameters.minimum)) << 0;

		var maxBarWidth = this.dataPointMaxWidth ? this.dataPointMaxWidth : Math.min((this.height * .15), this.plotArea.height / plotUnit.plotType.totalDataSeries * .9) << 0;
		var xMinDiff = plotUnit.axisX.dataInfo.minDiff;
		//var barWidth = (((plotArea.height / Math.abs(plotUnit.axisX.viewportMaximum - plotUnit.axisX.viewportMinimum)) * Math.abs(xMinDiff)) / totalDataSeries * .9) << 0;

		var barWidth = (((plotArea.height / Math.abs(plotUnit.axisX.viewportMaximum - plotUnit.axisX.viewportMinimum)) * Math.abs(xMinDiff)) / plotUnit.plotType.totalDataSeries * .9) << 0;

		if (barWidth > maxBarWidth)
			barWidth = maxBarWidth;
		else if (xMinDiff === Infinity) {
			barWidth = maxBarWidth / plotUnit.plotType.totalDataSeries * .9;
		} else if (barWidth < 1)
			barWidth = 1;

		ctx.save();

		if (isCanvasSupported)
			this._eventManager.ghostCtx.save();

		ctx.beginPath();
		ctx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
		ctx.clip();

		if (isCanvasSupported) {
			this._eventManager.ghostCtx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
			this._eventManager.ghostCtx.clip();
		}

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];

			var dataSeries = this.data[dataSeriesIndex];
			var dataPoints = dataSeries.dataPoints;
			var isFirstDataPointInPlotArea = true;


			//dataSeries.maxWidthInX = barWidth / (plotUnit.axisX.conversionParameters.pixelPerUnit > 1 ? plotUnit.axisX.conversionParameters.pixelPerUnit - 1 : plotUnit.axisX.conversionParameters.pixelPerUnit);


			if (dataPoints.length > 0) {
				//var xy = this.getPixelCoordinatesOnPlotArea(dataPoints[0].x, dataPoints[0].y);

				var bevelEnabled = (barWidth > 5) && dataSeries.bevelEnabled ? true : false;

				ctx.strokeStyle = "#4572A7 ";

				for (i = 0; i < dataPoints.length; i++) {

					dataPoints[i].getTime ? dataPointX = dataPoints[i].x.getTime() : dataPointX = dataPoints[i].x;

					if (dataPointX < plotUnit.axisX.dataInfo.viewPortMin || dataPointX > plotUnit.axisX.dataInfo.viewPortMax) {
						continue;
					}

					if (dataPoints[i].y === null || !dataPoints[i].y.length
						|| typeof (dataPoints[i].y[0]) !== "number" || typeof (dataPoints[i].y[1]) !== "number")
						continue;

					//x and y are pixel co-ordinates of point and should not be confused with X and Y values
					x1 = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y[0] - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;
					x2 = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y[1] - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;

					y = (plotUnit.axisX.conversionParameters.reference + plotUnit.axisX.conversionParameters.pixelPerUnit * (dataPointX - plotUnit.axisX.conversionParameters.minimum) + .5) << 0;


					var y1 = (y - (plotUnit.plotType.totalDataSeries * barWidth / 2) + ((plotUnit.previousDataSeriesCount + j) * barWidth)) << 0;
					var y2 = y1 + barWidth << 0;

					if (x1 > x2) {
						var temp = x1;
						x1 = x2;
						x2 = temp;
					}

					//drawRect(ctx, x1, y1, plotArea.x2, y2, "#EEEEEE", 0, null, false, false, false, false);
					//drawRect(ctx, x1, y1, plotArea.x2, y2, "#BDCED3", 0, null, false, false, false, false);

					color = dataPoints[i].color ? dataPoints[i].color : dataSeries._colorSet[i % dataSeries._colorSet.length];
					//color = "#1B4962";
					drawRect(ctx, x1, y1, x2, y2, color, 0, null, bevelEnabled, false, false, false, dataSeries.fillOpacity);


					var id = dataSeries.dataPointIds[i];
					this._eventManager.objectMap[id] = {
						id: id, objectType: "dataPoint", dataSeriesIndex: dataSeriesIndex, dataPointIndex: i, x1: x1, y1: y1, x2: x2, y2: y2
					};
					color = intToHexColorString(id);

					if (isCanvasSupported)
						drawRect(this._eventManager.ghostCtx, x1, y1, x2, y2, color, 0, null, false, false, false, false);


					if (dataPoints[i].indexLabel || dataSeries.indexLabel || dataPoints[i].indexLabelFormatter || dataSeries.indexLabelFormatter) {

						this._indexLabels.push({
							chartType: "rangeBar",
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							indexKeyword: 0,
							point: {
								x: dataPoints[i].y[1] >= dataPoints[i].y[0] ? x1 : x2, y: y1 + (y2 - y1) / 2
							},
							direction: dataPoints[i].y[1] >= dataPoints[i].y[0] ? -1 : 1,
							bounds: {
								x1: Math.min(x1, x2), y1: y1, x2: Math.max(x1, x2), y2: y2
							},
							color: color
						});

						this._indexLabels.push({
							chartType: "rangeBar",
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							indexKeyword: 1,
							point: {
								x: dataPoints[i].y[1] >= dataPoints[i].y[0] ? x2 : x1, y: y1 + (y2 - y1) / 2
							},
							direction: dataPoints[i].y[1] >= dataPoints[i].y[0] ? 1 : -1,
							bounds: {
								x1: Math.min(x1, x2), y1: y1, x2: Math.max(x1, x2), y2: y2
							},
							color: color
						});
					}
				}
			}
		}

		ctx.restore();

		if (isCanvasSupported)
			this._eventManager.ghostCtx.restore();

		//source and dest would be same when animation is not enabled
		var animationInfo = {
			source: ctx, dest: this.plotArea.ctx, animationCallback: AnimationHelper.fadeInAnimation, easingFunction: AnimationHelper.easing.easeInQuad, animationBase: 0
		};
		return animationInfo;
	}

	Chart.prototype.renderRangeArea = function (plotUnit) {
		var ctx = plotUnit.targetCanvasCtx || this.plotArea.ctx;
		var totalDataSeries = plotUnit.dataSeriesIndexes.length;

		if (totalDataSeries <= 0)
			return;

		var ghostCtx = this._eventManager.ghostCtx;

		var axisXProps = plotUnit.axisX.lineCoordinates;
		var axisYProps = plotUnit.axisY.lineCoordinates;
		var markers = [];

		var plotArea = this.plotArea;
		ctx.save();

		if (isCanvasSupported)
			ghostCtx.save();

		ctx.beginPath();
		ctx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
		ctx.clip();

		if (isCanvasSupported) {
			ghostCtx.beginPath();
			ghostCtx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
			ghostCtx.clip();
		}

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var closingPath = [];

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];

			var dataSeries = this.data[dataSeriesIndex];

			var dataPoints = dataSeries.dataPoints;

			var seriesId = dataSeries.id;
			this._eventManager.objectMap[seriesId] = {
				objectType: "dataSeries", dataSeriesIndex: dataSeriesIndex
			};

			var hexColor = intToHexColorString(seriesId);
			ghostCtx.fillStyle = hexColor;
			//ghostCtx.lineWidth = dataSeries.lineThickness;
			//ghostCtx.lineWidth = 20;

			markers = [];

			var isFirstDataPointInPlotArea = true;
			var i = 0, x, y1, y2;
			var dataPointX; //Used so that when dataPoint.x is a DateTime value, it doesn't get converted to number back and forth.

			var yZeroToPixel = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (0 - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;
			var baseY;

			var startPoint = null;

			if (dataPoints.length > 0) {
				//ctx.strokeStyle = "#4572A7 ";
				var color = dataSeries._colorSet[i % dataSeries._colorSet.length];
				//ctx.strokeStyle = "red";
				ctx.fillStyle = color;
				ctx.strokeStyle = color;
				ctx.lineWidth = dataSeries.lineThickness;

				if (ctx.setLineDash) {
					ctx.setLineDash(getLineDashArray(dataSeries.lineDashType, dataSeries.lineThickness));
				}

				var prevDataNull = true;
				for (; i < dataPoints.length; i++) {

					dataPointX = dataPoints[i].x.getTime ? dataPoints[i].x.getTime() : dataPoints[i].x;

					if (dataPointX < plotUnit.axisX.dataInfo.viewPortMin || dataPointX > plotUnit.axisX.dataInfo.viewPortMax) {
						continue;
					}

					if (dataPoints[i].y === null || !dataPoints[i].y.length
						|| typeof (dataPoints[i].y[0]) !== "number" || typeof (dataPoints[i].y[1]) !== "number") {

						closeArea();

						prevDataNull = true;
						continue;
					}

					x = (plotUnit.axisX.conversionParameters.reference + plotUnit.axisX.conversionParameters.pixelPerUnit * (dataPointX - plotUnit.axisX.conversionParameters.minimum) + .5) << 0;

					y1 = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y[0] - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;
					y2 = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y[1] - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;

					if (isFirstDataPointInPlotArea || prevDataNull) {
						ctx.beginPath();
						ctx.moveTo(x, y1);
						startPoint = {
							x: x, y: y1
						};
						closingPath = [];
						closingPath.push({ x: x, y: y2 });

						if (isCanvasSupported) {
							ghostCtx.beginPath();
							ghostCtx.moveTo(x, y1);
						}

						isFirstDataPointInPlotArea = false;
						prevDataNull = false;
					}
					else {

						ctx.lineTo(x, y1);
						closingPath.push({ x: x, y: y2 });

						if (isCanvasSupported)
							ghostCtx.lineTo(x, y1);

						if (i % 250 == 0) {
							closeArea();
						}
					}


					var id = dataSeries.dataPointIds[i];
					this._eventManager.objectMap[id] = {
						id: id, objectType: "dataPoint", dataSeriesIndex: dataSeriesIndex, dataPointIndex: i, x1: x, y1: y1, y2: y2
					};

					//Render Marker
					if (dataPoints[i].markerSize !== 0) {
						if (dataPoints[i].markerSize > 0 || dataSeries.markerSize > 0) {
							var markerProps = dataSeries.getMarkerProperties(i, x, y2, ctx);
							markers.push(markerProps);

							//if (!dataSeries.maxWidthInX || markerProps.size > dataSeries.maxWidthInX) {
							//	dataSeries.maxWidthInX = markerProps.size / (plotUnit.axisX.conversionParameters.pixelPerUnit > 1 ? plotUnit.axisX.conversionParameters.pixelPerUnit - 1 : plotUnit.axisX.conversionParameters.pixelPerUnit);
							//}

							var markerColor = intToHexColorString(id);

							if (isCanvasSupported) {
								markers.push({
									x: x, y: y2, ctx: ghostCtx,
									type: markerProps.type,
									size: markerProps.size,
									color: markerColor,
									borderColor: markerColor,
									borderThickness: markerProps.borderThickness
								});
							}

							markerProps = dataSeries.getMarkerProperties(i, x, y1, ctx);
							markers.push(markerProps);



							var markerColor = intToHexColorString(id);

							if (isCanvasSupported) {
								markers.push({
									x: x, y: y1, ctx: ghostCtx,
									type: markerProps.type,
									size: markerProps.size,
									color: markerColor,
									borderColor: markerColor,
									borderThickness: markerProps.borderThickness
								});
							}
						}
					}

					if (dataPoints[i].indexLabel || dataSeries.indexLabel || dataPoints[i].indexLabelFormatter || dataSeries.indexLabelFormatter) {

						this._indexLabels.push({
							chartType: "rangeArea",
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							indexKeyword: 0,
							point: {
								x: x, y: y1
							},
							direction: dataPoints[i].y[0] <= dataPoints[i].y[1] ? -1 : 1,
							color: color
						});

						this._indexLabels.push({
							chartType: "rangeArea",
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							indexKeyword: 1,
							point: {
								x: x, y: y2
							},
							direction: dataPoints[i].y[0] <= dataPoints[i].y[1] ? 1 : -1,
							color: color
						});

					}

					//alert("hi");
				}

				closeArea();

				//startPoint = { x: x, y: y };
				RenderHelper.drawMarkers(markers);
			}
		}

		ctx.restore();
		if (isCanvasSupported)
			this._eventManager.ghostCtx.restore();

		function closeArea() {

			if (!startPoint)
				return;

			var point = null;

			if (dataSeries.lineThickness > 0)
				ctx.stroke();

			for (var i = closingPath.length - 1; i >= 0; i--) {
				point = closingPath[i];
				ctx.lineTo(point.x, point.y);
				ghostCtx.lineTo(point.x, point.y);
			}



			ctx.closePath();
			//ctx.lineTo(startPoint.x, startPoint.y);

			ctx.globalAlpha = dataSeries.fillOpacity;
			ctx.fill();
			ctx.globalAlpha = 1;

			ghostCtx.fill();

			//if (isCanvasSupported) {
			//	ghostCtx.lineTo(x, baseY);
			//	ghostCtx.lineTo(startPoint.x, baseY);
			//	ghostCtx.closePath();
			//	ghostCtx.fill();
			//}

			if (dataSeries.lineThickness > 0) {
				ctx.beginPath();
				ctx.moveTo(point.x, point.y);
				for (var i = 0; i < closingPath.length; i++) {
					point = closingPath[i];
					ctx.lineTo(point.x, point.y);
				}

				ctx.stroke();
			}


			ctx.beginPath();
			ctx.moveTo(x, y1);
			ghostCtx.beginPath();
			ghostCtx.moveTo(x, y1);

			startPoint = {
				x: x, y: y1
			};
			closingPath = [];
			closingPath.push({ x: x, y: y2 });
		}

		//ctx.beginPath();
		//source and dest would be same when animation is not enabled
		var animationInfo = {
			source: ctx, dest: this.plotArea.ctx, animationCallback: AnimationHelper.xClipAnimation, easingFunction: AnimationHelper.easing.linear, animationBase: 0
		};
		return animationInfo;
	}


	Chart.prototype.renderRangeSplineArea = function (plotUnit) {
		var ctx = plotUnit.targetCanvasCtx || this.plotArea.ctx;
		var totalDataSeries = plotUnit.dataSeriesIndexes.length;

		if (totalDataSeries <= 0)
			return;

		var ghostCtx = this._eventManager.ghostCtx;

		var axisXProps = plotUnit.axisX.lineCoordinates;
		var axisYProps = plotUnit.axisY.lineCoordinates;
		var markers = [];

		var plotArea = this.plotArea;
		ctx.save();

		if (isCanvasSupported)
			ghostCtx.save();

		ctx.beginPath();
		ctx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
		ctx.clip();

		if (isCanvasSupported) {
			ghostCtx.beginPath();
			ghostCtx.rect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
			ghostCtx.clip();
		}

		for (var j = 0; j < plotUnit.dataSeriesIndexes.length; j++) {

			var dataSeriesIndex = plotUnit.dataSeriesIndexes[j];

			var dataSeries = this.data[dataSeriesIndex];

			var dataPoints = dataSeries.dataPoints;

			var seriesId = dataSeries.id;
			this._eventManager.objectMap[seriesId] = {
				objectType: "dataSeries", dataSeriesIndex: dataSeriesIndex
			};

			var hexColor = intToHexColorString(seriesId);
			ghostCtx.fillStyle = hexColor;
			//ghostCtx.lineWidth = dataSeries.lineThickness;
			//ghostCtx.lineWidth = 20;

			markers = [];

			var isFirstDataPointInPlotArea = true;
			var i = 0, x, y1, y2;
			var dataPointX; //Used so that when dataPoint.x is a DateTime value, it doesn't get converted to number back and forth.

			var yZeroToPixel = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (0 - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;
			var baseY;

			var startPoint = null;

			var pixelsY1 = [];
			var pixelsY2 = [];

			if (dataPoints.length > 0) {
				//ctx.strokeStyle = "#4572A7 ";
				color = dataSeries._colorSet[i % dataSeries._colorSet.length];
				//ctx.strokeStyle = "red";
				ctx.fillStyle = color;
				ctx.strokeStyle = color;
				ctx.lineWidth = dataSeries.lineThickness;

				if (ctx.setLineDash) {
					ctx.setLineDash(getLineDashArray(dataSeries.lineDashType, dataSeries.lineThickness));
				}

				for (; i < dataPoints.length; i++) {

					dataPointX = dataPoints[i].x.getTime ? dataPoints[i].x.getTime() : dataPoints[i].x;

					if (dataPointX < plotUnit.axisX.dataInfo.viewPortMin || dataPointX > plotUnit.axisX.dataInfo.viewPortMax) {
						continue;
					}

					if (dataPoints[i].y === null || !dataPoints[i].y.length || typeof (dataPoints[i].y[0]) !== "number" || typeof (dataPoints[i].y[1]) !== "number") {
						if (i > 0) {
							renderBezierArea();
							pixelsY1 = [];
							pixelsY2 = [];
						}
						continue;
					}

					x = (plotUnit.axisX.conversionParameters.reference + plotUnit.axisX.conversionParameters.pixelPerUnit * (dataPointX - plotUnit.axisX.conversionParameters.minimum) + .5) << 0;
					y1 = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y[0] - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;
					y2 = (plotUnit.axisY.conversionParameters.reference + plotUnit.axisY.conversionParameters.pixelPerUnit * (dataPoints[i].y[1] - plotUnit.axisY.conversionParameters.minimum) + .5) << 0;


					var id = dataSeries.dataPointIds[i];
					this._eventManager.objectMap[id] = {
						id: id, objectType: "dataPoint", dataSeriesIndex: dataSeriesIndex, dataPointIndex: i, x1: x, y1: y1, y2: y2
					};

					pixelsY1[pixelsY1.length] = {
						x: x, y: y1
					};
					pixelsY2[pixelsY2.length] = {
						x: x, y: y2
					};

					//Render Marker
					if (dataPoints[i].markerSize !== 0) {
						if (dataPoints[i].markerSize > 0 || dataSeries.markerSize > 0) {
							var markerProps = dataSeries.getMarkerProperties(i, x, y1, ctx);
							markers.push(markerProps);

							//if (!dataSeries.maxWidthInX || markerProps.size > dataSeries.maxWidthInX) {
							//	dataSeries.maxWidthInX = markerProps.size / (plotUnit.axisX.conversionParameters.pixelPerUnit > 1 ? plotUnit.axisX.conversionParameters.pixelPerUnit - 1 : plotUnit.axisX.conversionParameters.pixelPerUnit);
							//}

							var markerColor = intToHexColorString(id);

							if (isCanvasSupported) {
								markers.push({
									x: x, y: y1, ctx: ghostCtx,
									type: markerProps.type,
									size: markerProps.size,
									color: markerColor,
									borderColor: markerColor,
									borderThickness: markerProps.borderThickness
								});
							}

							var markerProps = dataSeries.getMarkerProperties(i, x, y2, ctx);
							markers.push(markerProps);

							//if (!dataSeries.maxWidthInX || markerProps.size > dataSeries.maxWidthInX) {
							//	dataSeries.maxWidthInX = markerProps.size / (plotUnit.axisX.conversionParameters.pixelPerUnit > 1 ? plotUnit.axisX.conversionParameters.pixelPerUnit - 1 : plotUnit.axisX.conversionParameters.pixelPerUnit);
							//}

							var markerColor = intToHexColorString(id);

							if (isCanvasSupported) {
								markers.push({
									x: x, y: y2, ctx: ghostCtx,
									type: markerProps.type,
									size: markerProps.size,
									color: markerColor,
									borderColor: markerColor,
									borderThickness: markerProps.borderThickness
								});
							}
						}
					}


					//Render Index Labels
					if (dataPoints[i].indexLabel || dataSeries.indexLabel || dataPoints[i].indexLabelFormatter || dataSeries.indexLabelFormatter) {

						this._indexLabels.push({
							chartType: "splineArea",
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							indexKeyword: 0,
							point: {
								x: x, y: y1
							},
							direction: dataPoints[i].y[0] <= dataPoints[i].y[1] ? -1 : 1,
							color: color
						});

						this._indexLabels.push({
							chartType: "splineArea",
							dataPoint: dataPoints[i],
							dataSeries: dataSeries,
							indexKeyword: 1,
							point: {
								x: x, y: y2
							},
							direction: dataPoints[i].y[0] <= dataPoints[i].y[1] ? 1 : -1,
							color: color
						});

					}
				}

				renderBezierArea();

				RenderHelper.drawMarkers(markers);
			}
		}

		ctx.restore();

		if (isCanvasSupported)
			this._eventManager.ghostCtx.restore();

		function renderBezierArea() {
			var bp = getBezierPoints(pixelsY1, 2);

			if (bp.length > 0) {
				ctx.beginPath();
				ctx.moveTo(bp[0].x, bp[0].y);

				if (isCanvasSupported) {
					ghostCtx.beginPath();
					ghostCtx.moveTo(bp[0].x, bp[0].y);
				}


				for (var i = 0; i < bp.length - 3; i += 3) {

					ctx.bezierCurveTo(bp[i + 1].x, bp[i + 1].y, bp[i + 2].x, bp[i + 2].y, bp[i + 3].x, bp[i + 3].y);

					if (isCanvasSupported)
						ghostCtx.bezierCurveTo(bp[i + 1].x, bp[i + 1].y, bp[i + 2].x, bp[i + 2].y, bp[i + 3].x, bp[i + 3].y);
				}

				if (dataSeries.lineThickness > 0)
					ctx.stroke();

				bp = getBezierPoints(pixelsY2, 2);

				ctx.lineTo(pixelsY2[pixelsY2.length - 1].x, pixelsY2[pixelsY2.length - 1].y);

				for (var i = bp.length - 1; i > 2; i -= 3) {

					ctx.bezierCurveTo(bp[i - 1].x, bp[i - 1].y, bp[i - 2].x, bp[i - 2].y, bp[i - 3].x, bp[i - 3].y);

					if (isCanvasSupported)
						ghostCtx.bezierCurveTo(bp[i - 1].x, bp[i - 1].y, bp[i - 2].x, bp[i - 2].y, bp[i - 3].x, bp[i - 3].y);
				}

				ctx.closePath();

				ctx.globalAlpha = dataSeries.fillOpacity;
				ctx.fill();
				ctx.globalAlpha = 1;


				if (dataSeries.lineThickness > 0) {
					ctx.beginPath();
					ctx.moveTo(pixelsY2[pixelsY2.length - 1].x, pixelsY2[pixelsY2.length - 1].y);

					for (var i = bp.length - 1; i > 2; i -= 3) {

						ctx.bezierCurveTo(bp[i - 1].x, bp[i - 1].y, bp[i - 2].x, bp[i - 2].y, bp[i - 3].x, bp[i - 3].y);

						if (isCanvasSupported)
							ghostCtx.bezierCurveTo(bp[i - 1].x, bp[i - 1].y, bp[i - 2].x, bp[i - 2].y, bp[i - 3].x, bp[i - 3].y);
					}
					ctx.stroke();
				}

				ctx.beginPath();


				if (isCanvasSupported) {
					ghostCtx.closePath();
					ghostCtx.fill();
				}
			}
		}

		//source and dest would be same when animation is not enabled
		var animationInfo = {
			source: ctx, dest: this.plotArea.ctx, animationCallback: AnimationHelper.xClipAnimation, easingFunction: AnimationHelper.easing.linear, animationBase: 0
		};
		return animationInfo;
	}
	//#region pieChart

	var drawSegment = function (ctx, center, radius, color, type, theta1, theta2, fillOpacity, percentInnerRadius) {

		if (typeof (fillOpacity) === "undefined")
			fillOpacity = 1;

		//IE8- FIX: In IE8- segment doesn't get draw if theta2 is equal to theta1 + 2*PI.
		if (!isCanvasSupported) {
			var theta2Mod = Number((theta2 % (2 * Math.PI)).toFixed(8));
			var theta1Mod = Number((theta1 % (2 * Math.PI)).toFixed(8));
			if (theta1Mod === theta2Mod)
				theta2 -= .0001;
		}

		ctx.save();
		ctx.globalAlpha = fillOpacity;

		if (type === "pie") {
			ctx.beginPath();
			ctx.moveTo(center.x, center.y);
			ctx.arc(center.x, center.y, radius, theta1, theta2, false);
			ctx.fillStyle = color;
			ctx.strokeStyle = "white";
			ctx.lineWidth = 2;
			//    ctx.shadowOffsetX = 2;
			//    ctx.shadowOffsetY = 1;
			//     ctx.shadowBlur = 2;
			//    ctx.shadowColor = '#BFBFBF';
			ctx.closePath();
			//ctx.stroke();
			ctx.fill();
		}
		else if (type === "doughnut") {
			ctx.beginPath();
			ctx.arc(center.x, center.y, radius, theta1, theta2, false);
			ctx.arc(center.x, center.y, percentInnerRadius * radius, theta2, theta1, true);
			ctx.closePath();
			ctx.fillStyle = color;
			ctx.strokeStyle = "white";
			ctx.lineWidth = 2;
			// shadow properties
			//     ctx.shadowOffsetX = 1;
			//    ctx.shadowOffsetY = 1;
			//     ctx.shadowBlur = 1;
			//    ctx.shadowColor = '#BFBFBF';  //grey shadow
			//ctx.stroke();
			ctx.fill();
		}

		ctx.globalAlpha = 1;

		ctx.restore();
	};

	function convertPercentToValue(input, referenceValue) {
		//input can be a number or string
		if (input === null || typeof (input) === "undefined")
			return referenceValue;

		var result = parseFloat(input.toString()) * (input.toString().indexOf("%") >= 0 ? referenceValue / 100 : 1);

		// limit to plot area
		if (!isNaN(result) && result <= referenceValue && result >= 0)
			return result;

		return referenceValue;
	}

	Chart.prototype.renderPie = function (plotUnit) {

		var _this = this;
		var totalDataSeries = plotUnit.dataSeriesIndexes.length;

		if (totalDataSeries <= 0)
			return;

		var dataSeriesIndex = plotUnit.dataSeriesIndexes[0];
		var dataSeries = this.data[dataSeriesIndex];
		var dataPoints = dataSeries.dataPoints;
		var indexLabelLineEdgeLength = 10;
		var explodeDuration = 500;

		var plotArea = this.plotArea;

		//var maxFrame = isCanvasSupported ? 300 : 4;
		//var totalRecursions = 0;
		var dataPointEOs = []; //dataPoint Extension Objects Behaves like a storage place for all additional data relating to dataPoints. Requred because actual dataPoints should not be modified.

		var minDistanceBetweenLabels = 2;
		var indexLabelRadiusToRadiusRatio = 1.3;
		var poleAnglularDistance = (20 / 180) * Math.PI; //Anglular Distance from 90 & 270 to be considered pole
		var precision = 6;

		var center = {
			x: (plotArea.x2 + plotArea.x1) / 2, y: (plotArea.y2 + plotArea.y1) / 2
		};

		var sum = 0;
		var isIndexLabelPresent = false;
		for (var j = 0; j < dataPoints.length; j++) {
			sum += Math.abs(dataPoints[j].y);

			if (!isIndexLabelPresent && typeof (dataPoints[j].indexLabel) !== "undefined" && dataPoints[j].indexLabel !== null && dataPoints[j].indexLabel.toString().length > 0)
				isIndexLabelPresent = true;

			if (!isIndexLabelPresent && typeof (dataPoints[j].label) !== "undefined" && dataPoints[j].label !== null && dataPoints[j].label.toString().length > 0)
				isIndexLabelPresent = true;
		}

		if (sum === 0)
			return;

		isIndexLabelPresent = isIndexLabelPresent || (typeof (dataSeries.indexLabel) !== "undefined" && dataSeries.indexLabel !== null && dataSeries.indexLabel.toString().length > 0);

		var outerRadius = dataSeries.indexLabelPlacement !== "inside" && isIndexLabelPresent ? (Math.min(plotArea.width, plotArea.height) * 0.75) / 2 : (Math.min(plotArea.width, plotArea.height) * .92) / 2;

		if (dataSeries.radius)
			outerRadius = convertPercentToValue(dataSeries.radius, outerRadius);


		var innerRadius = (typeof dataSeries.innerRadius !== 'undefined' && dataSeries.innerRadius !== null) ? convertPercentToValue(dataSeries.innerRadius, outerRadius) : 0.7 * outerRadius;

		var percentInnerRadius = Math.min(innerRadius / outerRadius, (outerRadius - 1) / outerRadius);

		function initLabels() {

			if (!dataSeries || !dataPoints)
				return;


			var noDPNearSouthPole = 0;
			var noDPNearNorthPole = 0;
			var firstDPCloseToSouth = 0;
			var firstDPCloseToNorth = 0;

			for (j = 0; j < dataPoints.length; j++) {

				var dataPoint = dataPoints[j];
				var id = dataSeries.dataPointIds[j];

				var dataPointEO = {
					id: id, objectType: "dataPoint", dataPointIndex: j, dataSeriesIndex: 0
				};
				dataPointEOs.push(dataPointEO);

				var percentAndTotal = {
					percent: null, total: null
				};
				var formatterParameter = null;

				percentAndTotal = _this.getPercentAndTotal(dataSeries, dataPoint);

				if (dataSeries.indexLabelFormatter || dataPoint.indexLabelFormatter)
					formatterParameter = {
						chart: _this._options, dataSeries: dataSeries, dataPoint: dataPoint, total: percentAndTotal.total, percent: percentAndTotal.percent
					};

				var indexLabelText = dataPoint.indexLabelFormatter ? dataPoint.indexLabelFormatter(formatterParameter)
                    : dataPoint.indexLabel ? _this.replaceKeywordsWithValue(dataPoint.indexLabel, dataPoint, dataSeries, j)
                    : dataSeries.indexLabelFormatter ? dataSeries.indexLabelFormatter(formatterParameter)
                    : dataSeries.indexLabel ? _this.replaceKeywordsWithValue(dataSeries.indexLabel, dataPoint, dataSeries, j) : dataPoint.label ? dataPoint.label : '';


				_this._eventManager.objectMap[id] = dataPointEO;

				//dataPointEO.indexLabelText = j.toString() + " " + "kingfisher: " + dataPoint.y.toString();;
				dataPointEO.center = {
					x: center.x, y: center.y
				};
				dataPointEO.y = dataPoint.y;
				dataPointEO.radius = outerRadius;
				dataPointEO.percentInnerRadius = percentInnerRadius;
				dataPointEO.indexLabelText = indexLabelText;
				dataPointEO.indexLabelPlacement = dataSeries.indexLabelPlacement;
				dataPointEO.indexLabelLineColor = dataPoint.indexLabelLineColor ? dataPoint.indexLabelLineColor : dataSeries.indexLabelLineColor ? dataSeries.indexLabelLineColor : dataPoint.color ? dataPoint.color : dataSeries._colorSet[j % dataSeries._colorSet.length];
				dataPointEO.indexLabelLineThickness = dataPoint.indexLabelLineThickness ? dataPoint.indexLabelLineThickness : dataSeries.indexLabelLineThickness;
				dataPointEO.indexLabelLineDashType = dataPoint.indexLabelLineDashType ? dataPoint.indexLabelLineDashType : dataSeries.indexLabelLineDashType;
				dataPointEO.indexLabelFontColor = dataPoint.indexLabelFontColor ? dataPoint.indexLabelFontColor : dataSeries.indexLabelFontColor;
				dataPointEO.indexLabelFontStyle = dataPoint.indexLabelFontStyle ? dataPoint.indexLabelFontStyle : dataSeries.indexLabelFontStyle;
				dataPointEO.indexLabelFontWeight = dataPoint.indexLabelFontWeight ? dataPoint.indexLabelFontWeight : dataSeries.indexLabelFontWeight;
				dataPointEO.indexLabelFontSize = dataPoint.indexLabelFontSize ? dataPoint.indexLabelFontSize : dataSeries.indexLabelFontSize;
				dataPointEO.indexLabelFontFamily = dataPoint.indexLabelFontFamily ? dataPoint.indexLabelFontFamily : dataSeries.indexLabelFontFamily;
				dataPointEO.indexLabelBackgroundColor = dataPoint.indexLabelBackgroundColor ? dataPoint.indexLabelBackgroundColor : dataSeries.indexLabelBackgroundColor ? dataSeries.indexLabelBackgroundColor : null;
				dataPointEO.indexLabelMaxWidth = dataPoint.indexLabelMaxWidth ? dataPoint.indexLabelMaxWidth : dataSeries.indexLabelMaxWidth ? dataSeries.indexLabelMaxWidth : plotArea.width * .33;
				dataPointEO.indexLabelWrap = typeof (dataPoint.indexLabelWrap) !== "undefined" ? dataPoint.indexLabelWrap : dataSeries.indexLabelWrap;

				dataPointEO.startAngle = j === 0 ? dataSeries.startAngle ? (dataSeries.startAngle / 180) * Math.PI : 0 : dataPointEOs[j - 1].endAngle;

				dataPointEO.startAngle = (dataPointEO.startAngle + (2 * Math.PI)) % (2 * Math.PI);

				dataPointEO.endAngle = dataPointEO.startAngle + ((2 * Math.PI / sum) * Math.abs(dataPoint.y));

				//var midAngle = dataPointEO.startAngle + Math.abs(dataPointEO.endAngle - dataPointEO.startAngle) / 2;
				var midAngle = (dataPointEO.endAngle + dataPointEO.startAngle) / 2;

				//var midAngle = (180 / Math.PI * midAngle);

				midAngle = (midAngle + (2 * Math.PI)) % (2 * Math.PI);

				dataPointEO.midAngle = midAngle;

				if (dataPointEO.midAngle > (Math.PI / 2) - poleAnglularDistance && dataPointEO.midAngle < (Math.PI / 2) + poleAnglularDistance) {
					if (noDPNearSouthPole === 0 || dataPointEOs[firstDPCloseToSouth].midAngle > dataPointEO.midAngle)
						firstDPCloseToSouth = j;

					noDPNearSouthPole++;
				}
				else if (dataPointEO.midAngle > (3 * Math.PI / 2) - poleAnglularDistance && dataPointEO.midAngle < (3 * Math.PI / 2) + poleAnglularDistance) {
					if (noDPNearNorthPole === 0 || dataPointEOs[firstDPCloseToNorth].midAngle > dataPointEO.midAngle)
						firstDPCloseToNorth = j;

					noDPNearNorthPole++;
				}


				if (midAngle > (Math.PI / 2) && midAngle <= (3 * Math.PI / 2))
					dataPointEO.hemisphere = "left";
				else
					dataPointEO.hemisphere = "right";

				//dataPointEO.indexLabelText = j.toString() + "; " + dataPoint.y.toString() + "; " + midAngle.toString() + "; junk";
				dataPointEO.indexLabelTextBlock = new TextBlock(_this.plotArea.ctx, {
					fontSize: dataPointEO.indexLabelFontSize, fontFamily: dataPointEO.indexLabelFontFamily, fontColor: dataPointEO.indexLabelFontColor,
					fontStyle: dataPointEO.indexLabelFontStyle, fontWeight: dataPointEO.indexLabelFontWeight,
					horizontalAlign: "left",
					backgroundColor: dataPointEO.indexLabelBackgroundColor,
					maxWidth: dataPointEO.indexLabelMaxWidth, maxHeight: dataPointEO.indexLabelWrap ? dataPointEO.indexLabelFontSize * 5 : dataPointEO.indexLabelFontSize * 1.5,
					text: dataPointEO.indexLabelText,
					padding: 0,
					//textBaseline: dataPointEO.indexLabelBackgroundColor ? "middle" : "top"
					textBaseline: "top"
				});

				dataPointEO.indexLabelTextBlock.measureText();

				//dataPoint.labelWidth = ctx.measureText(j.toString() + "; " + dataPoint.label).width;

				//console.log(dataPoint.label);
			}

			var noOfDPToRightOfSouthPole = 0;
			var noOfDPToLeftOfNorthPole = 0;
			var keepSameDirection = false; // once a dataPoint's hemisphere is changed, others should follow the same so that there are no labes near pole pointing in opposite direction.

			for (j = 0; j < dataPoints.length; j++) {

				var dataPointEO = dataPointEOs[(firstDPCloseToSouth + j) % dataPoints.length];

				if (noDPNearSouthPole > 1 && dataPointEO.midAngle > (Math.PI / 2) - poleAnglularDistance && dataPointEO.midAngle < (Math.PI / 2) + poleAnglularDistance) {

					if (noOfDPToRightOfSouthPole <= noDPNearSouthPole / 2 && !keepSameDirection) {
						dataPointEO.hemisphere = "right";
						noOfDPToRightOfSouthPole++;
					}
					else {
						dataPointEO.hemisphere = "left";
						keepSameDirection = true;
					}
				}
			}

			keepSameDirection = false;
			for (j = 0; j < dataPoints.length; j++) {

				var dataPointEO = dataPointEOs[(firstDPCloseToNorth + j) % dataPoints.length];

				//if (dataPoint.hemisphere = "right")
				//	break;

				if (noDPNearNorthPole > 1 && dataPointEO.midAngle > (3 * Math.PI / 2) - poleAnglularDistance && dataPointEO.midAngle < (3 * Math.PI / 2) + poleAnglularDistance) {

					if (noOfDPToLeftOfNorthPole <= noDPNearNorthPole / 2 && !keepSameDirection) {
						dataPointEO.hemisphere = "left";
						noOfDPToLeftOfNorthPole++;
					}
					else {
						dataPointEO.hemisphere = "right";
						keepSameDirection = true;
					}
				}
			}
		}//End of initLabels()

		function renderLabels() {

			var ctx = _this.plotArea.ctx;
			ctx.fillStyle = "black";
			ctx.strokeStyle = "grey";
			var fontSize = 16;
			//ctx.font = fontSize + "px Arial";
			ctx.textBaseline = "middle";
			ctx.lineJoin = "round";
			var i = 0, j = 0;

			for (i = 0; i < dataPoints.length; i++) {
				var dataPointEO = dataPointEOs[i];

				if (!dataPointEO.indexLabelText)
					continue;

				dataPointEO.indexLabelTextBlock.y -= dataPointEO.indexLabelTextBlock.height / 2;

				var xOffset = 0;

				if (dataPointEO.hemisphere === "left") {
					var xOffset = dataSeries.indexLabelPlacement !== "inside" ? -(dataPointEO.indexLabelTextBlock.width + indexLabelLineEdgeLength) : -dataPointEO.indexLabelTextBlock.width / 2;
				}
				else {
					var xOffset = dataSeries.indexLabelPlacement !== "inside" ? indexLabelLineEdgeLength : -dataPointEO.indexLabelTextBlock.width / 2;
				}

				dataPointEO.indexLabelTextBlock.x += xOffset;
				dataPointEO.indexLabelTextBlock.render(true);
				dataPointEO.indexLabelTextBlock.x -= xOffset;

				//if (i < 4)
				//	customPrompt(i + "; " + center.y + "; " + dataPointEO.indexLabelTextBlock.y.toFixed(2));

				dataPointEO.indexLabelTextBlock.y += dataPointEO.indexLabelTextBlock.height / 2;

				if (dataPointEO.indexLabelPlacement !== "inside") {
					var indexLabelLineStartX = dataPointEO.center.x + outerRadius * Math.cos(dataPointEO.midAngle);
					var indexLabelLineStartY = dataPointEO.center.y + outerRadius * Math.sin(dataPointEO.midAngle);

					//ctx.strokeStyle = dataPoints[i].color ? dataPoints[i].color : dataSeries._colorSet[i % dataSeries._colorSet.length];
					ctx.strokeStyle = dataPointEO.indexLabelLineColor;
					ctx.lineWidth = dataPointEO.indexLabelLineThickness;

					if (ctx.setLineDash) {
						ctx.setLineDash(getLineDashArray(dataPointEO.indexLabelLineDashType, dataPointEO.indexLabelLineThickness));
					}

					//ctx.lineWidth = 4;
					ctx.beginPath();
					ctx.moveTo(indexLabelLineStartX, indexLabelLineStartY);
					ctx.lineTo(dataPointEO.indexLabelTextBlock.x, dataPointEO.indexLabelTextBlock.y);
					ctx.lineTo(dataPointEO.indexLabelTextBlock.x + (dataPointEO.hemisphere === "left" ? -indexLabelLineEdgeLength : indexLabelLineEdgeLength), dataPointEO.indexLabelTextBlock.y);
					ctx.stroke();
					//ctx.closePath();
					//window.alert("contine??");
					//animate();
				}

				ctx.lineJoin = "miter";
			}
		}

		function animate(fractionComplete) {

			var ctx = _this.plotArea.ctx;

			ctx.clearRect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
			ctx.fillStyle = _this.backgroundColor;
			ctx.fillRect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);

			var maxAngle = dataPointEOs[0].startAngle + (2 * Math.PI * fractionComplete);

			for (var i = 0; i < dataPoints.length; i++) {

				var startAngle = i === 0 ? dataPointEOs[i].startAngle : endAngle;
				var endAngle = startAngle + (dataPointEOs[i].endAngle - dataPointEOs[i].startAngle);

				var shouldBreak = false;

				if (endAngle > maxAngle) {
					endAngle = maxAngle;
					shouldBreak = true;
				}

				var color = dataPoints[i].color ? dataPoints[i].color : dataSeries._colorSet[i % dataSeries._colorSet.length];

				if (endAngle > startAngle)
					drawSegment(_this.plotArea.ctx, dataPointEOs[i].center, dataPointEOs[i].radius, color, dataSeries.type, startAngle, endAngle, dataSeries.fillOpacity, dataPointEOs[i].percentInnerRadius);

				if (shouldBreak)
					break;
			}
		}

		function explodeToggle(fractionComplete) {

			var ctx = _this.plotArea.ctx;

			ctx.clearRect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);
			ctx.fillStyle = _this.backgroundColor;
			ctx.fillRect(plotArea.x1, plotArea.y1, plotArea.width, plotArea.height);

			for (var i = 0; i < dataPoints.length; i++) {

				var startAngle = dataPointEOs[i].startAngle;
				var endAngle = dataPointEOs[i].endAngle;

				if (endAngle > startAngle) {


					var offsetX = (outerRadius * .07 * Math.cos(dataPointEOs[i].midAngle));
					var offsetY = (outerRadius * .07 * Math.sin(dataPointEOs[i].midAngle));
					var isInTransition = false;

					if (dataPoints[i].exploded) {
						if (Math.abs(dataPointEOs[i].center.x - (center.x + offsetX)) > 0.000000001 || Math.abs(dataPointEOs[i].center.y - (center.y + offsetY)) > 0.000000001) {

							dataPointEOs[i].center.x = center.x + offsetX * fractionComplete;
							dataPointEOs[i].center.y = center.y + offsetY * fractionComplete;

							isInTransition = true;
						}
					} else if (Math.abs(dataPointEOs[i].center.x - center.x) > 0 || Math.abs(dataPointEOs[i].center.y - center.y) > 0) {
						dataPointEOs[i].center.x = center.x + offsetX * (1 - fractionComplete);
						dataPointEOs[i].center.y = center.y + offsetY * (1 - fractionComplete);

						isInTransition = true;
					}

					if (isInTransition) {
						var entry = {
						};
						entry.dataSeries = dataSeries;
						entry.dataPoint = dataSeries.dataPoints[i];
						entry.index = i;
						_this._toolTip.highlightObjects([entry]);
					}

					var color = dataPoints[i].color ? dataPoints[i].color : dataSeries._colorSet[i % dataSeries._colorSet.length];

					drawSegment(_this.plotArea.ctx, dataPointEOs[i].center, dataPointEOs[i].radius, color, dataSeries.type, startAngle, endAngle, dataSeries.fillOpacity, dataPointEOs[i].percentInnerRadius);
				}
			}

			//window.alert("next??");
			renderLabels();
		}

		function areDataPointsTooClose(first, second) {

			var label1 = {
				x1: first.indexLabelTextBlock.x, y1: first.indexLabelTextBlock.y - first.indexLabelTextBlock.height / 2, x2: first.indexLabelTextBlock.x + first.indexLabelTextBlock.width, y2: first.indexLabelTextBlock.y + first.indexLabelTextBlock.height / 2
			};
			var label2 = {
				x1: second.indexLabelTextBlock.x, y1: second.indexLabelTextBlock.y - second.indexLabelTextBlock.height / 2, x2: second.indexLabelTextBlock.x + second.indexLabelTextBlock.width, y2: second.indexLabelTextBlock.y + second.indexLabelTextBlock.height / 2
			};

			if (label1.x2 < label2.x1 - indexLabelLineEdgeLength || label1.x1 > label2.x2 + indexLabelLineEdgeLength || label1.y1 > label2.y2 + indexLabelLineEdgeLength || label1.y2 < label2.y1 - indexLabelLineEdgeLength)
				return false;

			return true;
		}

		function getVerticalDistanceBetweenLabels(first, second) {

			var distance = 0;
			var label1 = {
				y: first.indexLabelTextBlock.y, y1: first.indexLabelTextBlock.y - first.indexLabelTextBlock.height / 2, y2: first.indexLabelTextBlock.y + first.indexLabelTextBlock.height / 2
			};
			var label2 = {
				y: second.indexLabelTextBlock.y, y1: second.indexLabelTextBlock.y - second.indexLabelTextBlock.height / 2, y2: second.indexLabelTextBlock.y + second.indexLabelTextBlock.height / 2
			};

			if (label2.y > label1.y) {
				distance = label2.y1 - label1.y2;
			}
			else {
				distance = label1.y1 - label2.y2;
			}

			return distance;
		}

		function getNextLabelIndex(currentLabelIndex) {
			var nextLabelIndex = null;

			for (var i = 1; i < dataPoints.length; i++) {

				nextLabelIndex = (currentLabelIndex + i + dataPointEOs.length) % dataPointEOs.length;

				if (dataPointEOs[nextLabelIndex].hemisphere !== dataPointEOs[currentLabelIndex].hemisphere) {
					nextLabelIndex = null;
					break;
				}
				else if ((dataPointEOs[nextLabelIndex].indexLabelText) && (nextLabelIndex !== currentLabelIndex)
					&& ((getVerticalDistanceBetweenLabels(dataPointEOs[nextLabelIndex], dataPointEOs[currentLabelIndex]) < 0) || (dataPointEOs[currentLabelIndex].hemisphere === "right" ? dataPointEOs[nextLabelIndex].indexLabelTextBlock.y >= dataPointEOs[currentLabelIndex].indexLabelTextBlock.y : dataPointEOs[nextLabelIndex].indexLabelTextBlock.y <= dataPointEOs[currentLabelIndex].indexLabelTextBlock.y)))
					break;
				else {
					nextLabelIndex = null;
				}
			}

			return nextLabelIndex;
		}

		function getPreviousLabelIndex(currentLabelIndex) {
			var prevLabelIndex = null;

			for (var i = 1; i < dataPoints.length; i++) {

				prevLabelIndex = (currentLabelIndex - i + dataPointEOs.length) % dataPointEOs.length;

				if (dataPointEOs[prevLabelIndex].hemisphere !== dataPointEOs[currentLabelIndex].hemisphere) {
					prevLabelIndex = null;
					break;
				}
				else if ((dataPointEOs[prevLabelIndex].indexLabelText) && (dataPointEOs[prevLabelIndex].hemisphere === dataPointEOs[currentLabelIndex].hemisphere) && (prevLabelIndex !== currentLabelIndex)
					&& ((getVerticalDistanceBetweenLabels(dataPointEOs[prevLabelIndex], dataPointEOs[currentLabelIndex]) < 0) || (dataPointEOs[currentLabelIndex].hemisphere === "right" ? dataPointEOs[prevLabelIndex].indexLabelTextBlock.y <= dataPointEOs[currentLabelIndex].indexLabelTextBlock.y : dataPointEOs[prevLabelIndex].indexLabelTextBlock.y >= dataPointEOs[currentLabelIndex].indexLabelTextBlock.y)))
					break;
				else {
					prevLabelIndex = null;
				}

			}

			return prevLabelIndex;
		}

		function rePositionLabels(dataPointIndex, offset) {
			offset = offset || 0;

			var actualOffset = 0;

			//var labelYMin = 2;
			//var labelYMax = ctx.canvas.height - 2;
			//var labelYMin = _this.plotArea.ctx.canvas.height / 2 - indexLabelRadius * 1;
			//var labelYMax = _this.plotArea.ctx.canvas.height / 2 + indexLabelRadius * 1;

			var labelYMin = center.y - indexLabelRadius * 1;
			var labelYMax = center.y + indexLabelRadius * 1;

			//console.log(totalRecursions);

			if (dataPointIndex >= 0 && dataPointIndex < dataPoints.length) {

				var dataPointEO = dataPointEOs[dataPointIndex];
				//if (dataPointIndex === 0)
				//	customPrompt(labelYMin.toFixed(2) + "; " + labelYMax.toFixed(2) + "; " + dataPointEO.indexLabelTextBlock.y.toFixed(2));

				// If label is already outside the bounds, return
				if ((offset < 0 && dataPointEO.indexLabelTextBlock.y < labelYMin) || (offset > 0 && dataPointEO.indexLabelTextBlock.y > labelYMax))
					return 0;


				var validOffset = offset;


				//Check if the offset falls within the bounds (labelYMin, labelYMax, tangential bounds) without considering overlap. Else use the closest offset that is possible - validOffset.
				{
					var distFromIndexLineStart = 0;
					var indexLabelLineStartX = 0;
					var indexLabelLineStartY = 0;
					var indexLabelAngle = 0;
					var indexLabelAngleWhenTangent = 0;

					if (validOffset < 0) {
						if (dataPointEO.indexLabelTextBlock.y - dataPointEO.indexLabelTextBlock.height / 2 > labelYMin && dataPointEO.indexLabelTextBlock.y - dataPointEO.indexLabelTextBlock.height / 2 + validOffset < labelYMin)
							validOffset = -(labelYMin - (dataPointEO.indexLabelTextBlock.y - dataPointEO.indexLabelTextBlock.height / 2 + validOffset));
					} else {
						if (dataPointEO.indexLabelTextBlock.y + dataPointEO.indexLabelTextBlock.height / 2 < labelYMin && dataPointEO.indexLabelTextBlock.y + dataPointEO.indexLabelTextBlock.height / 2 + validOffset > labelYMax)
							validOffset = (dataPointEO.indexLabelTextBlock.y + dataPointEO.indexLabelTextBlock.height / 2 + validOffset) - labelYMax;
					}

					var newlabelY = dataPointEO.indexLabelTextBlock.y + validOffset;
					var newlabelX = 0;

					if (dataPointEO.hemisphere === "right") {
						newlabelX = center.x + Math.sqrt(Math.pow(indexLabelRadius, 2) - Math.pow(newlabelY - center.y, 2));
					}
					else
						newlabelX = center.x - Math.sqrt(Math.pow(indexLabelRadius, 2) - Math.pow(newlabelY - center.y, 2));


					indexLabelLineStartX = center.x + outerRadius * Math.cos(dataPointEO.midAngle);
					indexLabelLineStartY = center.y + outerRadius * Math.sin(dataPointEO.midAngle);

					distFromIndexLineStart = Math.sqrt(Math.pow(newlabelX - indexLabelLineStartX, 2) + Math.pow(newlabelY - indexLabelLineStartY, 2));

					indexLabelAngleWhenTangent = Math.acos(outerRadius / indexLabelRadius);

					//indexLabelAngle = Math.acos((outerRadius * outerRadius + distFromIndexLineStart * distFromIndexLineStart - indexLabelRadius * indexLabelRadius) / (2 * outerRadius * distFromIndexLineStart));
					indexLabelAngle = Math.acos((indexLabelRadius * indexLabelRadius + outerRadius * outerRadius - distFromIndexLineStart * distFromIndexLineStart) / (2 * outerRadius * indexLabelRadius));

					if (indexLabelAngle < indexLabelAngleWhenTangent) {
						validOffset = newlabelY - dataPointEO.indexLabelTextBlock.y;
						//dataPointEO.indexLabelTextBlock.x = newlabelX;
					}
					else {

						validOffset = 0;

						//dataPointEO.indexLabelTextBlock.x = newlabelX;

						//Index Line is overlapping the pie. So lets find out the point where indexline becomes a tangent.

						//distFromIndexLineStart = Math.sqrt(indexLabelRadius * indexLabelRadius - outerRadius * outerRadius);
						////distFromIndexLineStart *= offset < 0 ? -1 : 1;
						////indexLabelAngle = Math.acos((indexLabelRadius * indexLabelRadius + outerRadius * outerRadius - distFromIndexLineStart * distFromIndexLineStart) / (2 * outerRadius * indexLabelRadius));
						//indexLabelAngle = Math.atan2(distFromIndexLineStart, outerRadius);

						//newlabelX = center.x + indexLabelRadius * Math.cos(indexLabelAngle);
						//newlabelY = center.y + indexLabelRadius * Math.sin(indexLabelAngle);

						//actualOffset = newlabelY - dataPointEO.indexLabelTextBlock.y;

						//dataPointEO.indexLabelTextBlock.y = newlabelY;
						//dataPointEO.indexLabelTextBlock.x = newlabelX;

					}

				}

				//var tempIndex = (dataPointIndex + dataPointEOs.length - 1) % dataPointEOs.length;

				//var prevDataPointIndex = dataPointEOs[tempIndex].hemisphere === dataPointEO.hemisphere ? tempIndex : null;

				var prevDataPointIndex = getPreviousLabelIndex(dataPointIndex);

				//tempIndex = (dataPointIndex + dataPointEOs.length + 1) % dataPointEOs.length;

				//var nextDataPointIndex = dataPointEOs[tempIndex].hemisphere === dataPointEO.hemisphere ? tempIndex : null;

				var nextDataPointIndex = getNextLabelIndex(dataPointIndex);

				var otherdataPointEO, otherDataPointIndex, distanceFromOtherLabel;
				var otherDataPointOffset = 0;
				var otherDataPointActualOffset = 0;


				if (validOffset < 0) {

					otherDataPointIndex = dataPointEO.hemisphere === "right" ? prevDataPointIndex : nextDataPointIndex;

					actualOffset = validOffset;

					if (otherDataPointIndex !== null) {

						//if (dataPointIndex < 4)
						//	customPrompt("valid: " + validOffset);

						var tempOffset = -validOffset;

						var distanceFromOtherLabel = (dataPointEO.indexLabelTextBlock.y - dataPointEO.indexLabelTextBlock.height / 2) - (dataPointEOs[otherDataPointIndex].indexLabelTextBlock.y + dataPointEOs[otherDataPointIndex].indexLabelTextBlock.height / 2);

						if (distanceFromOtherLabel - tempOffset < minDistanceBetweenLabels) {
							otherDataPointOffset = -tempOffset;
							//totalRecursions++;
							otherDataPointActualOffset = rePositionLabels(otherDataPointIndex, otherDataPointOffset, recursionCount + 1);

							//if (dataPointIndex < 4)
							//	customPrompt(dataPointIndex + "; " + "offset: " + otherDataPointOffset);


							if (+otherDataPointActualOffset.toFixed(precision) > +otherDataPointOffset.toFixed(precision)) {

								if (distanceFromOtherLabel > minDistanceBetweenLabels)
									actualOffset = -(distanceFromOtherLabel - minDistanceBetweenLabels);
									//else
									//	actualOffset = 0;
								else
									actualOffset = -(tempOffset - (otherDataPointActualOffset - otherDataPointOffset));
							}

							//if (dataPointIndex < 4)
							//	customPrompt("actual: " + actualOffset);
						}

					}

				} else if (validOffset > 0) {

					otherDataPointIndex = dataPointEO.hemisphere === "right" ? nextDataPointIndex : prevDataPointIndex;

					actualOffset = validOffset;

					if (otherDataPointIndex !== null) {

						var tempOffset = validOffset;

						var distanceFromOtherLabel = (dataPointEOs[otherDataPointIndex].indexLabelTextBlock.y - dataPointEOs[otherDataPointIndex].indexLabelTextBlock.height / 2) - (dataPointEO.indexLabelTextBlock.y + dataPointEO.indexLabelTextBlock.height / 2);

						if (distanceFromOtherLabel - tempOffset < minDistanceBetweenLabels) {
							otherDataPointOffset = tempOffset;
							//totalRecursions++;
							otherDataPointActualOffset = rePositionLabels(otherDataPointIndex, otherDataPointOffset, recursionCount + 1);

							if (+otherDataPointActualOffset.toFixed(precision) < +otherDataPointOffset.toFixed(precision)) {

								if (distanceFromOtherLabel > minDistanceBetweenLabels)
									actualOffset = distanceFromOtherLabel - minDistanceBetweenLabels;
									//else
									//	actualOffset = 0;
								else
									actualOffset = tempOffset - (otherDataPointOffset - otherDataPointActualOffset);
							}
						}

					}

					//if (!(dataPointEO.indexLabelTextBlock.y + dataPointEO.indexLabelTextBlock.height / 2 + actualOffset < labelYMax)) {
					//	if (dataPointEO.indexLabelTextBlock.y + dataPointEO.indexLabelTextBlock.height / 2 < labelYMax) {
					//		actualOffset = labelYMax - (dataPointEO.indexLabelTextBlock.y + dataPointEO.indexLabelTextBlock.height / 2);
					//	}
					//	else {
					//		actualOffset = 0;
					//	}
					//}

				}

				if (actualOffset) {

					var newLabelY = dataPointEO.indexLabelTextBlock.y + actualOffset;




					var newLabelX = 0;

					if (dataPointEO.hemisphere === "right") {
						newLabelX = center.x + Math.sqrt(Math.pow(indexLabelRadius, 2) - Math.pow(newLabelY - center.y, 2));
					}
					else
						newLabelX = center.x - Math.sqrt(Math.pow(indexLabelRadius, 2) - Math.pow(newLabelY - center.y, 2));

					if (dataPointEO.midAngle > (Math.PI / 2) - poleAnglularDistance && dataPointEO.midAngle < (Math.PI / 2) + poleAnglularDistance) {

						var prevDPIndex = (dataPointIndex - 1 + dataPointEOs.length) % dataPointEOs.length;
						var prevDP = dataPointEOs[prevDPIndex];
						var nextDP = dataPointEOs[(dataPointIndex + 1 + dataPointEOs.length) % dataPointEOs.length];

						if (dataPointEO.hemisphere === "left" && prevDP.hemisphere === "right" && newLabelX > prevDP.indexLabelTextBlock.x) {
							newLabelX = prevDP.indexLabelTextBlock.x - 15;
						} else if (dataPointEO.hemisphere === "right" && nextDP.hemisphere === "left" && newLabelX < nextDP.indexLabelTextBlock.x) {
							newLabelX = nextDP.indexLabelTextBlock.x + 15;
						}
					} else if (dataPointEO.midAngle > (3 * Math.PI / 2) - poleAnglularDistance && dataPointEO.midAngle < (3 * Math.PI / 2) + poleAnglularDistance) {

						var prevDPIndex = (dataPointIndex - 1 + dataPointEOs.length) % dataPointEOs.length;
						var prevDP = dataPointEOs[prevDPIndex];
						var nextDP = dataPointEOs[(dataPointIndex + 1 + dataPointEOs.length) % dataPointEOs.length];

						if (dataPointEO.hemisphere === "right" && prevDP.hemisphere === "left" && newLabelX < prevDP.indexLabelTextBlock.x) {
							newLabelX = prevDP.indexLabelTextBlock.x + 15;
						} else if (dataPointEO.hemisphere === "left" && nextDP.hemisphere === "right" && newLabelX > nextDP.indexLabelTextBlock.x) {
							newLabelX = nextDP.indexLabelTextBlock.x - 15;
						}
					}

					//if (actualOffset < 0 && dataPointIndex < 4)
					//	customPrompt(actualOffset.toFixed(2) + "; " + dataPointEO.indexLabelTextBlock.y.toFixed(2) + "; " + newLabelY.toFixed(2));

					dataPointEO.indexLabelTextBlock.y = newLabelY;

					dataPointEO.indexLabelTextBlock.x = newLabelX;

					dataPointEO.indexLabelAngle = Math.atan2((dataPointEO.indexLabelTextBlock.y - center.y), (dataPointEO.indexLabelTextBlock.x - center.x));

				}


			}

			return actualOffset;
		}


		function positionLabels() {
			var ctx = _this.plotArea.ctx;

			ctx.fillStyle = "grey";
			ctx.strokeStyle = "grey";
			var fontSize = 16;
			ctx.font = fontSize + "px Arial";
			ctx.textBaseline = "middle";
			var i = 0, j = 0;
			var deltaR = 0;

			var resizeFlag = true;

			for (j = 0; j < 10 && (j < 1 || deltaR > 0) ; j++) {

				if (dataSeries.radius || (!dataSeries.radius && typeof dataSeries.innerRadius !== 'undefined' && dataSeries.innerRadius !== null && outerRadius - deltaR <= innerRadius))
					resizeFlag = false;

				if (resizeFlag)
				outerRadius -= deltaR;

				deltaR = 0;

				if (dataSeries.indexLabelPlacement !== "inside") {

					indexLabelRadius = outerRadius * indexLabelRadiusToRadiusRatio;

					for (i = 0; i < dataPoints.length; i++) {
						var dataPointEO = dataPointEOs[i];

						dataPointEO.indexLabelTextBlock.x = center.x + indexLabelRadius * Math.cos(dataPointEO.midAngle);
						dataPointEO.indexLabelTextBlock.y = center.y + indexLabelRadius * Math.sin(dataPointEO.midAngle);

						dataPointEO.indexLabelAngle = dataPointEO.midAngle;
						dataPointEO.radius = outerRadius;
						dataPointEO.percentInnerRadius = percentInnerRadius;
						//dataPointEO.indexLabelFontSize = dataPoint.indexLabelFontSize ? dataPoint.indexLabelFontSize : dataSeries.indexLabelFontSize;
					}

					var currentDataPoint, nextDataPoint;
					for (i = 0; i < dataPoints.length; i++) {

						var dataPointEO = dataPointEOs[i];
						//dataPointEO.lab
						//resetAnimationFrame();
						//animate();
						//renderLabels();

						//var prevDataPointIndex = (i - 1 + dataPointEOs.length) % dataPointEOs.length;

						//var nextDataPointIndex = (i + 1 + dataPointEOs.length) % dataPointEOs.length;
						//nextDataPointIndex = dataPointEOs[nextDataPointIndex].hemisphere === dataPointEO.hemisphere && nextDataPointIndex !== i ? nextDataPointIndex : null;

						var nextDataPointIndex = getNextLabelIndex(i);

						if (nextDataPointIndex === null)
							continue;

						currentDataPoint = dataPointEOs[i];
						nextDataPoint = dataPointEOs[nextDataPointIndex];


						var distanceFromNextLabel = 0;

						//if (dataPointEO.hemisphere === "right")
						//	distanceFromNextLabel = (nextDataPoint.indexLabelTextBlock.y - nextDataPoint.indexLabelTextBlock.height / 2) - (currentDataPoint.indexLabelTextBlock.y + currentDataPoint.indexLabelTextBlock.height / 2) - minDistanceBetweenLabels;
						//else
						//	distanceFromNextLabel = (currentDataPoint.indexLabelTextBlock.y - currentDataPoint.indexLabelTextBlock.height / 2) - (nextDataPoint.indexLabelTextBlock.y + nextDataPoint.indexLabelTextBlock.height / 2) - minDistanceBetweenLabels;

						distanceFromNextLabel = getVerticalDistanceBetweenLabels(currentDataPoint, nextDataPoint) - minDistanceBetweenLabels;


						if (distanceFromNextLabel < 0) {

							var dataPointsAbove = 0;
							var dataPointsBelow = 0;
							//var indexLabelAngleWhenTangent = Math.acos(outerRadius / indexLabelRadius) / Math.PI * 180;


							for (var k = 0; k < dataPoints.length; k++) {

								if (k === i)
									continue;

								//if (dataPointEOs[k].hemisphere !== dataPointEO.hemisphere || Math.abs(dataPointEOs[k].midAngle - dataPointEO.midAngle) > 30)
								//	continue;
								//if (dataPointEOs[k].hemisphere !== dataPointEO.hemisphere || Math.abs(dataPointEOs[k].labelAngle - dataPointEO.indexLabelAngle) > 30)
								//	continue;
								//if (dataPointEOs[k].hemisphere !== dataPointEO.hemisphere || Math.abs(dataPointEOs[k].midAngle - dataPointEO.midAngle) > indexLabelAngleWhenTangent)
								//	continue;
								if (dataPointEOs[k].hemisphere !== dataPointEO.hemisphere)
									continue;

								if (dataPointEOs[k].indexLabelTextBlock.y < dataPointEO.indexLabelTextBlock.y)
									dataPointsAbove++;
								else
									dataPointsBelow++;
							}

							//var upWardsOffset = (distanceFromNextLabel) / dataPoints.length * (dataPointsBelow);
							var upWardsOffset = (distanceFromNextLabel) / (dataPointsAbove + dataPointsBelow || 1) * (dataPointsBelow);
							var downWardsOffset = -1 * (distanceFromNextLabel - upWardsOffset);

							var actualUpwardOffset = 0;
							var actualDownwardOffset = 0;

							if (dataPointEO.hemisphere === "right") {
								actualUpwardOffset = rePositionLabels(i, upWardsOffset);

								//if (i < 4 && actualDownwardOffset !== upWardsOffset)
								//	customPrompt(i + "; " + upWardsOffset.toFixed(2) + "; " + actualUpwardOffset.toFixed(2));


								downWardsOffset = -1 * (distanceFromNextLabel - actualUpwardOffset);

								actualDownwardOffset = rePositionLabels(nextDataPointIndex, downWardsOffset);

								//window.alert(typeof +downWardsOffset.toFixed(precision));
								//Setting precision to make sure that they don't become not equal become of minor differences - like a difference of .000001
								if (+actualDownwardOffset.toFixed(precision) < +downWardsOffset.toFixed(precision) && +actualUpwardOffset.toFixed(precision) <= +upWardsOffset.toFixed(precision))
									rePositionLabels(i, -(downWardsOffset - actualDownwardOffset));

							} else {
								actualUpwardOffset = rePositionLabels(nextDataPointIndex, upWardsOffset);

								downWardsOffset = -1 * (distanceFromNextLabel - actualUpwardOffset);

								actualDownwardOffset = rePositionLabels(i, downWardsOffset);

								//Setting precision to make sure that they don't become not equal become of minor differences - like a difference of .000001
								if (+actualDownwardOffset.toFixed(precision) < +downWardsOffset.toFixed(precision) && +actualUpwardOffset.toFixed(precision) <= +upWardsOffset.toFixed(precision))
									rePositionLabels(nextDataPointIndex, -(downWardsOffset - actualDownwardOffset));
							}
						}


						//resetAnimationFrame();
						//animate();
						//renderLabels();
						//window.alert("next??");
					}
				} else {
					for (i = 0; i < dataPoints.length; i++) {

						var dataPointEO = dataPointEOs[i];
						indexLabelRadius = dataSeries.type === "pie" ? outerRadius * .7 : outerRadius * .8;


						var dx = center.x + indexLabelRadius * (Math.cos((dataPointEO.midAngle)));
						var dy = center.y + indexLabelRadius * (Math.sin((dataPointEO.midAngle)));

						dataPointEO.indexLabelTextBlock.x = dx;
						dataPointEO.indexLabelTextBlock.y = dy;
					}
				}

				// Resize Pie based on the label length.
				for (i = 0; i < dataPoints.length; i++) {

					dataPointEO = dataPointEOs[i];

					var size = dataPointEO.indexLabelTextBlock.measureText();
					// To make sure that null text or empty strings don't affect the radius. Required when user is not showing any labels
					if (size.height === 0 || size.width === 0)
						continue;

					var xOverflow = 0;
					var xdr = 0;

					if (dataPointEO.hemisphere === "right") {
						xOverflow = plotArea.x2 - (dataPointEO.indexLabelTextBlock.x + dataPointEO.indexLabelTextBlock.width + indexLabelLineEdgeLength);
						xOverflow *= -1;
					} else {
						xOverflow = plotArea.x1 - (dataPointEO.indexLabelTextBlock.x - dataPointEO.indexLabelTextBlock.width - indexLabelLineEdgeLength);
					}
					if (xOverflow > 0) {
						if (!resizeFlag && dataPointEO.indexLabelText) {
							var newIndexLabelMaxWidth = dataPointEO.hemisphere === "right" ? plotArea.x2 - dataPointEO.indexLabelTextBlock.x : dataPointEO.indexLabelTextBlock.x - plotArea.x1;
							dataPointEO.indexLabelTextBlock.maxWidth * .3 > newIndexLabelMaxWidth ? dataPointEO.indexLabelText = "" : dataPointEO.indexLabelTextBlock.maxWidth = newIndexLabelMaxWidth * .85;
							if (dataPointEO.indexLabelTextBlock.maxWidth * .3 < newIndexLabelMaxWidth) dataPointEO.indexLabelTextBlock.x -= dataPointEO.hemisphere === "right" ? 2 : -2;
					}

						if (Math.abs(dataPointEO.indexLabelTextBlock.y - dataPointEO.indexLabelTextBlock.height / 2 - center.y) < outerRadius
							|| Math.abs(dataPointEO.indexLabelTextBlock.y + dataPointEO.indexLabelTextBlock.height / 2 - center.y) < outerRadius) {

							xdr = xOverflow / Math.abs(Math.cos(dataPointEO.indexLabelAngle));

							if (xdr > 9)
								xdr = xdr * .3;

							if (xdr > deltaR)
								deltaR = xdr;
						}
					}

					var yOverflow = 0;
					var ydr = 0;

					if (dataPointEO.indexLabelAngle > 0 && dataPointEO.indexLabelAngle < Math.PI) {
						yOverflow = plotArea.y2 - (dataPointEO.indexLabelTextBlock.y + dataPointEO.indexLabelTextBlock.height / 2 + 5);
						yOverflow *= -1;
					} else {
						yOverflow = plotArea.y1 - (dataPointEO.indexLabelTextBlock.y - dataPointEO.indexLabelTextBlock.height / 2 - 5);
					}

					if (yOverflow > 0) {
						if (!resizeFlag && dataPointEO.indexLabelText) {
							var positionMultiplier = dataPointEO.indexLabelAngle > 0 && dataPointEO.indexLabelAngle < Math.PI ? -1 : 1;
							if (rePositionLabels(i, yOverflow * positionMultiplier) === 0)
								rePositionLabels(i, 2 * positionMultiplier);
						}
						if (Math.abs(dataPointEO.indexLabelTextBlock.x - center.x) < outerRadius) {

							ydr = yOverflow / Math.abs(Math.sin(dataPointEO.indexLabelAngle));

							if (ydr > 9)
								ydr = ydr * .3;

							if (ydr > deltaR)
								deltaR = ydr;

						}
					}

				}

				function removeLabelsForSmallSegments(totalOverlap, startIndex, endIndex) {

					var dpEOs = [];
					var totalRemovedLabelHeight = 0;

					for (var i = startIndex; true; i = (i + 1 + dataPoints.length) % dataPoints.length) {
						dpEOs.push(dataPointEOs[i]);

						if (i === endIndex)
							break;
					}

					dpEOs.sort(function (entry1, entry2) {
						return entry1.y - entry2.y;
					});

					for (i = 0; i < dpEOs.length; i++) {
						var dpEO = dpEOs[i];

						if (totalRemovedLabelHeight < totalOverlap * .7) {
							totalRemovedLabelHeight += dpEO.indexLabelTextBlock.height;
							dpEO.indexLabelTextBlock.text = "";
							dpEO.indexLabelText = "";
							dpEO.indexLabelTextBlock.measureText();
						} else
							break;
					}

				}

				//resetAnimationFrame(1);
				//animate();
				//window.alert("next??");
				function skipLabels() {
				var overlapStartIndex = -1;
				var overlapEndIndex = -1;
				var totalOverlap = 0;
					var removeLabels = false;

				for (var k = 0; k < dataPoints.length; k++) {
						removeLabels = false;
					currentDataPoint = dataPointEOs[k];

					if (!currentDataPoint.indexLabelText)
						continue;

					var nextLabelIndex = getNextLabelIndex(k);
					if (nextLabelIndex === null)
						continue;

					var nextDataPoint = dataPointEOs[nextLabelIndex];

					distanceFromNextLabel = 0;

					//if (nextDataPoint.indexLabelTextBlock.y > currentDataPoint.indexLabelTextBlock.y)
					//	distanceFromNextLabel = (nextDataPoint.indexLabelTextBlock.y - (nextDataPoint.indexLabelTextBlock.height / 2)) - (currentDataPoint.indexLabelTextBlock.y + (currentDataPoint.indexLabelTextBlock.height / 2));
					//else
					//	distanceFromNextLabel = (currentDataPoint.indexLabelTextBlock.y - (currentDataPoint.indexLabelTextBlock.height / 2)) - (nextDataPoint.indexLabelTextBlock.y + (nextDataPoint.indexLabelTextBlock.height / 2));

					distanceFromNextLabel = getVerticalDistanceBetweenLabels(currentDataPoint, nextDataPoint);

					if (distanceFromNextLabel < 0 && areDataPointsTooClose(currentDataPoint, nextDataPoint)) {
							//if (distanceFromNextLabel < 0 && areDataPointsTooClose(currentDataPoint, nextDataPoint) ) {
						if (overlapStartIndex < 0)
							overlapStartIndex = k;

							if (nextLabelIndex !== overlapStartIndex) {
							overlapEndIndex = nextLabelIndex;

						totalOverlap += -distanceFromNextLabel;
							}

							if (k % Math.max(dataPoints.length / 10, 3) === 0)
								removeLabels = true;

						//nextDataPoint.indexLabelText = "";
						//nextDataPoint.indexLabelTextBlock.text = "";
						//nextDataPoint.indexLabelTextBlock.measureText();
					} else {

							removeLabels = true;
						}

						if (removeLabels) {

							if (totalOverlap > 0 && overlapStartIndex >= 0 && overlapEndIndex >= 0) {
							removeLabelsForSmallSegments(totalOverlap, overlapStartIndex, overlapEndIndex);

							overlapStartIndex = -1;
							overlapEndIndex = -1;
							totalOverlap = 0;
						}
					}
				}

				if (totalOverlap > 0)
					removeLabelsForSmallSegments(totalOverlap, overlapStartIndex, overlapEndIndex);
				}

				skipLabels();


			}
			//window.alert("next??");


			//resetAnimationFrame(_this.animationEnabled && _this.renderCount === 0 ? isCanvasSupported ? 60 : 30 : 1);
			//animate();

			//console.log("totalRecursions: " + totalRecursions);
		}


		this.pieDoughnutClickHandler = function (e) {

			if (_this.isAnimating) {
				return;
			}

			var i = e.dataPointIndex;
			var dataPoint = e.dataPoint;
			var dataSeries = this;


			var id = dataSeries.dataPointIds[i];

			//dataPointEO = _this._eventManager.objectMap[id];

			if (dataPoint.exploded)
				dataPoint.exploded = false;
			else
				dataPoint.exploded = true;


			// So that it doesn't try to explode when there is only one segment
			if (dataSeries.dataPoints.length > 1) {
				_this._animator.animate(0, explodeDuration, function (fractionComplete) {

					explodeToggle(fractionComplete);
					renderChartElementsInPlotArea();
					//console.log("Explode Start");

				});
			}

			return;
		}

		initLabels();

		positionLabels();
		positionLabels();
		positionLabels();
		positionLabels();

		this.disableToolTip = true;
		this._animator.animate(0, this.animatedRender ? this.animationDuration : 0, function (fractionComplete) {

			animate(fractionComplete);
			renderChartElementsInPlotArea();

		}, function () {

			_this.disableToolTip = false;
			_this._animator.animate(0, _this.animatedRender ? explodeDuration : 0, function (fractionComplete) {

				explodeToggle(fractionComplete);
				renderChartElementsInPlotArea();

			});

			//console.log("Animation Complete");
		});

		function renderChartElementsInPlotArea() {

			_this.plotArea.layoutManager.reset();

			if (_this._title) {
				if (_this._title.dockInsidePlotArea || (_this._title.horizontalAlign === "center" && _this._title.verticalAlign === "center"))
					_this._title.render();

			}

			if (_this.subtitles)
				for (var i = 0; i < _this.subtitles.length; i++) {
					var subtitle = _this.subtitles[i];
					if (subtitle.dockInsidePlotArea || (subtitle.horizontalAlign === "center" && subtitle.verticalAlign === "center"))
						subtitle.render();
				}

			if (_this.legend) {
				if (_this.legend.dockInsidePlotArea || (_this.legend.horizontalAlign === "center" && _this.legend.verticalAlign === "center"))
					_this.legend.render();
			}
		}

		//this.ctx.strokeRect(plotArea.x1 + 1, plotArea.y1, plotArea.width - 2, plotArea.height);
	}

	//#endregion pieChart


	//#endregion Render Methods
	Chart.prototype.animationRequestId = null;

	Chart.prototype.requestAnimFrame = (function () {
		return window.requestAnimationFrame ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame ||
				window.oRequestAnimationFrame ||
				window.msRequestAnimationFrame ||
				function (callback) {
					window.setTimeout(callback, 1000 / 60);
				};
	})();

	Chart.prototype.cancelRequestAnimFrame = (function () {
		return window.cancelAnimationFrame ||
			window.webkitCancelRequestAnimationFrame ||
			window.mozCancelRequestAnimationFrame ||
			window.oCancelRequestAnimationFrame ||
			window.msCancelRequestAnimationFrame ||
			clearTimeout
	})();

	Chart.prototype.getPercentAndTotal = function (ds, dp) {

		var dpX = null;
		var total = null;
		var percent = null;

		if (ds.type.indexOf("stacked") >= 0) {
			total = 0;
			dpX = dp.x.getTime ? dp.x.getTime() : dp.x;
			if (dpX in ds.plotUnit.yTotals) {
				total = ds.plotUnit.yTotals[dpX];

				if (!isNaN(dp.y)) {
				    if (total === 0)
				        percent = 0;
                    else
				        percent = (dp.y / total) * 100;
				}
				else
				    percent = 0;
			}
		} else if (ds.type === "pie" || ds.type === "doughnut") {
			total = 0;
			for (i = 0; i < ds.dataPoints.length; i++) {

				if (!isNaN(ds.dataPoints[i].y))
					total += ds.dataPoints[i].y;
			}

			if (!isNaN(dp.y))
				percent = (dp.y / total) * 100;
			else
				percent = 0;
		}

		return {
			percent: percent, total: total
		};
	}

	Chart.prototype.replaceKeywordsWithValue = function (str, dp, ds, dpIndex, indexKeywordValue) {
		//var regex = /\{\s*[a-zA-Z]+\s*\}|"[^"]*"|'[^']*'/g;
		var regex = /\{.*?\}|"[^"]*"|'[^']*'/g;
		var chart = this;
		indexKeywordValue = typeof (indexKeywordValue) === "undefined" ? 0 : indexKeywordValue;

		if ((ds.type.indexOf("stacked") >= 0 || (ds.type === "pie" || ds.type === "doughnut")) && (str.indexOf("#percent") >= 0 || str.indexOf("#total") >= 0)) {
			var percent = "#percent";
			var total = "#total";
			var dpX = null;

			var percentAndTotal = this.getPercentAndTotal(ds, dp);

			total = isNaN(percentAndTotal.total) ? total : percentAndTotal.total;
			percent = isNaN(percentAndTotal.percent) ? percent : percentAndTotal.percent;

			do {
				var percentFormatString = "";
				if (ds.percentFormatString)
					percentFormatString = ds.percentFormatString;
				else {
					percentFormatString = "#,##0.";
					var numberOfDecimals = Math.max(Math.ceil(Math.log(1 / Math.abs(percent)) / Math.LN10), 2);

					if (isNaN(numberOfDecimals) || !isFinite(numberOfDecimals))
						numberOfDecimals = 2;

					for (var n = 0; n < numberOfDecimals; n++) {
						percentFormatString += "#";
					}
				}

				str = str.replace("#percent", numberFormat(percent, percentFormatString, chart._cultureInfo));
				str = str.replace("#total", numberFormat(total, ds.yValueFormatString ? ds.yValueFormatString : "#,##0.########"));
			} while (str.indexOf("#percent") >= 0 || str.indexOf("#total") >= 0);
		}


		var fcn = function ($0) {
			if (($0[0] === "\"" && $0[$0.length - 1] === "\"") || ($0[0] === "\'" && $0[$0.length - 1] === "\'"))
				return $0.slice(1, $0.length - 1);

			var key = trimString($0.slice(1, $0.length - 1));
			key = key.replace("#index", indexKeywordValue);

			var index = null;

			try {
				var match = key.match(/(.*?)\s*\[\s*(.*?)\s*\]/);
				if (match && match.length > 0) {
					index = trimString(match[2]);
					key = trimString(match[1]);
				}
			} catch (e) {
			};


			var obj = null;

			if (key === "color") {
				return dp.color ? dp.color : ds.color ? ds.color : ds._colorSet[dpIndex % ds._colorSet.length];
			}

			if (dp.hasOwnProperty(key))
				obj = dp;
			else if (ds.hasOwnProperty(key))
				obj = ds;
			else return "";

			var value = obj[key];
			if (index !== null)
				value = value[index];

			if (key === "x") {
				if (chart.axisX && chart.plotInfo.axisXValueType === "dateTime")
					return dateFormat(value, dp.xValueFormatString ? dp.xValueFormatString : ds.xValueFormatString ? ds.xValueFormatString : chart.axisX && chart.axisX.valueFormatString ? chart.axisX.valueFormatString : "DD MMM YY", chart._cultureInfo);
				else
					return numberFormat(value, dp.xValueFormatString ? dp.xValueFormatString : ds.xValueFormatString ? ds.xValueFormatString : "#,##0.########", chart._cultureInfo);
			} else if (key === "y")
				return numberFormat(value, dp.yValueFormatString ? dp.yValueFormatString : ds.yValueFormatString ? ds.yValueFormatString : "#,##0.########", chart._cultureInfo);
			else if (key === "z")
				return numberFormat(value, dp.zValueFormatString ? dp.zValueFormatString : ds.zValueFormatString ? ds.zValueFormatString : "#,##0.########", chart._cultureInfo);
			else
				return value;
		}

		return str.replace(regex, fcn);
	}
