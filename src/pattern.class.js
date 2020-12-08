import {createClass} from './util/lang_class';
import Object from './shapes/object.class';
import {createImage, loadImage} from './util/dom_mics';

const Pattern = createClass({}, {}, {
    /**
     * 绘制图案的方式
     */
    repeat: 'repeat',

    initialize(options, callback) {
        options || (options = { });

      this.id = Object.__uid++;
      if (!options.source || (options.source && typeof options.source !== 'string')) {
        callback && callback(this);
        return;
      }
      else {
        // img src string
        var _this = this;
        this.source = createImage();
        loadImage(options.source, this.crossOrigin).then(img => {
            _this.source = img;
          callback && callback(_this);
        });
      }
    }

});

export default Pattern;