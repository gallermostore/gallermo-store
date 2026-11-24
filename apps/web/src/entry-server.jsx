import React from 'react';
import {renderToString} from 'react-dom/server';
import {StaticRouter} from 'react-router-dom/server';
import App from './App.jsx';
import './styles.css';
export function render(url,initial){return renderToString(<StaticRouter location={url}><App initial={initial}/></StaticRouter>)}
