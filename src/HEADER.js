export const iMatrix = [1, 0, 0, 1, 0, 0];

export const svgNS = 'http://www.w3.org/2000/svg';

export const devicePixelRatio = window.devicePixelRatio || window.webkitDevicePixelRatio || window.mozDevicePixelRatio || 1;

export const browserShadowBlurConstant = 1;

export const rePathCommand = /([-+]?((\d+\.\d+)|((\d+)|(\.\d+)))(?:[eE][-+]?\d+)?)/ig;

/**
 * 这个对象储存了圆弧转换为贝塞尔的结果集，方便相同圆弧转换时能快速转换
 */
export const arcToSegmentsCache = {}

export const PPTCanvas = {}
