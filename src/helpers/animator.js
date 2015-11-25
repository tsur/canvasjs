export default {
  yScaleAnimation: function (fractionComplete, animationInfo) {
    if (fractionComplete === 0)
      return;

    var ctx = animationInfo.dest;
    var sourceCanvas = animationInfo.source.canvas;
    var base = animationInfo.animationBase;

    var offsetY = (base - base * fractionComplete);

    ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, 0, offsetY, ctx.canvas.width / devicePixelBackingStoreRatio, fractionComplete * ctx.canvas.height / devicePixelBackingStoreRatio);
  },
  xScaleAnimation: function (fractionComplete, animationInfo) {
    if (fractionComplete === 0)
      return;

    var ctx = animationInfo.dest;
    var sourceCanvas = animationInfo.source.canvas;
    var base = animationInfo.animationBase;

    var offsetX = (base - base * fractionComplete);

    ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, offsetX, 0, fractionComplete * ctx.canvas.width / devicePixelBackingStoreRatio, ctx.canvas.height / devicePixelBackingStoreRatio);
  },
  xClipAnimation: function (fractionComplete, animationInfo) {

    if (fractionComplete === 0)
      return;

    var ctx = animationInfo.dest;
    var sourceCanvas = animationInfo.source.canvas;

    ctx.save();

    if (fractionComplete > 0)
      ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width * fractionComplete, sourceCanvas.height, 0, 0, sourceCanvas.width * fractionComplete / devicePixelBackingStoreRatio, sourceCanvas.height / devicePixelBackingStoreRatio);

    ctx.restore();
  },
  fadeInAnimation: function (fractionComplete, animationInfo) {

    if (fractionComplete === 0)
      return;

    var ctx = animationInfo.dest;
    var sourceCanvas = animationInfo.source.canvas;

    ctx.save();

    ctx.globalAlpha = fractionComplete;

    ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, 0, 0, ctx.canvas.width / devicePixelBackingStoreRatio, ctx.canvas.height / devicePixelBackingStoreRatio);

    ctx.restore();
  },
  easing: {
    linear: function (t, b, c, d) {
      return c * t / d + b;
    },
    easeOutQuad: function (t, b, c, d) {
      return -c * (t /= d) * (t - 2) + b;
    },
    easeOutQuart: function (t, b, c, d) {
      return -c * ((t = t / d - 1) * t * t * t - 1) + b;
    },
    easeInQuad: function (t, b, c, d) {
      return c * (t /= d) * t + b;
    },
    easeInQuart: function (t, b, c, d) {
      return c * (t /= d) * t * t * t + b;
    }
  }
}
