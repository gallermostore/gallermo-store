import React from 'react';
import {renderToString} from 'react-dom/server';
import {StaticRouter} from 'react-router-dom/server';
import App from './App.jsx';

export function render(url, initial) {
  return renderToString(<StaticRouter location={url} future={{v7_relativeSplatPath:true}}><App initial={initial}/></StaticRouter>);
}
