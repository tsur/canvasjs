function CultureInfo(culture) {

  var cultureInfo;

  if (culture && cultures[culture])
    cultureInfo = cultures[culture];

  CultureInfo.base.constructor.call(this, "CultureInfo", cultureInfo);
}

extend(CultureInfo, CanvasJSObject);
