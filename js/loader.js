import { rgbToLab, labToRgb, hex } from './color.js';

var file2img = function(file) {
    // FIXME: uses unsafe inline image
    return new Promise((resolve, reject) => {
        var img = new Image();
        var url = URL.createObjectURL(file);

        img.onerror = err => {
            URL.revokeObjectURL(url);
            reject(err);
        };
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };

        img.src = url;
    });
};

var img2data = function(img, width) {
    var _canvas = document.createElement('canvas');
    _canvas.width = width;
    _canvas.height = Math.round(img.height / img.width * width);
    var _ctx = _canvas.getContext('2d');
    
    // Use better image interpolation for higher quality
    _ctx.imageSmoothingQuality = "high";
    _ctx.drawImage(img, 0, 0, _canvas.width, _canvas.height);
    return _ctx.getImageData(0, 0, _canvas.width, _canvas.height);
};


class Cluster {
    constructor(center, originalRgb) {
        this.center = center;
        this.originalRgb = originalRgb; // Store original RGB for better color reproduction
        this.count = 1;
    }

    distance(color) {
        // Improved color distance calculation with more weight on hue differences
        // This helps preserve distinct colors better
        const l1 = this.center[0];
        const a1 = this.center[1];
        const b1 = this.center[2];
        const l2 = color[0];
        const a2 = color[1];
        const b2 = color[2];
        
        // Standard CIELAB color difference with more weight on a,b components (color)
        // and less weight on L (lightness)
        return Math.sqrt(
            Math.pow(l1 - l2, 2) * 0.8 + 
            Math.pow(a1 - a2, 2) * 1.2 + 
            Math.pow(b1 - b2, 2) * 1.2
        );
    }

    add(color, originalRgb) {
        // Weighted average that preserves more of the color characteristics
        const totalWeight = this.count + 1;
        this.center = [
            (this.center[0] * this.count + color[0]) / totalWeight,
            (this.center[1] * this.count + color[1]) / totalWeight,
            (this.center[2] * this.count + color[2]) / totalWeight,
        ];
        
        // Update the original RGB using a weighted average too
        this.originalRgb = [
            (this.originalRgb[0] * this.count + originalRgb[0]) / totalWeight,
            (this.originalRgb[1] * this.count + originalRgb[1]) / totalWeight,
            (this.originalRgb[2] * this.count + originalRgb[2]) / totalWeight,
        ];
        
        this.count += 1;
    }
}

var analyze = function(img) {
    var j;
    var clusters = [];
    var out = [];
    
    // Use a lower threshold for higher color accuracy
    const colorThreshold = 0.05;  // Reduced from 0.08 to 0.05
    
    // First pass - gather all pixel data to array for faster processing
    const pixels = [];
    for (var i = 0; i < img.data.length; i += 4) {
        const r = img.data[i];
        const g = img.data[i + 1];
        const b = img.data[i + 2];
        const originalRgb = [r, g, b];
        const lab = rgbToLab(originalRgb);
        pixels.push({ lab, originalRgb, index: i/4 });
    }
    
    // Process all pixels
    for (const pixel of pixels) {
        const { lab, originalRgb, index } = pixel;
        
        // Try to find matching cluster
        let matched = false;
        for (j = 0; j < clusters.length; j++) {
            if (clusters[j].distance(lab) < colorThreshold) {
                clusters[j].add(lab, originalRgb);
                out[index] = j + 1;
                matched = true;
                break;
            }
        }
        
        // Create new cluster if no match
        if (!matched) {
            clusters.push(new Cluster(lab, originalRgb));
            out[index] = clusters.length;
        }
    }

    // Create colors array using original RGB values for better color accuracy
    var colors = ['white']; // Index 0 is reserved for background
    var contrasts = ['black'];
    
    for (j = 0; j < clusters.length; j++) {
        // Use original RGB for better color reproduction instead of converting lab back to rgb
        const clusterRgb = clusters[j].originalRgb.map(Math.round);
        colors.push(hex(clusterRgb));
        
        // Better contrast text color calculation based on perceived brightness
        const brightness = (clusterRgb[0] * 299 + clusterRgb[1] * 587 + clusterRgb[2] * 114) / 1000;
        contrasts.push(brightness < 128 ? 'white' : 'black');
    }

    return {
        width: img.width,
        height: img.height,
        colors: colors,
        contrasts: contrasts,
        data: out,
    };
};

export var loadImage = function(input, width) {
    return file2img(input.files[0]).then(img => {
        return analyze(img2data(img, width));
    });
};
