export class Frame {
    constructor() {
        this.pxsize = 12;
        this.image = null;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.selectedColor = 1;
        this.colorState = null;
        this.brushSize = 1; // Default brush size is 1 (single pixel)
        this.progressCallback = null; // Callback for progress updates
    }

    setImage(image) {
        this.image = image;
        if (this.image) {
            this.canvas.width = image.width * this.pxsize;
            this.canvas.height = image.height * this.pxsize;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.colorState = new Array(image.width * image.height).fill(0);
            this.fill(0);
        }
    }

    _setPixel(x, y, color) {
        var i = y * this.image.width + x;
        
        this.ctx.fillStyle = this.image.colors[this.colorState[i]];
        this.ctx.fillRect(
            x * this.pxsize,
            y * this.pxsize,
            this.pxsize,
            this.pxsize,
        );

        if (this.image.data[i] === this.selectedColor && this.colorState[i] === 0) {
            this.ctx.fillStyle = 'rgba(128, 128, 128, 0.55)';
            this.ctx.fillRect(
                x * this.pxsize,
                y * this.pxsize,
                this.pxsize,
                this.pxsize,
            );
        }

        if (this.colorState[i] !== this.image.data[i]) {
            this.ctx.fillStyle = this.image.contrasts[this.colorState[i]];
            this.ctx.fillText(
                this.image.data[i],
                (x + 0.5) * this.pxsize,
                (y + 0.5) * this.pxsize,
            );
        }
    }

    setPixel(x, y, color) {
        if (!this.image) return;
        
        let changed = false;
        // Convert to integer coordinates
        const centerX = Math.floor(x);
        const centerY = Math.floor(y);
        
        // Calculate brush radius - make it at least 0
        const radius = Math.max(0, Math.floor(this.brushSize / 2));
        
        // For each pixel in the brush area
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                // Calculate the actual pixel coordinates
                const pixelX = centerX + dx;
                const pixelY = centerY + dy;
                
                // Skip pixels outside the image bounds
                if (pixelX < 0 || pixelX >= this.image.width || 
                    pixelY < 0 || pixelY >= this.image.height) {
                    continue;
                }
                
                // Get the index in the data array
                const i = pixelY * this.image.width + pixelX;
                
                // Only color if the number matches the selected color
                if (this.image.data[i] === color) {
                    // Only update if the color has changed
                    if (this.colorState[i] !== color) {
                        changed = true;
                        // Update the color state
                        this.colorState[i] = color;
                        // Update the display
                        this._setPixel(pixelX, pixelY, color);
                    }
                }
            }
        }
        
        // Notify progress change if needed
        if (changed) {
            this.notifyProgress();
        }
    }

    updateSelectedColor(color) {
        this.selectedColor = color;
        this.refreshHighlights();
    }

    refreshHighlights() {
        if (this.image) {
            for (var y = 0; y < this.image.height; y++) {
                for (var x = 0; x < this.image.width; x++) {
                    this._setPixel(x, y, this.colorState[y * this.image.width + x]);
                }
            }
        }
    }

    fill(color) {
        if (this.image) {
            for (var y = 0; y < this.image.height; y++) {
                for (var x = 0; x < this.image.width; x++) {
                    const i = y * this.image.width + x;
                    this.colorState[i] = color;
                    this._setPixel(x, y, color);
                }
            }
        }
    }

    fillAllMatching(color) {
        if (this.image) {
            let changed = false;
            for (var y = 0; y < this.image.height; y++) {
                for (var x = 0; x < this.image.width; x++) {
                    const i = y * this.image.width + x;
                    if (this.image.data[i] === color && this.colorState[i] === 0) {
                        this.colorState[i] = color;
                        changed = true;
                    }
                }
            }
            if (changed) {
                this.refreshHighlights();
            }
        }
    }

    drawLine(x1, y1, x2, y2, color) {
        if (!this.image) return;
        
        // If points are very close, just call setPixel once
        var dx = Math.abs(x1 - x2);
        var dy = Math.abs(y1 - y2);
        
        if (dx === 0 && dy === 0) {
            this.setPixel(x1, y1, color);
            return;
        }
        
        // Use more points for larger brushes to avoid gaps
        const stepSize = 0.5 / Math.max(1, this.brushSize / 2);
        
        // Draw line with more points in the longest dimension
        if (dx > dy) {
            // Get slope
            const slope = (y1 - y2) / (x1 - x2);
            
            // Swap if needed to ensure x1 < x2
            if (x1 > x2) {
                [x1, x2] = [x2, x1];
                [y1, y2] = [y2, y1];
            }
            
            // Draw all points along the line with smaller steps for larger brushes
            for (let x = x1; x <= x2; x += stepSize) {
                const y = slope * (x - x1) + y1;
                this.setPixel(x, y, color);
            }
        } else {
            // Get slope
            const slope = (x1 - x2) / (y1 - y2);
            
            // Swap if needed to ensure y1 < y2
            if (y1 > y2) {
                [x1, x2] = [x2, x1];
                [y1, y2] = [y2, y1];
            }
            
            // Draw all points along the line with smaller steps for larger brushes
            for (let y = y1; y <= y2; y += stepSize) {
                const x = slope * (y - y1) + x1;
                this.setPixel(x, y, color);
            }
        }
    }

    fillAll() {
        if (!this.image) return;
        
        console.log("Starting fillAll");
        
        // Create a temporary canvas to draw the finished image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw each cell with its correct color
        for (let y = 0; y < this.image.height; y++) {
            for (let x = 0; x < this.image.width; x++) {
                const i = y * this.image.width + x;
                const colorIndex = this.image.data[i];
                
                // Update color state
                this.colorState[i] = colorIndex;
                
                // Draw the pixel directly
                tempCtx.fillStyle = this.image.colors[colorIndex];
                tempCtx.fillRect(
                    x * this.pxsize,
                    y * this.pxsize,
                    this.pxsize,
                    this.pxsize
                );
            }
        }
        
        // Copy the completed image to the main canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(tempCanvas, 0, 0);
        
        // Notify progress is 100%
        this.notifyProgress();
        
        console.log("Completed fillAll");
    }

    // Add method to get completion percentage
    getCompletionPercentage() {
        if (!this.image || !this.colorState) return 0;
        
        const totalPixels = this.colorState.length;
        let correctlyColoredPixels = 0;
        
        for (let i = 0; i < totalPixels; i++) {
            // A pixel is correctly colored if its color matches the target or if it's colored with any non-zero value
            if (this.colorState[i] !== 0) {
                correctlyColoredPixels++;
            }
        }
        
        return (correctlyColoredPixels / totalPixels) * 100;
    }
    
    // Register a progress callback
    setProgressCallback(callback) {
        this.progressCallback = callback;
    }
    
    // Notify progress changes
    notifyProgress() {
        if (this.progressCallback) {
            const percentage = this.getCompletionPercentage();
            this.progressCallback(percentage);
        }
    }
}