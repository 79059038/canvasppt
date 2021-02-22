import {radiansToDegrees} from '../util/misc';
import {PPTCanvas} from '../HEADER';
import Point from '../publicClass/point.class.js';

const skewMap = ['ns', 'nesw', 'ew', 'nwse'];
const scaleMap = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne', 'e'];
const LEFT = 'left', TOP = 'top', RIGHT = 'right', BOTTOM = 'bottom', CENTER = 'center';
const opposite = {
    top: BOTTOM,
    bottom: TOP,
    left: RIGHT,
    right: LEFT,
}

const sign = (Math.sign || function(x) { return ((x > 0) - (x < 0)) || +x; })

export function fireEvent(eventName, options) {
    const target = options.transform.target;
    const canvas = target.canvas;
    const canasOptions = Object.assign({}, options, { target: target });
    canvas && canvas.fire('object:' + eventName, canasOptions);
    target.fire(eventName, options);
};

export function scaleSkewCursorStyleHandler(eventData, corner, fabricObject) {
    if (eventData[fabricObject.canvas.altActionKey]) {
        return skewCursorStyleHandler(eventData, corner, fabricObject);
      }
      return scaleCursorStyleHandler(eventData, corner, fabricObject);
}

export function skewCursorStyleHandler(eventData, corner, fabricObject) {
    const notAllowed = 'not-allowed';
    if (corner.x !== 0 && fabricObject.lockSkewingY) {
        return notAllowed;
    }
    if (corner.y !== 0 && fabricObject.lockSkewingX) {
        return notAllowed;
    }
    const n = findCornerQuadrant(fabricObject, corner) % 4;
    return skewMap[n] + '-resize';
}

export function findCornerQuadrant(fabricObject, corner) {
    var cornerAngle = fabricObject.angle + radiansToDegrees(Math.atan2(corner.y, corner.x)) + 360;
    return Math.round((cornerAngle % 360) / 45);
}

export function scaleCursorStyleHandler(eventData, corner, fabricObject) {
    const notAllowed = 'not-allowed';
    const scaleProportionally = scaleIsProportional(eventData, fabricObject);
    let by = '';
    if (corner.x !== 0 && corner.y === 0) {
      by = 'x';
    }
    else if (corner.x === 0 && corner.y !== 0) {
      by = 'y';
    }
    if (scalingIsForbidden(fabricObject, by, scaleProportionally)) {
      return notAllowed;
    }
    var n = findCornerQuadrant(fabricObject, corner);
    return scaleMap[n] + '-resize';
}

export function scaleIsProportional(eventData, fabricObject) {
    const canvas = fabricObject.canvas;
    const uniScaleKey = canvas.uniScaleKey;
    const uniformIsToggled = eventData[uniScaleKey];
    return (canvas.uniformScaling && !uniformIsToggled) ||
    (!canvas.uniformScaling && uniformIsToggled);
}

export function scalingIsForbidden(fabricObject, by, scaleProportionally) {
    const lockX = fabricObject.lockScalingX, lockY = fabricObject.lockScalingY;
    if (lockX && lockY) {
        return true;
    }
    if (!by && (lockX || lockY) && scaleProportionally) {
        return true;
    }
    if (lockX && by === 'x') {
        return true;
    }
    if (lockY && by === 'y') {
        return true;
    }
    return false;
}

export function scalingXOrSkewingY(eventData, transform, x, y) {
    // ok some safety needed here.
    if (eventData[transform.target.canvas.altActionKey]) {
      return skewHandlerY(eventData, transform, x, y);
    }
    return scalingX(eventData, transform, x, y);
}

export function skewHandlerY(eventData, transform, x, y) {
    // step1 figure out and change transform origin.
    // if skewY > 0 and originX left we anchor on top
    // if skewY > 0 and originX right we anchor on bottom
    // if skewY < 0 and originX left we anchor on bottom
    // if skewY < 0 and originX right we anchor on top
    // if skewY is 0, we look for mouse position to understand where are we going.
    const target = transform.target;
    const currentSkew = target.skewY;
    let originY;
    const originX = transform.originX;
    if (target.lockSkewingY) {
      return false;
    }
    if (currentSkew === 0) {
        const localPointFromCenter = getLocalPoint(transform, CENTER, CENTER, x, y);
        if (localPointFromCenter.y > 0) {
        // we are pulling down, anchor up;
            originY = TOP;
        }
        else {
            // we are pulling up, anchor down
            originY = BOTTOM;
        }
    }
    else {
        if (currentSkew > 0) {
            originY = originX === LEFT ? TOP : BOTTOM;
        }
        if (currentSkew < 0) {
            originY = originX === LEFT ? BOTTOM : TOP;
        }
        // is the object flipped on one side only? swap the origin.
        if (targetHasOneFlip(target)) {
            originY = originY === TOP ? BOTTOM : TOP;
        }
    }

    // once we have the origin, we find the anchor point
    transform.originY = originY;
    const finalHandler = wrapWithFixedAnchor(skewObjectY);
    return finalHandler(eventData, transform, x, y);
}

