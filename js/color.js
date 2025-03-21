var srgbToRgb = function(c) {
    var x = c / 255;
    if (x < 0.04045) {
        return x / 12.92;
    } else {
        return Math.pow((x + 0.055) / 1.055, 2.4);
    }
};

var rgbToSrgb = function(c) {
    var x;
    if (c < 0.04045 / 12.92) {
        x = c * 12.92;
    } else {
        x = Math.pow(c, 1 / 2.4) * 1.055 - 0.055;
    }
    x = Math.min(Math.max(0, x), 1);
    return x * 255;
};

export var rgbToLab = function(srgb) {
    var [r, g, b] = srgb.map(srgbToRgb);

    var l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    var m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    var s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

    l = Math.cbrt(l);
    m = Math.cbrt(m);
    s = Math.cbrt(s);

    return [
        0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
    ];
};

export var labToRgb = function(lab) {
    var l = lab[0] + 0.3963377774 * lab[1] + 0.2158037573 * lab[2];
    var m = lab[0] - 0.1055613458 * lab[1] - 0.0638541728 * lab[2];
    var s = lab[0] - 0.0894841775 * lab[1] - 1.2914855480 * lab[2];

    l = l * l * l;
    m = m * m * m;
    s = s * s * s;

    var rgb = [
        +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    ];

    return rgb.map(rgbToSrgb);
};

export var hex = function(rgb) {
    // Ensure RGB values are within valid range 0-255
    const r = Math.max(0, Math.min(255, Math.round(rgb[0])));
    const g = Math.max(0, Math.min(255, Math.round(rgb[1])));
    const b = Math.max(0, Math.min(255, Math.round(rgb[2])));
    
    // Convert to hex with proper zero padding
    return '#' + 
        r.toString(16).padStart(2, '0') +
        g.toString(16).padStart(2, '0') +
        b.toString(16).padStart(2, '0');
};

