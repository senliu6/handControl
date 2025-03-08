const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const stream = require('stream');

const pipeline = promisify(stream.pipeline);

// 环境检测（根据实际情况补充）
const isGreenShieldEnv = () => true;

// 优化后的解密函数（带并发控制）
const decryptFile = async (src, dest) => {
    if (!isGreenShieldEnv()) throw new Error('非绿盾授权环境');

    // 确保目标目录存在
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });

    return pipeline(
        fs.createReadStream(src),
        fs.createWriteStream(dest)
    );
};

// 递归扫描文件（异步优化版）
const scanFiles = async (dir) => {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const results = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...await scanFiles(fullPath));
        } else {
            results.push(fullPath);
        }
    }
    return results;
};

// 并发控制器
class ConcurrencyPool {
    constructor(maxConcurrent) {
        this.max = maxConcurrent;
        this.queue = [];
        this.active = 0;
    }

    async add(taskFn) {
        if (this.active >= this.max) {
            await new Promise(resolve => this.queue.push(resolve));
        }

        this.active++;
        try {
            return await taskFn();
        } finally {
            this.active--;
            if (this.queue.length > 0) {
                this.queue.shift()();
            }
        }
    }
}

(async () => {
    const [inputDir] = process.argv.slice(2);
    if (!inputDir) {
        console.log('用法: node decrypt.js <目标目录>');
        process.exit(1);
    }

    const absInputDir = path.resolve(inputDir);
    const outputDir = `${absInputDir}_decrypted`;

    try {
        await fs.promises.access(absInputDir);
        await fs.promises.mkdir(outputDir, { recursive: true });
    } catch (err) {
        console.error(`初始化错误: ${err.message}`);
        process.exit(1);
    }

    const files = await scanFiles(absInputDir);
    console.log(`发现 ${files.length} 个待处理文件`);

    const pool = new ConcurrencyPool(100); // 根据系统调整并发数
    let success = 0, fail = 0;

    await Promise.all(files.map(async (file) => {
        try {
            const relative = path.relative(absInputDir, file);
            const dest = path.join(outputDir, relative);

            await pool.add(() => decryptFile(file, dest));
            success++;
            console.log(`✓ ${relative}`);
        } catch (err) {
            fail++;
            console.error(`✗ ${path.relative(absInputDir, file)}: ${err.message}`);
        }
    }));

    console.log(`\n处理完成: ${success} 成功, ${fail} 失败`);
    console.log(`输出目录: ${outputDir}`);
})();
