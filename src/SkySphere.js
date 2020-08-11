/**
 * Represents a sky map.
 * @module SkySphere
 * @private
 * @requires module:constellations
 * @returns {function} SkySphere constructor.
 */
define(['constellations'], function (constellations) {

    // Frame Per Second: used in browser that don't support requestAnimationFrame.
    var FPS = 15;

    var supportTouch = 'ontouchstart' in window || 'ontouchstart' in document.documentElement || navigator.maxTouchPoints > 0;
    var supportMouse = 'onmousemove' in window || 'onmousemove' in document.documentElement;
    if (!supportTouch && !supportMouse) {
        // assume at least mouse is supported
        supportMouse = true;
    }
    // Size of the sensitive area around a sky point that detects clicks.
    var area = supportTouch ? 15 : 6;

    // All created SkySpheres
    var instances = [];

    /**
     * Convert a declination angle from degree to radians (in range from 0 to 2PI).
     * @private
     * @param {float} dec - declination angle in degree (from -90 to 90).
     */
    function dec2rad(dec) {
        return (dec + 90) * 2 * Math.PI / 360;
    }

    /**
     * Convert a right ascension angle from degree to radians (in range from 0 to 2PI).
     * @private
     * @param {float} ra - right ascension angle in hours (from 0 to 24).
     */
    function ra2rad(ra) {
        return ra * 2 * Math.PI / 24;
    }

    var renew;
    var inStep = false;
    function step() {
        renew = false;

        for (var i = 0; i < instances.length; i++) {
            if (instances[i].isMoving) {
                renew = true;
                instances[i].drawSky();
            }
        }
        inStep = false;
    }

    function nextFrame() {
        if (!inStep) {
            inStep = true;
            if (window.requestAnimationFrame) {
                window.requestAnimationFrame(step);
            } else {
                setTimeout(step, 1000 / FPS);
            }
        } // else skip frame
    }

    /**
     * Represents a sky map.
     * @constructor
     * @alias SkySphere
     * @param {string} elementId - canvas id
     * @param {object} options - sky map options
     * @description Supported options:
     * <ul>
     * <li><strong>width</strong>: container width in pixels.</li>
     * <li><strong>height</strong>: container height in pixels.</li>
     * <li><strong>initialRadius</strong>: initial radius of the sphere in pixels.</li>
     * <li><strong>backgroundColor</strong>: sky background color in hexadecimal format.</li>
     * <li><strong>customOnClick</strong>: function to be executed when clicking on added custom objects.</li>
     * <li><strong>getObjectText</strong>: function used to retrieve text to display when mouse goes over a custom object.</li>
     * <li><strong>font</strong>: font setted on canvas.</li>
     * <li><strong>highlightColor</strong>: highlight color of object currently under cursor.</li>
     * <li><strong>highlightSize</strong>: width of highlight line.</li>
     * </ul>
     */
    function SkySphere(elementId, options) {
        this.options = options;
        this.init(elementId);
        instances.push(this);
    }

    SkySphere.prototype.zoomFactor = 1;
    SkySphere.prototype.starLines = [];
    SkySphere.prototype.starPoints = [];
    SkySphere.prototype.objectPoints = [];
    SkySphere.prototype.isMoving = false;
    SkySphere.prototype.overObjectIndex = null;

    SkySphere.prototype.init = function (elementId) {
        var self = this;

        this.canvas = document.getElementById(elementId);
        this.containerWidth = this.canvas.width = this.options.width || 400;
        this.containerHeight = this.canvas.height = this.options.height || this.containerWidth;

        this.radius = this.initialRadius = this.options.initialRadius || Math.min(this.containerWidth, this.containerHeight) * 0.45;

        this.context = this.canvas.getContext('2d');
        this.context.lineWidth = 1;

        // Generating the sky lines and points.

        var i, constellationLines = constellations.l, stars = constellations.s;
        for (i = 0; i < constellationLines.length; i++) {
            var star = stars[constellationLines[i][0]];
            var skyPoint1 = this.generateSkyPoint(star[0], star[1]);
            star = stars[constellationLines[i][1]];
            var skyPoint2 = this.generateSkyPoint(star[0], star[1]);
            this.starLines.push({skyPoint1: skyPoint1, skyPoint2: skyPoint2});
        }

        for (i = 0; i < stars.length; i++) {
            this.starPoints.push(this.generateSkyPoint(stars[i][0], stars[i][1]));
        }

        var clientRect, startX, startY, prevX, prevY, x, y, e;

        function startMove(event) {
            event.preventDefault();
            e = (event.touches && event.touches.length > 0) ? event.touches[0] : event;

            self.isMoving = true;

            prevX = startX = e.clientX;
            prevY = startY = e.clientY;

            clientRect = self.canvas.getBoundingClientRect();
            x = startX - clientRect.left;
            y = startY - clientRect.top;

            self.overObjectIndex = null;
            if (supportTouch) {
                window.addEventListener('touchmove', onMove, false);
                window.addEventListener('touchend', stopMove, false);
            }
            if (supportMouse) {
                window.addEventListener('mousemove', onMove, false);
                window.addEventListener('mouseup', stopMove, false);
            }
            nextFrame();
        }

        function onMove(event) {
            e = (event.touches && event.touches.length > 0) ? event.touches[0] : event;
            self.rotateXY((e.clientX - prevX) / self.radius, (e.clientY - prevY) / self.radius);
            prevX = e.clientX;
            prevY = e.clientY;
            nextFrame();
        }

        function stopMove() {
            self.isMoving = false;
            if(supportTouch) {
              window.removeEventListener('touchmove', onMove, false);
              window.removeEventListener('touchend', stopMove, false);
            }
            if(supportMouse) {
              window.removeEventListener('mousemove', onMove, false);
              window.removeEventListener('mouseup', stopMove, false);
            }

            if (prevX === startX && prevY === startY && self.options.customOnClick) {
                // single click detected!
                for (var i = 0; i < self.objectPoints.length; i++) {
                    var skyPoint = self.objectPoints[i];
                    if (Math.abs(skyPoint.x - x) < area && Math.abs(skyPoint.y - y) < area && skyPoint.z >= 0) {
                        self.options.customOnClick(skyPoint.data);
                        return;
                    }
                }
            }
        }

        if(supportTouch) {
          this.canvas.addEventListener('touchstart', startMove);
        }
        if(supportMouse) {
          this.canvas.addEventListener('mousedown', startMove);
        }

        function detectOver(event) {
            var e = (event.changedTouches && event.changedTouches.length > 0) ? event.changedTouches[0] : event;
            clientRect = self.canvas.getBoundingClientRect();
            var x = e.clientX - clientRect.left;
            var y = e.clientY - clientRect.top;

            var i = 0, overIndex = null;
            while (i < self.objectPoints.length && (overIndex === null)) {
                skyPoint = self.objectPoints[i];
                if (skyPoint.z > 0 && Math.abs(x - skyPoint.x) <= area && Math.abs(y - skyPoint.y) <= area) {
                    overIndex = i;
                }
                i++;
            }
            if (self.overObjectIndex !== overIndex) {
                self.overObjectIndex = overIndex;
                self.drawSky();
            }
        }

        if (supportTouch) {
            // for touch display the text after direct touch on object
            this.canvas.addEventListener('touchend', detectOver);
        }
        if (supportMouse) {
            // for mouse display the text on mouse over an object
            this.canvas.addEventListener('mousemove', detectOver);
        }

        this.canvas.addEventListener('mousewheel', function (e) {
            clientRect = self.canvas.getBoundingClientRect();
            var x = e.clientX - clientRect.left;
            var y = e.clientY - clientRect.top;

            if (Math.pow(x - self.containerWidth / 2, 2) + Math.pow(y - self.containerHeight / 2, 2) <= Math.pow(self.radius, 2)) {
                e.preventDefault();
                self.zoom(e.wheelDeltaY < 0 ? .9 : 1.1);
            }
        });
    };

    SkySphere.prototype.setRadius = function (radius) {
        this.zoom(radius / this.radius);
    };

    SkySphere.prototype.generateSkyPoint = function (ra, dec, data) {
        var skyPoint = {
            x: this.radius * Math.sin(dec) * Math.cos(ra) + this.containerWidth / 2,
            y: -this.radius * Math.sin(dec) * Math.sin(ra) + this.containerHeight / 2,
            z: this.radius * Math.cos(dec)
        };

        if (data !== undefined) {
            skyPoint.data = data;
        }

        return skyPoint;
    };

    /**
     * Draw constellations lines and stars and added custom objects.
     * @private
     */
    SkySphere.prototype.drawSky = function () {
        var context = this.context;
        var i, star, skyPoint, skyPoint1, skyPoint2, radius;

        context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        context.fillStyle = this.options.backgroundColor || '#000';
        context.strokeStyle = '#666';
        context.beginPath();
        context.arc(this.containerWidth / 2, this.containerHeight / 2, this.radius, 0, 2 * Math.PI, true);
        context.fill();
        context.stroke();

        context.strokeStyle = '#aaa';
        for (i = 0; i < this.starLines.length; i++) {
            star = this.starLines[i];
            skyPoint1 = star.skyPoint1;
            skyPoint2 = star.skyPoint2;
            if (skyPoint1.z > 0 && skyPoint2.z > 0) {
                context.beginPath();
                context.moveTo(Math.floor(skyPoint1.x), Math.floor(skyPoint1.y));
                context.lineTo(Math.floor(skyPoint2.x), Math.floor(skyPoint2.y));
                context.stroke();
            }
        }

        context.fillStyle = '#fff';
        for (i = 0; i < this.starPoints.length; i++) {
            skyPoint = this.starPoints[i];
            if (skyPoint.z >= 0) {
                context.beginPath();
                context.arc(Math.floor(skyPoint.x), Math.floor(skyPoint.y), 2, 0, 2 * Math.PI, true);
                context.fill();
            }
        }

        for (i = 0; i < this.objectPoints.length; i++) {
            skyPoint = this.objectPoints[i];
            if (skyPoint.z >= 0) {
                context.fillStyle = skyPoint.data.color || '#ff0000';
                context.beginPath();
                radius = skyPoint.data.radius || 2;
                context.arc(Math.floor(skyPoint.x), Math.floor(skyPoint.y), radius, 0, 2 * Math.PI, true);
                context.fill();
            }
        }

        if (this.overObjectIndex !== null) {
            var highlightSize = this.options.highlightSize || 3;
            context.lineWidth = highlightSize;

            // Draw highlighting circle on object under current mouse position
            skyPoint = this.objectPoints[this.overObjectIndex];
            context.strokeStyle = context.fillStyle = this.options.highlightColor || '#ffff00';
            context.beginPath();
            radius = skyPoint.data.radius || 2;
            context.arc(Math.floor(skyPoint.x), Math.floor(skyPoint.y), radius + highlightSize, 0, 2 * Math.PI, true);
            context.stroke();

            // Draw text beside highlighted object
            if (this.options.getObjectText) {
                context.font = this.options.font || "15px serif";
                var text = this.options.getObjectText(skyPoint.data);
                var textX = skyPoint.x + radius + highlightSize;
                var textY = skyPoint.y - radius - highlightSize;
                context.strokeStyle = '#000';
                context.strokeText(text, textX, textY);
                context.lineWidth = 1;
                context.fillText(text, textX, textY);
            }
            context.lineWidth = 1;
        }
    };

    /**
     * Apply a transformation to all elements of the sky.
     * @param {function} transform - function to apply to each sky point passed as argument.
     */
    SkySphere.prototype.applyTransform = function (transform) {
        var i;
        // Update constellation lines
        for (i = 0; i < this.starLines.length; i++) {
            var starLine = this.starLines[i];
            transform(starLine.skyPoint1);
            transform(starLine.skyPoint2);
        }
        // Update stars
        for (i = 0; i < this.starPoints.length; i++) {
            transform(this.starPoints[i]);
        }
        // Update custom objects
        for (i = 0; i < this.objectPoints.length; i++) {
            transform(this.objectPoints[i]);
        }
    };

    /**
     * Rotate the sphere using the mouse drag.
     * @private
     * @param {float} dx - position offset on x axis.
     * @param {float} dy - position offset on y axis.
     */
    SkySphere.prototype.rotateXY = function (dx, dy) {
        var x, y, z, k;

        var sindx = Math.sin(dx), cosdx = Math.cos(dx), sindy = Math.sin(dy), cosdy = Math.cos(dy);

        var centerX = this.containerWidth / 2;
        var centerY = this.containerHeight / 2;

        this.applyTransform(function (skyPoint) {
            x = skyPoint.x - centerX;
            y = -skyPoint.y + centerY;
            z = skyPoint.z;

            k = z * cosdx - x * sindx;
            skyPoint.x = x * cosdx + z * sindx + centerX;
            skyPoint.y = sindy * k - y * cosdy + centerY;
            skyPoint.z = y * sindy + cosdy * k;
        });
    };

    SkySphere.prototype._currentAnimationTimeout = null;

    /**
     * Show an animation that move a sky point to the center of the sphere, first horizontally, then vertically.
     * @param {object} skyPoint - the point to center.
     */
    SkySphere.prototype.centerSkyPoint = function (skyPoint) {
        var self = this;

        // If we want to center a point while another point is already centering we have to stop previous animations.
        this.stopMoving();

        var centerX = this.containerWidth / 2;
        var centerY = this.containerHeight / 2;
        var dx = skyPoint.x < centerX ? .05 : -.05;
        var dy = skyPoint.y > centerY ? .05 : -.05;

        function moveXUntilCenter() {
            var x = skyPoint.x - centerX;
            if (x !== 0 && (dx > 0 && x < 0) || (dx < 0 && x > 0)) {
                self.rotateXY(dx, 0);
                self._currentAnimationTimeout = setTimeout(moveXUntilCenter, 32);
            } else {
                moveYUntilCenter();
            }
            nextFrame();
        }
        function moveYUntilCenter() {
            var y = -skyPoint.y + centerY;
            if (y !== 0 && (dy > 0 && y < 0) || (dy < 0 && y > 0)) {
                self.rotateXY(0, -dy);
                self._currentAnimationTimeout = setTimeout(moveYUntilCenter, 32);
                nextFrame();
            } else {
                self.isMoving = false;
            }
        }

        this.isMoving = true;
        moveXUntilCenter();
    };


    SkySphere.prototype.stopMoving = function () {
        if (this._currentAnimationTimeout) {
            clearTimeout(this._currentAnimationTimeout);
            this.isMoving = true;
        }
    };

    SkySphere.prototype.rotateXYAnimation = function (dx, dy) {
        this.stopMoving();
        this.isMoving = true;

        var self = this;
        function rotateAnimation() {
            self.rotateXY(dx, dy);
            self.drawSky();
            nextFrame();
        }

        this._currentAnimationTimeout = setInterval(rotateAnimation, 32);
    };

    /**
     * Zoom the sphere multiplying the current radius to the zoomFactor.
     * @param {float} zoomFactor
     */
    SkySphere.prototype.zoom = function (zoomFactor) {
        var self = this;

        this.radius = this.radius * zoomFactor;

        var centerX = this.containerWidth / 2;
        var centerY = this.containerHeight / 2;
        this.applyTransform(function (skyPoint) {
            self.zoomFactor = zoomFactor;
            skyPoint.x = zoomFactor * (skyPoint.x - centerX) + centerX;
            skyPoint.y = zoomFactor * (skyPoint.y - centerY) + centerY;
            skyPoint.z = zoomFactor * skyPoint.z;
        });

        this.drawSky();
    };

    /**
     * Zoom the sphere relying on its initial radius.
     * @param {float} zoomFactor
     */
    SkySphere.prototype.absoluteZoom = function (zoomFactor) {
        this.zoom((this.initialRadius * zoomFactor) / this.radius);
    };

    /**
     * Change the container size and rescale the sky.
     * @param {int} width - new width of the container.
     * @param {int} height - new height of the container.
     * @param {bool} resize - optional param to indicate if we want to adapt the sphere to the container size after container resizing.
     * @param {float} paddingPercentage - percentage (from 0 to 1) of canvas size to leave empty between sphere and container border.
     */
    SkySphere.prototype.setContainerSize = function (width, height, resize, paddingPercentage) {
        var offsetX = (width - this.containerWidth) / 2;
        var offsetY = (height - this.containerHeight) / 2;

        this.canvas.width = this.containerWidth = width;
        this.canvas.height = this.containerHeight = height;

        this.applyTransform(function (skyPoint) {
            skyPoint.x += offsetX;
            skyPoint.y += offsetY;
        });

        if (resize) {
            this.zoom(Math.min(width, height) * (paddingPercentage || 0.9) / (2 * this.radius));
        }
    };

    /**
     * Add a custom object point.
     * @param {float} ra - Right Ascension (in hours, from 0 to 24)
     * @param {float} dec - Declination (in degree, from -90 to 90)
     * @param {object} data - custom optional data to add to the object.
     * @returns {object} the generated sky point.
     * @description The "data" option is an object that supports this properties:
     * <ul>
     * <li><strong>color</strong>: custom color in hexadecimal format (default is '#ff0000').</li>
     * <li><strong>radius</strong>: radius in pixels (default is 2).</li>
     * <li><strong>custom properties</strong>: properties that could be used inside <strong>customOnClick</strong> or <strong>getObjectText</strong> functions.</li>
     * </ul>
     */
    SkySphere.prototype.addCustomObject = function (ra, dec, data) {
        var skyPoint = this.generateSkyPoint(ra2rad(ra), dec2rad(dec), data);
        this.objectPoints.push(skyPoint);
        return skyPoint;
    };

    return SkySphere;
});
