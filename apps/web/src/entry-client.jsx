import React from 'react';
import {hydrateRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.jsx';

const initial = JSON.parse(document.getElementById('initial-data').textContent);
hydrateRoot(document.getElementById('root'), <BrowserRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><App initial={initial}/></BrowserRouter>);
