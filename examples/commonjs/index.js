var CanvasJS = require("canvasjs");

window.onload = function() {
  var chart = new CanvasJS.Chart("chartContainer", {
    title: {
      text: "Fruits sold in First Quarter"
    },
    data: [
      //array of dataSeries
      {
        //dataSeries object

        /*** Change type "column" to "bar", "area", "line" or "pie"***/
        type: "area",
        dataPoints: [
          { label: "banana", y: 18 },
          { label: "orange", y: 29 },
          { label: "apple", y: 40 },
          { label: "mango", y: 34 },
          { label: "grape", y: 24 }
        ]
      }
    ]
  });

  chart.render();
};
