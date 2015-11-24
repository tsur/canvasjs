//#region Animator


function Animator(chart) {

  this.chart = chart;
  this.ctx = this.chart.plotArea.ctx;
  this.animations = [];
  this.animationRequestId = null;
}

//Animator.prototype.animate = function (duration, base, dest, source, animationCallback, onComplete) {
Animator.prototype.animate = function (startDelay, duration, animationCallback, onComplete, easingFunction) {
  var _this = this;

  this.chart.isAnimating = true;
  easingFunction = easingFunction || AnimationHelper.easing.linear;

  if (animationCallback) {

    this.animations.push({
      startTime: (new Date()).getTime() + (startDelay ? startDelay : 0),
      duration: duration,
      animationCallback: animationCallback,
      onComplete: onComplete
    });
  }

  var remainingAnimations = [];

  while (this.animations.length > 0) {

    var animation = this.animations.shift();
    var now = (new Date()).getTime();
    var fractionComplete = 0;
    //var fractionComplete = Math.min(((new Date()).getTime() - animation.startTime) / animation.duration, 1);

    if (animation.startTime <= now) {
      fractionComplete = easingFunction(Math.min((now - animation.startTime), animation.duration), 0, 1, animation.duration);
      //var fractionComplete = AnimationHelper.easing.easeOutQuad(Math.min(((new Date()).getTime() - animation.startTime), animation.duration), 0, 1, animation.duration);

      fractionComplete = Math.min(fractionComplete, 1);

      if (isNaN(fractionComplete) || !isFinite(fractionComplete))
        fractionComplete = 1;
    }

    if (fractionComplete < 1) {
      remainingAnimations.push(animation);
    }

    animation.animationCallback(fractionComplete);

    if (fractionComplete >= 1 && animation.onComplete)
      animation.onComplete();
  }

  this.animations = remainingAnimations;

  if (this.animations.length > 0) {
    this.animationRequestId = this.chart.requestAnimFrame.call(window, function () {
      _this.animate.call(_this);
    });
  } else {
    this.chart.isAnimating = false;
  }

}

Animator.prototype.cancelAllAnimations = function () {

  this.animations = [];

  if (this.animationRequestId) {
    this.chart.cancelRequestAnimFrame.call(window, this.animationRequestId);
  }

  this.animationRequestId = null;
  this.chart.isAnimating = false;
}

var AnimationHelper = {
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

export default Animator;