// writing a skewX only action, try to generalize later
function skewHandlerX(eventData, transform, x, y) {
    // step1 figure out and change transform origin.
    // if skewX > 0 and originY bottom we anchor on right
    // if skewX > 0 and originY top we anchor on left
    // if skewX < 0 and originY bottom we anchor on left
    // if skewX < 0 and originY top we anchor on right
    // if skewX is 0, we look for mouse position to understand where are we going.
    const target = transform.target;
    const currentSkew = target.skewX;
    let originX;
    const originY = transform.originY;
    if (target.lockSkewingX) {
      return false;
    }
    if (currentSkew === 0) {
        const localPointFromCenter = getLocalPoint(transform, CENTER, CENTER, x, y);
        if (localPointFromCenter.x > 0) {
            // we are pulling right, anchor left;
            originX = LEFT;
        }
        else {
            // we are pulling right, anchor right
            originX = RIGHT;
        }
    }
    else {
        if (currentSkew > 0) {
            originX = originY === TOP ? LEFT : RIGHT;
        }
        if (currentSkew < 0) {
            originX = originY === TOP ? RIGHT : LEFT;
        }
        // is the object flipped on one side only? swap the origin.
        if (targetHasOneFlip(target)) {
            originX = originX === LEFT ? RIGHT : LEFT;
        }
    }

    // once we have the origin, we find the anchor point
    transform.originX = originX;
    var finalHandler = wrapWithFixedAnchor(skewObjectX);
    return finalHandler(eventData, transform, x, y);
}

export function getLocalPoint(transform, originX, originY, x, y) {
    const target = transform.target,
        control = target.__static_controls[transform.corner],
        zoom = target.canvas.getZoom(),
        padding = target.padding / zoom,
        localPoint = target.toLocalPoint(new Point(x, y), originX, originY);
    if (localPoint.x >= padding) {
        localPoint.x -= padding;
    }
    if (localPoint.x <= -padding) {
        localPoint.x += padding;
    }
    if (localPoint.y >= padding) {
        localPoint.y -= padding;
    }
    if (localPoint.y <= padding) {
        localPoint.y += padding;
    }
    localPoint.x -= control.offsetX;
    localPoint.y -= control.offsetY;
    return localPoint;
}

export function targetHasOneFlip(target) {
    return (target.flipX && !target.flipY) || (!target.flipX && target.flipY);
}

export function wrapWithFixedAnchor(actionHandler) {
    return function(eventData, transform, x, y) {
        const target = transform.target,
            centerPoint = target.getCenterPoint(),
            constraint = target.translateToOriginPoint(centerPoint, transform.originX, transform.originY),
            actionPerformed = actionHandler(eventData, transform, x, y);
        target.setPositionByOrigin(constraint, transform.originX, transform.originY);
        return actionPerformed;
    };
}

export function skewObjectY(eventData, transform, x, y) {
    const target = transform.target;
    // find how big the object would be, if there was no skewX. takes in account scaling
    const dimNoSkew = target._getTransformedDimensions(target.skewX, 0);
    const localPoint = getLocalPoint(transform, transform.originX, transform.originY, x, y);
    // the mouse is in the center of the object, and we want it to stay there.
    // so the object will grow twice as much as the mouse.
    // this makes the skew growth to localPoint * 2 - dimNoSkew.
    const totalSkewSize = Math.abs(localPoint.y * 2) - dimNoSkew.y;
    const currentSkew = target.skewY
    let newSkew;
    if (totalSkewSize < 2) {
        // let's make it easy to go back to position 0.
        newSkew = 0;
    }
    else {
        newSkew = radiansToDegrees(
            Math.atan2((totalSkewSize / target.scaleY), (dimNoSkew.x / target.scaleX))
        );
        // now we have to find the sign of the skew.
        // it mostly depend on the origin of transformation.
        if (transform.originX === LEFT && transform.originY === BOTTOM) {
            newSkew = -newSkew;
        }
        if (transform.originX === RIGHT && transform.originY === TOP) {
            newSkew = -newSkew;
        }
        if (targetHasOneFlip(target)) {
            newSkew = -newSkew;
        }
    }
    const hasSkewed = currentSkew !== newSkew;
    if (hasSkewed) {
        const dimBeforeSkewing = target._getTransformedDimensions().x;
        // target.set('skewY', newSkew);
        target.skewY = newSkew
        compensateScaleForSkew(target, 'skewX', 'scaleX', 'x', dimBeforeSkewing);
        fireEvent('skewing', commonEventInfo(eventData, transform, x, y));
    }
    return hasSkewed;
}

