/**
 * Unit tests for Capacitor HTML transforms (Node built-in test runner).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { markHtmlAsNative } from './native-html.js';

describe('markHtmlAsNative', () => {
    const sample = `<!DOCTYPE html>
<html>
<head>
    <link rel="manifest" href="manifest.json">
    <title>Ocean 2048</title>
</head>
<body>
    <div id="board"></div>
    <script type="module" src="js/main.js"></script>
</body>
</html>
`;

    it('removes web manifest link', () => {
        const out = markHtmlAsNative(sample);
        assert.equal(/rel=["']manifest["']/.test(out), false);
        assert.equal(out.includes('manifest.json'), false);
    });

    it('switches entry script to bundled app.js', () => {
        const out = markHtmlAsNative(sample);
        assert.match(out, /src="js\/app\.js"/);
        assert.equal(out.includes('src="js/main.js"'), false);
    });

    it('marks body as native for platform detection', () => {
        const out = markHtmlAsNative(sample);
        assert.match(out, /<body class="is-native" data-build="native">/);
    });

    it('is idempotent for already-native body marker presence check', () => {
        const once = markHtmlAsNative(sample);
        // Second pass: body already transformed — replace('<body>') is no-op
        const twice = markHtmlAsNative(once);
        assert.equal(
            (twice.match(/data-build="native"/g) || []).length,
            1
        );
        assert.equal(
            (twice.match(/src="js\/app\.js"/g) || []).length,
            1
        );
    });
});
