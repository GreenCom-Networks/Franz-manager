import React from 'react';
import ReactDOM from 'react-dom';
import Router from './Router';

import '@mdi/font/css/materialdesignicons.css';
import 'react-perfect-scrollbar/dist/css/styles.min.css';
import './core.scss';

import ThemesStore from './stores/ThemesStore';

(function (elmProto) {
  if ('scrollTopMax' in elmProto) {
    return;
  }
  Object.defineProperties(elmProto, {
    scrollTopMax: {
      get: function scrollTopMax() {
        return this.scrollHeight - this.clientTop;
      },
    },
    scrollLeftMax: {
      get: function scrollLeftMax() {
        return this.scrollWidth - this.clientLeft;
      },
    },
  });
}(Element.prototype));

ThemesStore.initTheme();

ReactDOM.render(<Router />, document.getElementById('root'));
