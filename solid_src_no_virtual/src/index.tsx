/* @refresh reload */
import { render } from 'solid-js/web'
import './index.css'
import App from './App.tsx'

window.addEventListener('error', (event) => {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.width = '100%';
  errorDiv.style.backgroundColor = 'red';
  errorDiv.style.color = 'white';
  errorDiv.style.zIndex = '99999';
  errorDiv.style.padding = '10px';
  errorDiv.style.fontFamily = 'monospace';
  errorDiv.innerText = 'JS Error: ' + event.message + ' at ' + event.filename + ':' + event.lineno;
  document.body.appendChild(errorDiv);
});
window.addEventListener('unhandledrejection', (event) => {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '50px';
  errorDiv.style.left = '0';
  errorDiv.style.width = '100%';
  errorDiv.style.backgroundColor = 'darkred';
  errorDiv.style.color = 'white';
  errorDiv.style.zIndex = '99999';
  errorDiv.style.padding = '10px';
  errorDiv.style.fontFamily = 'monospace';
  errorDiv.innerText = 'Promise Rejection: ' + event.reason;
  document.body.appendChild(errorDiv);
});

const root = document.getElementById('root')

render(() => <App />, root!)
