const fs = require('fs');
const path = require('path');
const sass = require('node-sass');

const themesFolder = path.join('src', 'assets', 'themes');
const coreFilePath = path.join('src', 'core.scss');
let coreFile = fs.readFileSync(coreFilePath).toString();

let themes = [];

fs.readdirSync(themesFolder)
  .filter(theme => path.extname(theme) === '.scss')
  .forEach(theme => {
    const themeContent = fs.readFileSync(path.join(themesFolder, theme)).toString();
    const result = /(.*\/themes\/).*";/.exec(coreFile);
    coreFile = coreFile.replace(/.*\/themes\/.*/, result[1] + theme + '";');
    fs.writeFileSync(coreFilePath, coreFile);

    const sassResult = sass.renderSync({
      file: coreFilePath,
      outputStyle: 'compressed'
    });


    const colorsRegexp = /([-|a-zA-Z0-9]*)[ ]?:[ ]?((.*),|(.*))/;
    const mapRegexp = /\$([-|a-zA-Z]*):(\n|\t|.)*?\);/gm;
    const maps = themeContent.match(mapRegexp).reduce((prev, next) => {
      const title = next.substring(1, next.indexOf(':'));
      prev[title] = next.split('\n').reduce((p, n) => {
        const regRes = colorsRegexp.exec(n);
        if (regRes) {
          p[regRes[1]] = regRes[3] || regRes[4];
        }
        return p;
      }, {});

      return prev;
    }, {});

    themes.push({
      file: theme.replace('.scss', ''),
      content: sassResult.css.toString(),
      maps
    });
  });

fs.writeFileSync(path.join(themesFolder, 'themes.json'), JSON.stringify(themes));
