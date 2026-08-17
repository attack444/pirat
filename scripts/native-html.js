/**
 * Pure HTML transforms for Capacitor www/ build.
 * Kept separate so Node tests can lock store-build markers without esbuild.
 */

/**
 * Adapt web index.html for native shell:
 * - drop web manifest (native uses Capacitor)
 * - point entry at bundled app.js
 * - mark body as native for platform.detectPlatform()
 */
export function markHtmlAsNative(html) {
    return String(html)
        .replace(/<link rel="manifest"[^>]*>\s*/i, '')
        .replace(
            '<script type="module" src="js/main.js"></script>',
            '<script type="module" src="js/app.js"></script>'
        )
        .replace(
            '<body>',
            '<body class="is-native" data-build="native">'
        );
}
