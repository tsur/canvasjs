/**
* @preserve CanvasJS HTML5 & JavaScript Charts - v1.8.0 Beta 2 - http://canvasjs.com/
* Copyright 2013 fenopix
*/

/*
* CanvasJS Charts follows Dual Licensing Model as mentioned below.
*
* ---------------------Free for Non-Commercial Use--------------------
*
* For non-commercial purposes you can use the software for free under Creative Commons Attribution-NonCommercial 3.0 License. Refer to the following link for further details on the same.
*     http://creativecommons.org/licenses/by-nc/3.0/deed.en_US
*
* ---------------------Commercial License--------------------
* Commercial use of CanvasJS requires you to purchase a license. Without a commercial license you can use it for evaluation purposes only. Please refer to the following link for further details.
*     http://canvasjs.com/
*
*/

var CanvasJS = {

  Chart: function (containerId, options) {
    var _chart = new Chart(containerId, options, this);

    this.render = function () {
      _chart.render(this.options)
    };
    //console.log(_chart);
    this.options = _chart._options;
  },
  addColorSet: function (name, colorSet) {
    colorSets[name] = colorSet;
  },
  addCultureInfo: function (name, cultureInfo) {
    cultures[name] = cultureInfo;
  },
  formatNumber: function (number, formatString, culture) {
    culture = culture || "en";
    formatString = formatString || "#,##0.##";

    if (!cultures[culture])
      throw "Unknown Culture Name";
    else {
      return numberFormat(number, formatString, new CultureInfo(culture));
    }
  },
  formatDate: function (date, formatString, culture) {
    culture = culture || "en";
    formatString = formatString || "DD MMM YYYY";

    if (!cultures[culture])
      throw "Unknown Culture Name";
    else {
      return dateFormat(date, formatString, new CultureInfo(culture));
    }
  }

}

CanvasJS.Chart.version = "v1.8.0 Beta 2";

export default CanvasJS;
