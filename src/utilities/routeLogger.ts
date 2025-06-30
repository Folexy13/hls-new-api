import { Application, Router } from 'express';
import chalk from 'chalk';

function getRoutes(stack: any[], prefix = ''): { method: string; path: string }[] {
  let routes: { method: string; path: string }[] = [];
  stack.forEach((layer) => {
    if (layer.route && layer.route.path) {
      const methods = Object.keys(layer.route.methods)
        .filter((m) => layer.route.methods[m])
        .map((m) => m.toUpperCase());
      methods.forEach((method) => {
        routes.push({ method, path: prefix + layer.route.path });
      });
    } else if (layer.name === 'router' && layer.handle.stack) {
      const newPrefix = layer.regexp && layer.regexp.source !== '^\\/?$' ?
        prefix + (layer.regexp.source
          .replace('^\\/', '/').replace('\\/?$', '').replace('(?=\/|$)', '')) : prefix;
      routes = routes.concat(getRoutes(layer.handle.stack, newPrefix));
    }
  });
  return routes;
}



export function logRoutes(app: Application | Router, base = '') {
  // @ts-ignore
  const stack = app.stack || app._router?.stack || [];
  const routes = getRoutes(stack, base);
  if (routes.length === 0) {
    console.log(chalk.yellow('No routes found.'));
    return;
  }

  // Get host/port from env or default
  const port = process.env.PORT || 3000;
  const host = process.env.ENVIRONMENT === 'dev' || !process.env.ENVIRONMENT
    ? `http://localhost:${port}`
    : process.env.HOST || 'https://hls-new-api.onrender.com';

  // Table header
  const header = [chalk.bold('Method'), chalk.bold('Route')];
  const rows = [header];

  routes.forEach(({ method, path }) => {
    let color = chalk.white;
    if (method === 'GET') color = chalk.green;
    else if (method === 'POST') color = chalk.blue;
    else if (method === 'PUT') color = chalk.yellow;
    else if (method === 'DELETE') color = chalk.red;
    else if (method === 'PATCH') color = chalk.magenta;

    const fullUrl = `${host}${path}`;
    rows.push([
      color(method.padEnd(6)),
      chalk.bold(fullUrl),
    ]);
  });

  // Calculate column widths
  const colWidths = header.map((_, i) => Math.max(...rows.map(row => row[i].replace(/\u001b\[[0-9;]*m/g, '').length)));

  // Table border helpers
  function border(char: string, left: string, mid: string, right: string) {
    return left + colWidths.map(w => char.repeat(w + 2)).join(mid) + right;
  }

  // Print table
  console.log(chalk.cyan.bold('\nRegistered Routes:'));
  console.log(border('═', '╔', '╦', '╗'));
  // Header
  const headerLine = rows[0].map((cell, j) => ' ' + cell + ' '.repeat(colWidths[j] - cell.replace(/\u001b\[[0-9;]*m/g, '').length + 1)).join('║');
  console.log('║' + headerLine + '║');
  console.log(border('═', '╠', '╬', '╣'));
  // Rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const line = row.map((cell, j) => ' ' + cell + ' '.repeat(colWidths[j] - cell.replace(/\u001b\[[0-9;]*m/g, '').length + 1)).join('║');
    console.log('║' + line + '║');
  }
  console.log(border('═', '╚', '╩', '╝'));
  console.log();
}
