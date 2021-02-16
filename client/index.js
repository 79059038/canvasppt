import CanvasPpt from '@canvasppt';
const canvas = new CanvasPpt.Canvas({width: 960, height: 720}, 'canvas');

canvas.add(new CanvasPpt.RectClass({
    top: 100,
    left: 100,
    width: 100,
    height: 100
}));

window.CanvasPpt = CanvasPpt;
