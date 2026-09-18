import { createServer } from 'node:http';

const APP_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Reach app</title>
    <style>
      body { margin: 24px; font-family: system-ui, sans-serif; }
      iframe { display: block; width: 320px; height: 120px; border: 1px solid rgb(221, 221, 221); }
    </style>
  </head>
  <body>
    <main class="app-root">
      <h1>Reach app</h1>
      <button class="app-plain" type="button">Plain</button>
      <iframe id="widget" title="Widget" src="/widget"></iframe>
    </main>
  </body>
</html>`;

const WIDGET_HTML = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Reach widget</title></head>
  <body>
    <div class="widget-root"><button class="widget-action" type="button">Confirm</button></div>
  </body>
</html>`;

const server = createServer((request, response) => {
  const url = request.url ?? '/';
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(url.startsWith('/widget') ? WIDGET_HTML : APP_HTML);
});

server.listen(Number(process.env.PORT ?? 0), '127.0.0.1', () => {
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  process.stdout.write(JSON.stringify({ url: `http://127.0.0.1:${port}/` }) + '\n');
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
