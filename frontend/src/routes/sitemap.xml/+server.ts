const SITE = 'https://stellar-legacy.tfeuerbach.dev';

const pages = [
	{ path: '', priority: '1.0', changefreq: 'always' },
	{ path: '/about', priority: '0.7', changefreq: 'monthly' },
	{ path: '/archive', priority: '0.8', changefreq: 'always' },
];

export function GET() {
	const today = new Date().toISOString().split('T')[0];

	const urls = pages
		.map(
			(p) => `  <url>
    <loc>${SITE}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
		)
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600',
		},
	});
}
