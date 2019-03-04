const fs = require('fs');

class CopyIndexHTMLPlugin {
  constructor(path) {
    if(!path) throw new Error('[CopyIndexHTMLPlugin] Missing path parameter');
    this.path = path;
  }

  apply(compiler) {
    compiler.hooks.emit.tapAsync('CopyIndexHTMLPlugin', (compilation, cb) => {
      fs.readFile(this.path, 'utf-8', (err, data) => {
	if(err) return cb(err);
	compilation.assets['index.html'] = {
	  size: () => data.length,
	  source: () => data
	};
	cb();
      });
    });
  }
}

module.exports = CopyIndexHTMLPlugin;
