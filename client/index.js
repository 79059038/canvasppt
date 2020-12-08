import CanvasPpt, {StaticCanvas, RectClass} from '@canvasppt';

const canvas = new StaticCanvas('canvas');

canvas.add(new RectClass({
    top: 100,
    left: 100,
    width: 100,
    height: 100
}));

window.CanvasPpt = CanvasPpt;

console.log('fffffff');