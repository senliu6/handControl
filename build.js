const { build } = require('vite');
const path = require('path');

(async () => {
    try {
        await build({
            root: path.resolve(__dirname),
            logLevel: 'debug', // 改为 debug 级别
            build: {
                outDir: 'dist',
                assetsDir: 'assets',
                emptyOutDir: true,
                minify: 'false',
                target: 'esnext',
                sourcemap: true, // 启用 sourcemap，便于追溯
                rollupOptions: {
                    output: {
                        manualChunks: undefined
                    }
                },
                chunkSizeWarningLimit: 1000,
                esbuild: {
                    legalComments: 'none',
                    treeShaking: true
                }
            }
        });
        console.log('构建完成！');
    } catch (error) {
        console.error('构建失败：', error);
        process.exit(1);
    }
})();