function skewObjectX(eventData, transform, x, y) {
    const target = transform.target;
        // find how big the object would be, if there was no skewX. takes in account scaling
    const dimNoSkew = target._getTransformedDimensions(0, target.skewY);
    const localPoint = getLocalPoint(transform, transform.originX, transform.originY, x, y);
    // the mouse is in the center of the object, and we want it to stay there.
    // so the object will grow twice as much as the mouse.
    // this makes the skew growth to localPoint * 2 - dimNoSkew.
    const totalSkewSize = Math.abs(localPoint.x * 2) - dimNoSkew.x;
    const currentSkew = target.skewX;
    let newSkew;
    if (totalSkewSize < 2) {
        // let's make it easy to go back to position 0.
        newSkew = 0;
    }
    else {
        newSkew = radiansToDegrees(
            Math.atan2((totalSkewSize / target.scaleX), (dimNoSkew.y / target.scaleY))
        );
        // now we have to find the sign of the skew.
        // it mostly depend on the origin of transformation.
        if (transform.originX === LEFT && transform.originY === BOTTOM) {
            newSkew = -newSkew;
        }
        if (transform.originX === RIGHT && transform.originY === TOP) {
            newSkew = -newSkew;
        }
        if (targetHasOneFlip(target)) {
            newSkew = -newSkew;
        }
    }
    var hasSkewed = currentSkew !== newSkew;
    if (hasSkewed) {
        const dimBeforeSkewing = target._getTransformedDimensions().y;
        // target.set('skewX', newSkew);
        target.skewX = newSkew;
        compensateScaleForSkew(target, 'skewY', 'scaleY', 'y', dimBeforeSkewing);
        fireEvent('skewing', commonEventInfo(eventData, transform, x, y));
    }
    return hasSkewed;
  }

export function compensateScaleForSkew(target, oppositeSkew, scaleToCompoensate, axis, reference) {
    if (target[oppositeSkew] !== 0) {
        const newDim = target._getTransformedDimensions()[axis];
        const newValue = reference / newDim * target[scaleToCompoensate];
        // target.set(scaleToCompoensate, newValue);
        target[scaleToCompoensate] = newValue
    }
}

function commonEventInfo(eventData, transform, x, y) {
    return {
        e: eventData,
        transform: transform,
        pointer: {
            x: x,
            y: y,
        }
    };
}

