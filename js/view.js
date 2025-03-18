export var throttle = function(fn) {
    var called = false;
    return function() {
        if (!called) {
            called = true;
            requestAnimationFrame(() => {
                called = false;
                fn.apply(this);
            });
        }
    };
};

export class View {
    constructor(canvas, frame) {
        this.canvas = canvas;
        this.frame = frame;
        this.ctx = canvas.getContext('2d');
        this.zoom = 1;
        this.dx = 0;
        this.dy = 0;
        this.mouse = null;
        this.prevMouse = null;
        this._pencil = 1;
        this.mousePosition = null; // Track current mouse position for cursor
    }

    get pencil() {
        return this._pencil;
    }

    set pencil(value) {
        this._pencil = value;
        this.frame.updateSelectedColor(value);
        this.frame.refreshHighlights();
        this.renderImmediate();
    }

    renderImmediate() {
        this.draw();

        this.dx = Math.min(this.dx, this.canvas.width / 2);
        this.dy = Math.min(this.dy, this.canvas.height / 2);
        this.dx = Math.max(this.dx, this.canvas.width / 2 - this.frame.canvas.width * this.zoom);
        this.dy = Math.max(this.dy, this.canvas.height / 2 - this.frame.canvas.height * this.zoom);

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(
            this.frame.canvas,
            this.dx,
            this.dy,
            this.frame.canvas.width * this.zoom,
            this.frame.canvas.height * this.zoom,
        );
        
        // Also draw the brush cursor in immediate renders
        this.drawBrushCursor();
    }

    refreshSize() {
        var rect = this.canvas.getBoundingClientRect();

        this.dx += (rect.width - this.canvas.width) / 2;
        this.dy += (rect.height - this.canvas.height) / 2;

        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        this.render();
    }

    reset() {
        this.zoom = this.canvas.height / this.frame.canvas.height * 0.8;
        this.dx = (this.canvas.width - this.frame.canvas.width * this.zoom) / 2;
        this.dy = (this.canvas.height - this.frame.canvas.height * this.zoom) / 2;
        this.mouse = null;
        this.prevMouse = null;
        this.pencil = 1;
        this.render();
    }

    toFrameXY(x, y) {
        var frame_x = (x - this.dx) / this.zoom / this.frame.pxsize;
        var frame_y = (y - this.dy) / this.zoom / this.frame.pxsize;

        return [frame_x, frame_y];
    }

    setZoom(stable_x, stable_y, zoom) {
        var [frame_x, frame_y] = this.toFrameXY(stable_x, stable_y);
        this.zoom = zoom;
        this.dx = stable_x - frame_x * zoom * this.frame.pxsize;
        this.dy = stable_y - frame_y * zoom * this.frame.pxsize;
        this.render();
    }

    transform(old1, old2, new1, new2, old_view) {
        var cx_old = (old1.x + old2.x) / 2;
        var cy_old = (old1.y + old2.y) / 2;
        var cx_new = (new1.x + new2.x) / 2;
        var cy_new = (new1.y + new2.y) / 2;

        var dx_old = old1.x - old2.x;
        var dy_old = old1.y - old2.y;
        var d_old = Math.sqrt(dx_old * dx_old + dy_old * dy_old);

        var dx_new = new1.x - new2.x;
        var dy_new = new1.y - new2.y;
        var d_new = Math.sqrt(dx_new * dx_new + dy_new * dy_new);

        // move center
        this.dx = old_view.dx + cx_new - cx_old;
        this.dy = old_view.dy + cy_new - cy_old;

        // change zoom and keep center
        this.zoom = old_view.zoom;
        this.setZoom(cx_new, cy_new, old_view.zoom * d_new / d_old);
    }

    draw() {
        if (this.mouse) {
            var [x, y] = this.toFrameXY(...this.mouse);
            if (this.prevMouse) {
                var [x2, y2] = this.toFrameXY(...this.prevMouse);
                this.frame.drawLine(x2, y2, x, y, this.pencil);
            } else {
                this.frame.setPixel(x, y, this.pencil);
            }
            this.prevMouse = this.mouse;
        }
    }

    resetDraw() {
        this.mouse = null;
        this.prevMouse = null;
    }

    render() {
        this.draw();

        this.dx = Math.min(this.dx, this.canvas.width / 2);
        this.dy = Math.min(this.dy, this.canvas.height / 2);
        this.dx = Math.max(this.dx, this.canvas.width / 2 - this.frame.canvas.width * this.zoom);
        this.dy = Math.max(this.dy, this.canvas.height / 2 - this.frame.canvas.height * this.zoom);

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(
            this.frame.canvas,
            this.dx,
            this.dy,
            this.frame.canvas.width * this.zoom,
            this.frame.canvas.height * this.zoom,
        );

        // Draw the brush cursor
        this.drawBrushCursor();
    }

    // Add a new method to draw the brush cursor
    drawBrushCursor() {
        if (!this.mousePosition || !this.frame.image) return;
        
        const [x, y] = this.mousePosition;
        
        // Calculate the brush size in pixels on screen
        const radius = Math.max(1, Math.floor(this.frame.brushSize / 2)) * this.frame.pxsize * this.zoom;
        
        // Draw a circle representing the brush size
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Draw an inner stroke for visibility on light backgrounds
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }
}

View.prototype.render = throttle(View.prototype.render);
