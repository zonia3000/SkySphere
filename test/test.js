const assert = require('assert');
const SkySphere = require('../src/SkySphere.js');
const JSDOM = require('jsdom').JSDOM;
const sinon = require('sinon');

const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><canvas id="sky"></canvas></body></html>');
global.window = dom.window;
global.document = dom.window.document;

global.window.requestAnimationFrame = function(callback) {
  callback();
};

let canvas = global.document.getElementById('sky');
let fakeContext = {
  clearRect() {},
  beginPath() {},
  arc() {},
  fill() {},
  stroke() {},
  moveTo() {},
  lineTo() {},
  strokeText() {},
  fillText() {}
};
sinon.stub(canvas, 'getContext');
canvas.getContext.withArgs('2d').returns(fakeContext);

let clock;
before(function() {
  clock = sinon.useFakeTimers();
});
after(function() {
  clock.restore();
});

describe('SkySphere', function() {

  describe('#rotateXY()', function() {
    it('should rotate the points on the sphere', function() {

      let sky = getSky();

      // Control point (at sphere centre)
      sky.addCustomObject(0, -90, {});

      let point = sky.objectPoints[0];
      assert.equal(point.x, 250);
      assert.equal(point.y, 250);

      sky.rotateXY(Math.PI / 2, 0);
      point = sky.objectPoints[0];
      assert.equal(point.x, 500);
      assert.equal(point.y, 250);

      sky.rotateXY(-Math.PI / 2, Math.PI / 2);
      point = sky.objectPoints[0];
      assert.equal(point.x, 250);
      assert.equal(point.y, 500);
    });
  });

  describe('mouse events', function() {
    it('should redraw the sphere when drag sequence is detected', function() {
      let sky = getSky();
      let drawSky = sinon.spy(sky, 'drawSky');
      // Control point (at sphere centre)
      sky.addCustomObject(0, -90, {});
      let point = sky.objectPoints[0];
      assert.equal(point.x, 250);
      assert.equal(point.y, 250);
      let startZ = point.z;

      canvas.dispatchEvent(getPositionalEvent('mousedown', 0, 0));
      assert.equal(sky.isMoving, true);
      window.dispatchEvent(getPositionalEvent('mousemove', 250, 250));
      window.dispatchEvent(getPositionalEvent('mouseup', 500, 500));
      assert.equal(sky.isMoving, false);

      point = sky.objectPoints[0];
      assert(point.x > 250);
      assert(point.y > 250);
      assert.notEqual(point.z, startZ);
      assert(drawSky.called);
    });

    it('should detect single click', function() {
      let clickCalled = false;
      let sky = getSky({
        customOnClick() {
          clickCalled = true;
        }
      });
      // Control point (at sphere centre)
      sky.addCustomObject(0, -90, {});
      canvas.dispatchEvent(getPositionalEvent('mousedown', 250, 250));
      window.dispatchEvent(getPositionalEvent('mousemove', 250, 250));
      window.dispatchEvent(getPositionalEvent('mouseup', 250, 250));
      assert(clickCalled);
    });

    it('should show object text on mouseover', function() {
      let sky = getSky({
        getObjectText() {
          return 'text';
        }
      });
      // Control point (at sphere centre)
      sky.addCustomObject(0, -90, {});
      let strokeText = sinon.spy(fakeContext, 'strokeText');
      canvas.dispatchEvent(getPositionalEvent('mousemove', 250, 250));
      assert(strokeText.called);
    });

    it('should zoom on mousewheel', function() {
      let sky = getSky();
      let zoom = sinon.spy(sky, 'zoom');
      let event = getPositionalEvent('mousewheel', 250, 250);
      event.wheelDeltaY = 1.1;
      canvas.dispatchEvent(event);
      assert(zoom.called);
    });
  });

  describe('#centerSkyPoint()', function() {
    it('should move the point until it is centered', function() {
      let sky = getSky();
      // control object
      sky.addCustomObject(4, -45, {});
      let point = sky.objectPoints[0];
      assert(Math.abs(point.x - 250) > 20);
      assert(Math.abs(point.y - 250) > 20);

      sky.centerSkyPoint(point);
      clock.tick(2000);

      assert(Math.abs(point.x - 250) < 20, point.x);
      assert(Math.abs(point.y - 250) < 20, point.y);
    });
  });

  describe('#zoom()', function() {
    it('should zoom', function() {
      let sky = getSky();
      // control object (on right border)
      sky.addCustomObject(0, 0, {});
      // control object (on left border)
      sky.addCustomObject(12, 0, {});
      let point1 = sky.objectPoints[0];
      assert.equal(point1.x, 500);
      assert.equal(point1.y, 250);
      let point2 = sky.objectPoints[1];
      assert.equal(point2.x, 0);
      assert.equal(Math.round(point2.y), 250);

      sky.zoom(2);

      assert.equal(sky.radius, 500);
      assert.equal(point1.x, 750);
      assert.equal(point1.y, 250);
      assert.equal(point2.x, -250);
      assert.equal(Math.round(point2.y), 250);
    });
  });

  describe('#setContainerSize()', function() {
    it('should change the container size', function() {
      let sky = getSky();
      let zoom = sinon.spy(sky, 'zoom');
      assert.equal(canvas.width, 500);
      assert.equal(canvas.height, 500);
      sky.setContainerSize(1000, 1000, true);
      assert.equal(canvas.width, 1000);
      assert.equal(canvas.height, 1000);
      assert(zoom.called);
    });
  });

  describe('#absoluteZoom()', function() {
    it('should call zoom()', function() {
      let sky = getSky();
      let zoom = sinon.spy(sky, 'zoom');
      sky.absoluteZoom(1);
      assert(zoom.called);
    });
  });

  describe('#rotateXYAnimation()', function() {
    it('should animate the rotation', function() {
      let sky = getSky();
      assert(!sky.isMoving);
      sky.rotateXYAnimation(0.5, 0.5);
      clock.tick(50);
      assert(sky.isMoving);
      sky.stopMoving();
      assert(!sky.isMoving);
    });
  });

  describe('#setRadius', function() {
    it('should call zoom() when radius change', function() {
      let sky = getSky();
      let zoom = sinon.spy(sky, 'zoom');
      sky.setRadius(300);
      assert(zoom.called);
    });
  });
});

function getSky(additionalOptions) {
  let options = {
    width: 500,
    height: 500,
    initialRadius: 250 // remove the padding => easy numbers
  };
  if (additionalOptions) {
    options = {
      ...options,
      ...additionalOptions
    };
  }
  return new SkySphere('sky', options);
}

function getPositionalEvent(eventName, x, y) {
  let event = new Event(eventName);
  event.clientX = x;
  event.clientY = y;
  return event;
}