function scaleObject(eventData, transform, x, y, options) {
    options = options || {};
    const target = transform.target;
    const lockScalingX = target.lockScalingX;
    const lockScalingY = target.lockScalingY;
    const by = options.by;
    
    const scaleProportionally = scaleIsProportional(eventData, target);
    const forbidScaling = scalingIsForbidden(target, by, scaleProportionally);

    let newPoint, scaleX, scaleY, dim, signX, signY;

    if (forbidScaling) {
      return false;
    }
    newPoint = getLocalPoint(transform, transform.originX, transform.originY, x, y);
    signX = sign(newPoint.x);
    signY = sign(newPoint.y);
    if (!transform.signX) {
      transform.signX = signX;
    }
    if (!transform.signY) {
      transform.signY = signY;
    }

    if (target.lockScalingFlip &&
      (transform.signX !== signX || transform.signY !== signY)
    ) {
      return false;
    }

    dim = target._getTransformedDimensions();
    // missing detection of flip and logic to switch the origin
    if (scaleProportionally && !by) {
      // uniform scaling
      const distance = Math.abs(newPoint.x) + Math.abs(newPoint.y),
          original = transform.original,
          originalDistance = Math.abs(dim.x * original.scaleX / target.scaleX) +
            Math.abs(dim.y * original.scaleY / target.scaleY),
          scale = distance / originalDistance;
      scaleX = original.scaleX * scale;
      scaleY = original.scaleY * scale;
    }
    else {
      scaleX = Math.abs(newPoint.x * target.scaleX / dim.x);
      scaleY = Math.abs(newPoint.y * target.scaleY / dim.y);
    }
    // if we are scaling by center, we need to double the scale
    if (transform.originX === CENTER && transform.originY === CENTER) {
      scaleX *= 2;
      scaleY *= 2;
    }
    if (transform.signX !== signX) {
      transform.originX = opposite[transform.originX];
      scaleX *= -1;
      transform.signX = signX;
    }
    if (transform.signY !== signY) {
      transform.originY = opposite[transform.originY];
      scaleY *= -1;
      transform.signY = signY;
    }
    // minScale is taken are in the setter.
    const oldScaleX = target.scaleX, oldScaleY = target.scaleY;
    if (!by) {
      !lockScalingX && (target.scaleX = scaleX);
      !lockScalingY && (target.scaleY = scaleY);
    }
    else {
      // forbidden cases already handled on top here.
      by === 'x' && (target.scaleX = scaleX);
      by === 'y' && (target.scaleY = scaleY);
    }
    hasScaled = oldScaleX !== target.scaleX || oldScaleY !== target.scaleY;
    if (hasScaled) {
      fireEvent('scaling', commonEventInfo(eventData, transform, x, y));
    }
    return hasScaled;
}

function scaleObjectX(eventData, transform, x, y) {
    return scaleObject(eventData, transform, x, y , { by: 'x' });
}

function scaleObjectY(eventData, transform, x, y) {
    return scaleObject(eventData, transform, x, y , { by: 'y' });
}

function scaleObjectFromCorner(eventData, transform, x, y) {
    return scaleObject(eventData, transform, x, y);
}

export const scalingX = wrapWithFixedAnchor(scaleObjectX);

export const scalingY = wrapWithFixedAnchor(scaleObjectY);

export const scalingEqually = wrapWithFixedAnchor(scaleObjectFromCorner);

export function scaleOrSkewActionName(eventData, corner, fabricObject) {
    const isAlternative = eventData[fabricObject.canvas.altActionKey];
    if (corner.x === 0) {
      // then is scaleY or skewX
      return isAlternative ? 'skewX' : 'scaleY';
    }
    if (corner.y === 0) {
      // then is scaleY or skewX
      return isAlternative ? 'skewY' : 'scaleX';
    }
}

export function scalingYOrSkewingX(eventData, transform, x, y) {
    // ok some safety needed here.
    if (eventData[transform.target.canvas.altActionKey]) {
      return skewHandlerX(eventData, transform, x, y);
    }
    return scalingY(eventData, transform, x, y);
}

export function rotationWithSnapping(eventData, transform, x, y) {
    const t = transform;
    const target = t.target;
    const pivotPoint = target.translateToOriginPoint(target.getCenterPoint(), t.originX, t.originY);

    if (target.lockRotation) {
      return false;
    }

    const lastAngle = Math.atan2(t.ey - pivotPoint.y, t.ex - pivotPoint.x);
    const curAngle = Math.atan2(y - pivotPoint.y, x - pivotPoint.x);
    let angle = radiansToDegrees(curAngle - lastAngle + t.theta);
    let hasRotated = true;

    if (target.snapAngle > 0) {
        const snapAngle  = target.snapAngle;
        const snapThreshold  = target.snapThreshold || snapAngle;
        const rightAngleLocked = Math.ceil(angle / snapAngle) * snapAngle;
        const leftAngleLocked = Math.floor(angle / snapAngle) * snapAngle;

      if (Math.abs(angle - leftAngleLocked) < snapThreshold) {
        angle = leftAngleLocked;
      }
      else if (Math.abs(angle - rightAngleLocked) < snapThreshold) {
        angle = rightAngleLocked;
      }
    }

    // normalize angle to positive value
    if (angle < 0) {
        angle = 360 + angle;
    }
    angle %= 360;

    hasRotated = target.angle !== angle;
    target.angle = angle;
    if (hasRotated) {
        fireEvent('rotating', commonEventInfo(eventData, transform, x, y));
    }
    return hasRotated;
}

export function rotationStyleHandler(eventData, corner, fabricObject) {
    if (fabricObject.lockRotation) {
      return 'not-allowed';
    }
    return corner.cursorStyle;
  }