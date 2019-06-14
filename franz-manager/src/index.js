import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

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


ReactDOM.render(<App />, document.getElementById('root'));
