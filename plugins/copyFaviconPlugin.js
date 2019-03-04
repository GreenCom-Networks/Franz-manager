const fs = require('fs');

class CopyFaviconPlugin {
  constructor(path) {
    if(!path) throw new Error('[CopyFaviconPlugin] Missing path parameter');
    this.path = path;
  }

  apply(compiler) {
    compiler.hooks.emit.tapAsync('CopyFaviconPlugin', (compilation, cb) => {
      fs.readFile(this.path, (err, data) => {
	if(err) return cb(err);
	compilation.assets['favicon.png'] = {
	  size: () => data.length,
	  source: () => data
	};
	cb();
      });
    });
  }
}


module.exports = CopyFaviconPlugin;
