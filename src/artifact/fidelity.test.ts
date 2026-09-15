import { describe, expect, it } from 'vitest';
import {
  contentSecurityPolicyFor,
  injectArtifactLayerScript,
  remoteOriginsList,
  rewriteCss,
  rewriteHtml
} from './fidelity.js';

const BASE = '/artifact/session-1';

describe('artifact fidelity rewriting', () => {
  it('rewrites relative and root-relative URLs onto the artifact route', () => {
    const { html } = rewriteHtml(
      '<!doctype html><html><head><link rel="stylesheet" href="styles/main.css"></head><body><img src="/img/hero.png"><a href="about.html">a</a><img srcset="small.png 1x, large.png 2x"></body></html>',
      BASE
    );
    expect(html).toContain(`href="${BASE}/styles/main.css"`);
    expect(html).toContain(`src="${BASE}/img/hero.png"`);
    expect(html).toContain(`href="${BASE}/about.html"`);
    expect(html).toContain(`${BASE}/small.png 1x, ${BASE}/large.png 2x`);
  });

  it('leaves fragments, data URIs and remote URLs intact while recording origins', () => {
    const { html, remote } = rewriteHtml(
      '<a href="#top">top</a><img src="data:image/png;base64,AAAA"><img src="https://images.example.org/a.png"><link rel="stylesheet" href="https://cdn.example.com/a.css">',
      BASE
    );
    expect(html).toContain('href="#top"');
    expect(html).toContain('src="data:image/png;base64,AAAA"');
    expect(html).toContain('src="https://images.example.org/a.png"');
    expect(remote.image).toContain('https://images.example.org');
    expect(remote.stylesheet).toContain('https://cdn.example.com');
  });

  it('reads remote font origins out of a local stylesheet', () => {
    const { remote } = rewriteHtml(
      '<link rel="stylesheet" href="site.css">',
      BASE,
      () => '@font-face { src: url(https://fonts.example.net/x.woff2); } @import url(https://extra.example.com/base.css);'
    );
    expect(remote.font).toContain('https://fonts.example.net');
    expect(remote.stylesheet).toContain('https://extra.example.com');
  });

  it('rewrites root-relative CSS urls and reports remote font origins', () => {
    const { css, remote } = rewriteCss(
      'body { background: url(/img/bg.png); } .x { src: url(https://fonts.example.net/f.woff); }',
      BASE
    );
    expect(css).toContain(`url(${BASE}/img/bg.png)`);
    expect(css).toContain('url(https://fonts.example.net/f.woff)');
    expect(remote.font).toContain('https://fonts.example.net');
  });

  it('builds a policy that allows declared origins and blocks data requests', () => {
    const csp = contentSecurityPolicyFor({
      stylesheet: ['https://cdn.example.com'],
      font: ['https://fonts.example.net'],
      image: ['https://images.example.org'],
      other: []
    });
    expect(csp).toContain('sandbox allow-scripts allow-same-origin');
    expect(csp).toContain('https://cdn.example.com');
    expect(csp).toContain('https://fonts.example.net');
    expect(csp).toContain('https://images.example.org');
    expect(csp).toContain("connect-src 'none'");
    expect(csp).not.toContain('unsafe-eval');
  });

  it('injects the self-contained interaction layer without base-url side effects', () => {
    const withBody = injectArtifactLayerScript('<html><body><p>hi</p></body></html>', 'session-1', { 'data-revision': 'rev-1' });
    expect(withBody).toContain('</script></body>');
    expect(withBody).toContain('/ui/artifact-layer.js');
    expect(withBody).toContain('data-revision="rev-1"');
    expect(withBody).not.toContain('<base');
    const withoutBody = injectArtifactLayerScript('<p>hi</p>', 'session-1');
    expect(withoutBody).toContain('/ui/artifact-layer.js');
  });

  it('deduplicates the disclosed origin list', () => {
    const { remote } = rewriteHtml(
      '<img src="https://a.example.com/1.png"><img src="https://a.example.com/2.png">',
      BASE
    );
    expect(remoteOriginsList(remote)).toEqual(['https://a.example.com']);
  });
});