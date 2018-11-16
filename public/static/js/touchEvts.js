const scrollWheelZoomMultiplier = 1 / 20;

class TouchEvts {
  constructor(el, defaultTransform, callback, log = false) {
    this.callback = callback;
    this.logEvents = log;

    this.evCache = [];
    this.prevDiff = {
      xDist: -1, yDist: -1, xCent: -1, yCent: -1, xCent1P: -1, yCent1P: -1
    };
    this.defaultTransform = defaultTransform;
    this.currentTransform = defaultTransform;
    this.maxExtent = {
      kx: [1, 1],
      ky: [1, 1],
      x: [0, 0],
      y: [0, 0]
    };

    el.onpointerdown = (evt) => { evt.preventDefault(); this.pointerDownHandler(evt); };
    el.onpointermove = (evt) => { evt.preventDefault(); this.pointerMoveHandler(evt); };

    el.onpointerup = (evt) => { evt.preventDefault(); this.pointerUpHandler(evt); };
    el.onpointercancel = (evt) => { evt.preventDefault(); this.pointerUpHandler(evt); };
    el.onpointerout = (evt) => { evt.preventDefault(); this.pointerUpHandler(evt); };
    el.onpointerleave = (evt) => { evt.preventDefault(); this.pointerUpHandler(evt); };

    el.onwheel = (evt) => { evt.preventDefault(); this.mouseWheelHandler(evt); };
  }

  removeEvent(ev) {
    // Remove this event from the target's cache
    for (let i = 0; i < this.evCache.length; i++) {
      if (this.evCache[i].pointerId === ev.pointerId) {
        this.evCache.splice(i, 1);
        break;
      }
    }
  }

  enableLog() {
    this.logEvents = !this.logEvents;
  }

  log(prefix, ev) {
    if (!this.logEvents) return;
    console.log(`${prefix}: pointerID = ${ev.pointerId
    } ; pointerType = ${ev.pointerType
    } ; isPrimary = ${ev.isPrimary}`);
  }

  handleZoom(x0, y0, dX, dY, xCent, yCent) {
    let dkx = (1 + (dX / x0));
    let dky = (1 + (dY / y0));

    const newKx = this.currentTransform.kx * dkx;
    const newKy = this.currentTransform.ky * dky;

    if (newKx < this.maxExtent.kx[0]) {
      dkx = this.maxExtent.kx[0] / this.currentTransform.kx;
      this.currentTransform.kx = this.maxExtent.kx[0];
    } else if (newKx > this.maxExtent.kx[1]) {
      dkx = this.maxExtent.kx[1] / this.currentTransform.kx;
      this.currentTransform.kx = this.maxExtent.kx[1];
    } else {
      this.currentTransform.kx = newKx;
    }

    this.currentTransform.x = Math.min(Math.max(xCent - ((xCent - this.currentTransform.x) * (dkx)), this.maxExtent.x[0] * this.currentTransform.kx), this.maxExtent.x[1]);

    if (newKy < this.maxExtent.ky[0]) {
      dky = this.maxExtent.ky[0] / this.currentTransform.ky;
      this.currentTransform.ky = this.maxExtent.ky[0];
    } else if (newKy > this.maxExtent.ky[1]) {
      dky = this.maxExtent.ky[1] / this.currentTransform.ky;
      this.currentTransform.ky = this.maxExtent.ky[1];
    } else {
      this.currentTransform.ky = newKy;
    }

    this.currentTransform.y = Math.min(Math.max(yCent - ((yCent - this.currentTransform.y) * (dky)), this.maxExtent.y[0] * this.currentTransform.ky), this.maxExtent.y[1]);
  }

  handlePan(dX, dY) {
    this.currentTransform.x = Math.min(Math.max(dX + this.currentTransform.x, this.maxExtent.x[0] * this.currentTransform.kx), this.maxExtent.x[1]);
    this.currentTransform.y = Math.min(Math.max(dY + this.currentTransform.y, this.maxExtent.y[0] * this.currentTransform.ky), this.maxExtent.y[1]);
  }

  transformUpdated() {
    if (typeof this.callback === 'function') {
      this.callback(this.currentTransform);
    }
  }

  mouseWheelHandler(ev) {
    this.handleZoom(
      100,
      100,
      -ev.deltaY * scrollWheelZoomMultiplier,
      -ev.deltaY * scrollWheelZoomMultiplier,
      ev.clientX,
      ev.clientY
    );

    this.transformUpdated();
  }

  pointerDownHandler(ev) {
    this.evCache.push(ev);
    this.log('pointerDown', ev);
  }

  pointerMoveHandler(ev) {
    this.log('pointerMove', ev);

    // Find this event in the cache and update its record with this event
    for (let i = 0; i < this.evCache.length; i++) {
      if (ev.pointerId === this.evCache[i].pointerId) {
        this.evCache[i] = ev;
        break;
      }
    }

    const curDiff = {};

    // More than 2 pointers
    if (this.evCache.length >= 2) {
      curDiff.xDist = Math.max(Math.abs(this.evCache[0].clientX - this.evCache[1].clientX), 50);
      curDiff.yDist = Math.max(Math.abs(this.evCache[0].clientY - this.evCache[1].clientY), 50);

      curDiff.xCent = (this.evCache[0].clientX + this.evCache[1].clientX) / 2;
      curDiff.yCent = (this.evCache[0].clientY + this.evCache[1].clientY) / 2;

      // Handle zooming
      if (this.prevDiff.xDist > 0 && this.prevDiff.yDist > 0) {
        this.handleZoom(
          this.prevDiff.xDist,
          this.prevDiff.yDist,
          curDiff.xDist - this.prevDiff.xDist,
          curDiff.yDist - this.prevDiff.yDist,
          curDiff.xCent,
          curDiff.yCent
        );
      }

      // Handle panning
      if (this.prevDiff.xCent > 0 && this.prevDiff.yCent > 0) {
        this.handlePan(
          curDiff.xCent - this.prevDiff.xCent,
          curDiff.yCent - this.prevDiff.yCent
        );
      }

      this.transformUpdated();
      this.prevDiff = curDiff;

    // 1 Pointer
    } else if (this.evCache.length === 1) {
      curDiff.xCent1P = this.evCache[0].clientX;
      curDiff.yCent1P = this.evCache[0].clientY;

      // Handle panning
      if (this.prevDiff.xCent1P > 0 && this.prevDiff.yCent1P > 0) {
        this.handlePan(
          curDiff.xCent1P - this.prevDiff.xCent1P,
          curDiff.yCent1P - this.prevDiff.yCent1P
        );
      }

      this.transformUpdated();
      this.prevDiff = curDiff;
    }
  }

  pointerUpHandler(ev) {
    this.log(ev.type, ev);
    this.removeEvent(ev);

    // If the number of pointers down is less than two then reset diff tracker
    if (this.evCache.length < 2) this.prevDiff = {};
  }
}
