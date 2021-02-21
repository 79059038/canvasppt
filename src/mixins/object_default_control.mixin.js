import Control from '../publicClass/control.class.js';
import {
    scaleSkewCursorStyleHandler as scaleSkewStyleHandler,
    scalingXOrSkewingY,
    scaleOrSkewActionName,
    scalingYOrSkewingX,
    scaleCursorStyleHandler as scaleStyleHandler,
    scalingEqually,
    rotationWithSnapping,
    rotationStyleHandler
} from '../publicClass/controls.actions.js';

const objectControls = {};

objectControls.ml = new Control({
    name: 'ml',
    position: { x: -0.5, y: 0 },
    cursorStyleHandler: scaleSkewStyleHandler,
    actionHandler: scalingXOrSkewingY,
    getActionName: scaleOrSkewActionName,
});

objectControls.mr = new Control({
    name: 'mr',
    position: { x: 0.5, y: 0 },
    cursorStyleHandler: scaleSkewStyleHandler,
    actionHandler: scalingXOrSkewingY,
    getActionName: scaleOrSkewActionName,
});

objectControls.mb = new Control({
    name: 'mb',
    position: { x: 0, y: 0.5 },
    cursorStyleHandler: scaleSkewStyleHandler,
    actionHandler: scalingYOrSkewingX,
    getActionName: scaleOrSkewActionName,
});

objectControls.mt = new Control({
    name: 'mt',
    position: { x: 0, y: -0.5 },
    cursorStyleHandler: scaleSkewStyleHandler,
    actionHandler: scalingYOrSkewingX,
    getActionName: scaleOrSkewActionName,
});

objectControls.tl = new Control({
    name: 'tl',
    position: { x: -0.5, y: -0.5 },
    cursorStyleHandler: scaleStyleHandler,
    actionHandler: scalingEqually
});

objectControls.tr = new Control({
    name: 'tr',
    position: { x: 0.5, y: -0.5 },
    cursorStyleHandler: scaleStyleHandler,
    actionHandler: scalingEqually
});

objectControls.bl = new Control({
    name: 'bl',
    position: { x: -0.5, y: 0.5 },
    cursorStyleHandler: scaleStyleHandler,
    actionHandler: scalingEqually
});

objectControls.br = new Control({
    name: 'br',
    position: { x: 0.5, y: 0.5 },
    cursorStyleHandler: scaleStyleHandler,
    actionHandler: scalingEqually
});

objectControls.mtr = new Control({
    name: 'mtr',
    position: { x: 0, y: -0.5 },
    actionHandler: rotationWithSnapping,
    cursorStyleHandler: rotationStyleHandler,
    offsetY: -40,
    withConnection: true,
    actionName: 'rotate',
});

export default objectControls;
