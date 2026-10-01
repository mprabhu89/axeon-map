import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ReportWindowApp } from './components/ReportWindowApp';
import { AuthenticationGate } from './auth/AuthenticationGate';
import { DEFAULT_LOCAL_MAXIMO_ADAPTER_CONFIGURATION, resolveMaximoAdapter } from './data/adapterResolver';
import './styles.css';

const maximoAdapter = resolveMaximoAdapter(DEFAULT_LOCAL_MAXIMO_ADAPTER_CONFIGURATION);

const reportSurface = window.location.hash.startsWith('#/report/');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><AuthenticationGate>{reportSurface ? <ReportWindowApp /> : <App adapter={maximoAdapter} />}</AuthenticationGate></React.StrictMode>,
);
