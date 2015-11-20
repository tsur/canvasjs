function PlotArea(chart, options) {
  PlotArea.base.constructor.call(this, options);

  this.chart = chart;
  this.canvas = chart.canvas;
  this.ctx = this.chart.ctx;
}
extend(PlotArea, CanvasJSObject);

PlotArea.prototype.render = function () {
  var freeSpace = this.chart.layoutManager.getFreeSpace();
  this.ctx.fillStyle = "red";
  this.ctx.fillRect(freeSpace.x1, freeSpace.y1, freeSpace.x2, freeSpace.y2);

}
