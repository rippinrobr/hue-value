// A local server that behaves like the Cloudflare Worker's static assets: /index.html
// redirects to /, and any address without a file gets the app.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.woff2': 'font/woff2',
	'.webmanifest': 'application/manifest+json'
};

/** `site.root` and `site.swExtra` can change while it runs, to stage a release. */
export function serve(site, port = 0) {
	const server = createServer(async (request, response) => {
		const pathname = decodeURIComponent(new URL(request.url, 'http://x').pathname);
		if (pathname === '/index.html') {
			response.writeHead(307, { location: '/' }).end();
			return;
		}
		const send = async (file) => {
			let body = await readFile(file);
			if (file.endsWith('sw.js') && site.swExtra) {
				body = Buffer.concat([body, Buffer.from(site.swExtra)]);
			}
			response.writeHead(200, {
				'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
				'cache-control': 'public, max-age=0, must-revalidate'
			});
			response.end(body);
		};
		try {
			await send(path.join(site.root, pathname === '/' ? 'index.html' : pathname));
		} catch {
			if (path.extname(pathname)) response.writeHead(404).end();
			else await send(path.join(site.root, 'index.html'));
		}
	});
	return new Promise((resolve) =>
		server.listen(port, '127.0.0.1', () => {
			resolve({ server, origin: `http://127.0.0.1:${server.address().port}` });
		})
	);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
	const { origin } = await serve({ root, swExtra: '' }, Number(process.argv[2] ?? 4174));
	console.log(`Serving ${root} at ${origin}`);
}
