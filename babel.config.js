module.exports = function(api) {
  const presets = [
    ["@babel/preset-env", { "useBuiltIns": "entry" }],
    "@babel/preset-react",
  ];

  const plugins = ["@babel/plugin-proposal-class-properties"];
  if(api.env("development")) {
    plugins.push("react-hot-loader/babel");
  }
  
  return {
    presets,
    plugins
  };
};
