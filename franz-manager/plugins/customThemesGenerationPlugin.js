const fs = require('fs');
const path = require('path');
const {exec} = require('child_process');

const pluginName = 'CustomThemesGenerationPlugin';


function listThemesFiles(themesDirectory, cb) {
  const cwd = process.cwd();
  fs.readdir(themesDirectory, (err, files) => {
    if(err) return cb(err);
    const themes = [];
    for(const file of files) {
      if(file.endsWith('.scss')) {
	themes.push(path.resolve(cwd, themesDirectory, file));
      }
    }
    cb(null, themes);
  });
}

class CustomThemesGenerationPlugin {
  constructor(themesDirectory) {
    if(!themesDirectory) throw new Error(`[${pluginName}] Missing themesDirectory parameter`);
    this.themesDirectory = themesDirectory;
  }

  apply(compiler) {
    compiler.hooks.run.tapAsync(pluginName, (compiler, cb) => {
      this._buildThemes(cb);
    });

    let watchFirstRun = true;
    let themesFiles = new Set();
    compiler.hooks.watchRun.tapAsync(pluginName, (compiler, cb) => {
      if(watchFirstRun) {
	watchFirstRun = false;
	listThemesFiles(this.themesDirectory, (err, themes) => {
	  if(err) return cb(err);
	  compiler.hooks.afterCompile.tap(pluginName, compilation => {
	    for(const theme of themes) {
	      compilation.fileDependencies.add(theme);
	      themesFiles.add(theme);
	    }
	  });

	  this._buildThemes(cb);
	});
      } else {
	let shouldRebuildThemes = false;
	const watcher = compiler.watchFileSystem.watcher;
	if(watcher) {
	  const modifiedFiles = watcher.mtimes;
	  for(const file of Object.keys(modifiedFiles)) {
	    if(themesFiles.has(file)) {
	      shouldRebuildThemes = true;
	      break;
	    }
	  }
	}
	if(shouldRebuildThemes) {
	  return this._buildThemes(cb);
	} else {
	  return cb();
	}
      }
    });
  }

  _buildThemes(cb) {
    exec('node plugins/generateCssThemes.js', err => {
      if(err) return cb(err);
      return cb();
    });
  }
}

module.exports = CustomThemesGenerationPlugin;
