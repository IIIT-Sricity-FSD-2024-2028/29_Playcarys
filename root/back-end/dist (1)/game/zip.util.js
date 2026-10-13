"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZipError = exports.ZIP_LIMITS = void 0;
exports.readZip = readZip;
exports.normaliseEntryPath = normaliseEntryPath;
const zlib = require("zlib");
const SIG_EOCD = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;
const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;
exports.ZIP_LIMITS = {
    maxEntries: 5000,
    maxTotalUncompressed: 300 * 1024 * 1024,
    maxCompressionRatio: 1000,
    ratioCheckAppliesOver: 10 * 1024 * 1024,
};
class ZipError extends Error {
}
exports.ZipError = ZipError;
function findEocd(buf) {
    const maxCommentLen = 0xffff;
    const minFrom = Math.max(0, buf.length - maxCommentLen - 22);
    for (let i = buf.length - 22; i >= minFrom; i--) {
        if (buf.readUInt32LE(i) === SIG_EOCD)
            return i;
    }
    throw new ZipError('Not a ZIP archive (no end-of-central-directory record found)');
}
function readZip(buf) {
    if (buf.length < 22)
        throw new ZipError('File is too small to be a ZIP archive');
    const eocd = findEocd(buf);
    const entryCount = buf.readUInt16LE(eocd + 10);
    const centralDirOffset = buf.readUInt32LE(eocd + 16);
    if (entryCount > exports.ZIP_LIMITS.maxEntries) {
        throw new ZipError(`Archive has ${entryCount} entries, which exceeds the ${exports.ZIP_LIMITS.maxEntries} file limit`);
    }
    if (centralDirOffset === 0xffffffff) {
        throw new ZipError('ZIP64 archives are not supported. Re-export with a smaller archive.');
    }
    if (centralDirOffset >= buf.length) {
        throw new ZipError('Corrupt ZIP archive (central directory offset is out of bounds)');
    }
    const entries = [];
    let totalUncompressed = 0;
    let ptr = centralDirOffset;
    for (let i = 0; i < entryCount; i++) {
        if (ptr + 46 > buf.length || buf.readUInt32LE(ptr) !== SIG_CENTRAL) {
            throw new ZipError('Corrupt ZIP archive (bad central directory entry)');
        }
        const method = buf.readUInt16LE(ptr + 10);
        const compressedSize = buf.readUInt32LE(ptr + 20);
        const uncompressedSize = buf.readUInt32LE(ptr + 24);
        const nameLen = buf.readUInt16LE(ptr + 28);
        const extraLen = buf.readUInt16LE(ptr + 30);
        const commentLen = buf.readUInt16LE(ptr + 32);
        const localOffset = buf.readUInt32LE(ptr + 42);
        const rawName = buf.subarray(ptr + 46, ptr + 46 + nameLen).toString('utf8');
        ptr += 46 + nameLen + extraLen + commentLen;
        if (rawName.endsWith('/') || rawName.endsWith('\\'))
            continue;
        if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) {
            throw new ZipError(`ZIP64 entry "${rawName}" is not supported`);
        }
        totalUncompressed += uncompressedSize;
        if (totalUncompressed > exports.ZIP_LIMITS.maxTotalUncompressed) {
            throw new ZipError(`Archive expands to more than ${Math.round(exports.ZIP_LIMITS.maxTotalUncompressed / 1024 / 1024)} MB`);
        }
        if (compressedSize > 0 &&
            uncompressedSize > exports.ZIP_LIMITS.ratioCheckAppliesOver &&
            uncompressedSize / compressedSize > exports.ZIP_LIMITS.maxCompressionRatio) {
            throw new ZipError(`Entry "${rawName}" has a suspicious compression ratio`);
        }
        if (localOffset + 30 > buf.length || buf.readUInt32LE(localOffset) !== SIG_LOCAL) {
            throw new ZipError(`Corrupt ZIP archive (bad local header for "${rawName}")`);
        }
        const localNameLen = buf.readUInt16LE(localOffset + 26);
        const localExtraLen = buf.readUInt16LE(localOffset + 28);
        const dataStart = localOffset + 30 + localNameLen + localExtraLen;
        const dataEnd = dataStart + compressedSize;
        if (dataEnd > buf.length) {
            throw new ZipError(`Corrupt ZIP archive (payload for "${rawName}" is truncated)`);
        }
        const raw = buf.subarray(dataStart, dataEnd);
        let contents;
        if (method === METHOD_STORED) {
            contents = Buffer.from(raw);
        }
        else if (method === METHOD_DEFLATE) {
            try {
                contents = zlib.inflateRawSync(raw);
            }
            catch {
                throw new ZipError(`Could not decompress "${rawName}" — the archive may be damaged`);
            }
        }
        else {
            throw new ZipError(`Entry "${rawName}" uses unsupported compression method ${method}. ` +
                `Re-create the archive with standard Deflate compression.`);
        }
        entries.push({ path: normaliseEntryPath(rawName), contents });
    }
    if (!entries.length)
        throw new ZipError('Archive contains no files');
    return entries;
}
function normaliseEntryPath(rawName) {
    const unified = rawName.replace(/\\/g, '/');
    if (unified.startsWith('/') || /^[a-zA-Z]:/.test(unified)) {
        throw new ZipError(`Entry "${rawName}" uses an absolute path`);
    }
    const segments = [];
    for (const segment of unified.split('/')) {
        if (!segment || segment === '.')
            continue;
        if (segment === '..') {
            throw new ZipError(`Entry "${rawName}" tries to escape the archive root`);
        }
        if (segment.includes('\0')) {
            throw new ZipError(`Entry "${rawName}" contains an invalid character`);
        }
        segments.push(segment);
    }
    if (!segments.length)
        throw new ZipError(`Entry "${rawName}" has an empty path`);
    return segments.join('/');
}
//# sourceMappingURL=zip.util.js.map