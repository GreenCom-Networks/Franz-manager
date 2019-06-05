import { WatchableStore } from 'watchable-stores';
import jsonTheme from '../assets/themes/themes.json';

const ThemesStore = () => {
  const themeName = localStorage.getItem('theme') || 'theme-cashmachine';

  const store = new WatchableStore({
    action: '',
    theme: jsonTheme.find(t => t.file === themeName),
  });

  function setTheme(theme) {
    localStorage.setItem('theme', theme.file);
    const currentStyle = document.head.querySelectorAll('head style')[1];
    const newStyle = document.createElement('style');
    newStyle.innerText = theme.content;
    document.head.appendChild(newStyle);
    document.head.removeChild(currentStyle);
  }

  store.updateTheme = (theme) => {
    store.data = {
      action: 'UPDATE',
      theme,
    };
    setTheme(theme);
  };

  store.getTheme = () => store.data.theme;

  store.initTheme = () => {
    setTheme(store.data.theme);
  };

  return store;
};

export default ThemesStore();
