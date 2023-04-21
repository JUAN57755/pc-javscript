/**
 * @fileoverview Command-line interface to disk image processing module
 * @author Jeff Parsons <Jeff@pcjs.org>
 * @copyright © 2012-2023 Jeff Parsons
 * @license MIT <https://www.pcjs.org/LICENSE.txt>
 *
 * This file is part of PCjs, a computer emulation software project at <https://www.pcjs.org>.
 */

import fs         from "fs";
import os         from "os";
import crypto     from "crypto";
import glob       from "glob";
import path       from "path";
import got        from "got";
import DataBuffer from "../modules/nodebuffer.js";
import PCJSLib    from "../modules/pcjslib.js";
import StreamZip  from "../modules/streamzip.js";
// import StreamZip  from "node-stream-zip";
import Device     from "../../machines/modules/device.js";
import JSONLib    from "../../machines/modules/jsonlib.js";
import DiskInfo   from "../../machines/pcx86/modules/diskinfo.js";
import CharSet    from "../../machines/pcx86/modules/charset.js";

let device = new Device("node");
let printf = device.printf.bind(device);
let sprintf = device.sprintf.bind(device);
let pcjslib = new PCJSLib();
let moduleDir, rootDir;

let nMaxDefault = 512, nMaxInit, nMaxCount, sFileIndex, useServer;

function printError(err, filename)
{
    let msg = err.message;
    if (filename) msg = path.basename(filename) + ": " + msg;
    printf("error: %s\n", msg);
}

/*
 * List of archive file types to expand when "--expand" is specified.
 */
let asArchiveFileExts = [".ARC", ".ZIP"];       // order must match StreamZip.TYPE_* constants

/*
 * List of text file types to convert line endings from LF to CR+LF when "--normalize" is specified.
 * A warning is always displayed when we replace line endings in any file being copied to a disk image.
 *
 * NOTE: Some files, like ".BAS" files, aren't always ASCII, which is why we now call isText() on all
 * these file contents first.
 */
let asTextFileExts = [".MD", ".ME", ".BAS", ".BAT", ".RAT", ".ASM", ".LRF", ".MAK", ".TXT", ".XML"];

/**
 * compareDisks(sDisk1, sDisk2)
 *
 * @param {string} sDisk1
 * @param {string} sDisk2
 * @returns {boolean} (true if the contents of this buffer are equal to the contents of the specified buffer, false otherwise)
 */
function compareDisks(sDisk1, sDisk2)
{
    /*
     * Passing null for the encoding parameter tells readFile() to return a buffer (which, in our case, is a DataBuffer).
     */
    let db1 = readFile(sDisk1, null);
    let db2 = readFile(sDisk2, null);
    return db1 && db2 && db1.compare(db2) || false;
}

/**
 * createDisk(diskFile, diskette, argv, done)
 *
 * @param {string} diskFile
 * @param {Object} diskette
 * @param {Array} argv
 * @param {function(DiskInfo)} [done]
 * @returns {DiskInfo|null}
 */
function createDisk(diskFile, diskette, argv, done)
{
    let di;
    let sArchiveFolder = "archive/";
    if (path.dirname(diskFile).endsWith("/disks")) {
        sArchiveFolder = "../archive/";
    }
    let sArchiveFile = path.join(path.dirname(diskFile), sArchiveFolder, path.basename(diskFile).replace(".json", ".img"));
    if (diskette.archive) {
        /*
         * The "archive" property determines what we look for in an "archive/" folder alongside the JSON disk image:
         *
         *  1) If it begins with a period, then we assume it's a file extension (eg, ".img", ".psi", etc)
         *  2) If it's "folder", then the name of the diskette is used as a folder name (with trailing slash)
         *  3) Anything else is more or less used as-is (and unless it contains a period, we add a trailing slash)
         */
        if (diskette.archive[0] == '/') {
            sArchiveFile = path.sep + diskette.archive.slice(1);
        } else if (diskette.archive[0] == '.') {
            if (diskette.archive != ".img") {
                sArchiveFile = sArchiveFile.replace(".img", diskette.archive.toUpperCase());
            }
        } else if (diskette.archive == "folder") {
            sArchiveFile = sArchiveFile.replace(".img", path.sep);
        } else {
            sArchiveFile = path.join(path.dirname(sArchiveFile), diskette.archive) + (diskette.archive.indexOf(".") < 0 && !diskette.archive.endsWith(path.sep)? path.sep : "");
        }
    } else if (!existsFile(sArchiveFile)) {
        /*
         * Try automatically switching from a "--disk" to a "--dir" operation if there's no IMG file.
         */
        sArchiveFile = sArchiveFile.replace(".img", path.sep);
    }
    let name = path.basename(sArchiveFile);
    let sectorIDs = diskette.argv['sectorID'] || argv['sectorID'];
    let sectorErrors = diskette.argv['sectorError'] || argv['sectorError'];
    let suppData = diskette.argv['suppData'] || argv['suppData'];
    if (suppData) suppData = readFile(suppData);
    let fDir = false, arcType = 0, sExt = path.parse(sArchiveFile).ext.toLowerCase();
    if (sArchiveFile.endsWith(path.sep)) {
        fDir = true;
        diskette.command = "--dir=" + name;
    }
    else if (sExt == ".arc") {
        arcType = 1;
        diskette.command = "--arc=" + name;
    }
    else if (sExt == ".zip") {
        arcType = 2;
        diskette.command = "--zip=" + name;
    }
    else {
        diskette.command = "--disk=" + name;
    }
    diskette.archive = sArchiveFile;
    printf("checking archive: %s\n", sArchiveFile);
    if (fDir || arcType) {
        let arcOffset = +argv['offset'] || 0;
        let label = diskette.label || argv['label'];
        let password = argv['password'];
        let normalize = diskette.normalize || argv['normalize'];
        let target = getTargetValue(diskette.format);
        let verbose = argv['verbose'];
        di = readDir(sArchiveFile, arcType, arcOffset, label, password, normalize, target, undefined, verbose, done, sectorIDs, sectorErrors, suppData);
    } else {
        di = readDisk(sArchiveFile, false, sectorIDs, sectorErrors, suppData);
        if (di && done) {
            done(di);
        }
    }
    return di;
}

/**
 * dumpSector(di, sector, offset, limit)
 *
 * @param {DiskInfo} di
 * @param {Sector} sector
 * @param {number} [offset]
 * @param {number} [limit]
 * @returns {string}
 */
function dumpSector(di, sector, offset = 0, limit = -1)
{
    let sBytes = "", sChars = "", sLines = "";
    if (limit < 0) limit = di.cbSector;
    while (offset < limit) {
        let b = di.read(sector, offset);
        if (b < 0) break;
        if (!sLines || offset % 16 == 0) sLines += sprintf("%#06x  ", offset);
        sBytes += sprintf("%02x ", b);
        sChars += (b >= 0x20 && b < 0x7f? String.fromCharCode(b) : '.');
        if (++offset % 16 == 0) {
            sLines += sprintf("%48s %16s\n", sBytes, sChars);
            sBytes = sChars = "";
        }
    }
    if (sBytes) sLines += sprintf("%-48s %-16s\n", sBytes, sChars);
    return sLines;
}

/**
 * checkArchive(sPath, fExt)
 *
 * @param {string} sPath
 * @param {boolean} fExt (true to check path for archive extension only)
 * @returns {string|undefined}
 */
function checkArchive(sPath, fExt)
{
    let sArchive;
    for (let sExt of [".ZIP", ".zip", ".ARC", ".arc"]) {
        if (fExt) {
            if (sPath.endsWith(sExt)) {
                sArchive = sPath.slice(0, -sExt.length);
                break;
            }
            continue;
        }
        let sFile = sPath + sExt;
        if (existsFile(sFile)) {
            sArchive = sFile;
            break;
        }
    }
    return sArchive;
}

/**
 * existsDir(sDir, fError)
 *
 * @param {string} sDir
 * @param {boolean} [fError]
 * @returns {boolean}
 */
function existsDir(sDir, fError = true)
{
    try {
        sDir = getFullPath(sDir);
        let stat = fs.statSync(sDir);
        return stat.isDirectory();
    } catch(err) {
        if (fError) printError(err);
    }
    return false;
}

/**
 * existsFile(sFile, fError)
 *
 * This is really "existsFileOrDir()"; if you need to know which, call existsDir() afterward.
 *
 * @param {string} sFile
 * @param {boolean} [fError]
 * @returns {boolean}
 */
function existsFile(sFile, fError = true)
{
    try {
        sFile = getFullPath(sFile);
        return fs.existsSync(sFile);
    } catch(err) {
        if (fError) printError(err);
    }
    return false;
}

/**
 * getHash(data, type)
 *
 * @param {Array.<number>|string|DataBuffer} data
 * @param {string} [type] (eg, "md5")
 * @returns {string}
 */
function getHash(data, type = "md5")
{
    let db;
    if (data instanceof DataBuffer) {
        db = data;
    } else {
        db = new DataBuffer(data);
    }
    return crypto.createHash(type).update(db.buffer).digest('hex');
}

/**
 * getFullPath(sFile)
 *
 * @param {string} sFile
 * @returns {string}
 */
function getFullPath(sFile)
{
    if (sFile[0] == '~') {
        sFile = os.homedir() + sFile.substr(1);
    }
    else {
        sFile = getServerPath(sFile);
    }
    return sFile;
}

/**
 * getDiskServer(diskFile)
 *
 * @param {string} diskFile
 * @returns {string|undefined}
 */
function getDiskServer(diskFile)
{
    let match = diskFile.match(/^\/(disks\/|)(diskettes|gamedisks|miscdisks|harddisks|decdisks|pcsigdisks|pcsig[0-9]*[a-z]*-disks|cdroms|private)\//);
    return match && (match[1] + match[2]);
}

/**
 * getServerPath(sFile)
 *
 * @param {string} sFile
 * @returns {string}
 */
function getServerPath(sFile)
{
    /*
     * In addition to disk server paths, we had to add /machines (for diskette config files) and /software (for Markdown files
     * containing supplementary copy-protection disk data).
     */
    let match = sFile.match(/^\/(disks\/|)(machines|software|diskettes|gamedisks|miscdisks|harddisks|decdisks|pcsigdisks|pcsig[0-9]*[a-z]*-disks|cdroms|private)(\/.*)$/);
    if (match) {
        sFile = path.join(rootDir, (match[2] == "machines" || match[2] == "software"? "" : "disks"), match[2], match[3]);
    }
    return sFile;
}

/**
 * getTargetValue(sTarget)
 *
 * Target is normally a number in Kb (eg, 360 for a 360K diskette); you can also add a suffix (eg, K or M).
 * K is assumed, whereas M will automatically produce a Kb value equal to the specified Mb value (eg, 10M is
 * equivalent to 10240K).
 *
 * @param {string} sTarget
 * @returns {number} (target Kb for disk image, 0 if no target)
 */
function getTargetValue(sTarget)
{
    let target = 0;
    if (sTarget) {
        let match = sTarget.match(/^(PC|)([0-9]+)([KM]*)/i);
        if (match) {
            target = +match[2];
            if (match[3].toUpperCase() == 'M') {
                target *= 1024;
            }
        }
    }
    return target;
}

/**
 * isText(data)
 *
 * It can be hard to differentiate between a binary file and a text file that's using
 * lots of IBM PC graphics characters.  Control characters are often red flags, but they
 * can also be interpreted as graphics characters.
 *
 * @param {string} data
 * @return {boolean} true if sData is entirely non-NULL 7-bit ASCII and/or valid CP437 characters
 */
function isText(data)
{
    for (let i = 0; i < data.length; i++) {
        let b = data.charCodeAt(i);
        if (b == 0 || b >= 0x80 && !CharSet.isCP437(data[i])) {
            return false;
        }
    }
    return true;
}

/**
 * isArchiveFile(sFile)
 *
 * @param {string} sFile
 * @return {number} StreamZip TYPE value, or 0 if not an archive file
 */
function isArchiveFile(sFile)
{
    let sExt = path.parse(sFile).ext.toUpperCase();
    return asArchiveFileExts.indexOf(sExt) + 1;
}

/**
 * isBASICFile(sFile)
 *
 * @param {string} sFile
 * @return {boolean} true if the filename has a ".BAS" extension
 */
function isBASICFile(sFile)
{
    let ext = path.parse(sFile).ext;
    return ext && ext.toUpperCase() == ".BAS";
}

/**
 * isTextFile(sFile)
 *
 * @param {string} sFile
 * @return {boolean} true if the filename contains a known text file extension, false if unknown
 */
function isTextFile(sFile)
{
    let sFileUC = sFile.toUpperCase();
    for (let i = 0; i < asTextFileExts.length; i++) {
        if (sFileUC.endsWith(asTextFileExts[i])) return true;
    }
    return false;
}

/**
 * makeDir(sDir, recursive, deleteFile)
 *
 * The deleteFile parameter is never true unless '--overwrite' was specified; it is only intended
 * to come into play when using '--expand' along with '--extract', because if any earlier '--extract'
 * did NOT use '--expand', then any archives inside the source disk/archive will have been extracted
 * as a file rather than a directory -- in which case, we must delete the file before we can create
 * a directory.
 *
 * @param {string} sDir
 * @param {boolean} [recursive]
 * @param {boolean} [deleteFile] (delete any existing file with the same name as the directory)
 * @returns {boolean} true if successful (or the directory already exists), false if error
 */
function makeDir(sDir, recursive = false, deleteFile = false)
{
    let success = true;
    if (existsFile(sDir, false) && !existsDir(sDir, false) && deleteFile) {
        try {
            fs.unlinkSync(sDir);
        } catch(err) {
            printError(err);
            success = false;
        }
    }
    if (success && !existsFile(sDir, false)) {
        try {
            fs.mkdirSync(sDir, {recursive});
        } catch(err) {
            printError(err);
            success = false;
        }
    }
    return success;
}

/**
 * normalizeForHost(db, fAssumeText)
 *
 * If DataBuffer is text, "normalize" for the host.
 *
 * @param {DataBuffer} db
 * @param {boolean} [fAssumeText]
 * @return {DataBuffer}
 */
function normalizeForHost(db, fAssumeText)
{
    /*
     * Either the caller tells us the data is text, or we at least make sure the first 4 bytes look like text.
     */
    if (fAssumeText || isText(db.toString("utf8", 0, 4))) {
        let s = CharSet.fromCP437(db.buffer, false);
        s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        let i = s.indexOf(String.fromCharCode(0x1A));
        if (i >= 0) {
            s = s.slice(0, i);
        }
        db = new DataBuffer(s);
    }
    return db;
}

/**
 * convertBASICFile(sPath, db, fNormalize)
 *
 * NOTE: The code in this function is based on https://github.com/rwtodd/bascat, which was a good start but had some issues.
 * I'm sure there are still some lingering issues here (perhaps some magic whitespace rules that I'm unaware of), but this code
 * seems to work pretty well now, and the new tokens dictionary is *much* more straightforward.
 *
 * @param {string} sPath (for informational purposes only, since we're working entirely with the DataBuffer)
 * @param {DataBuffer} db (the contents of the BASIC file)
 * @param {boolean} [fNormalize] (true if we should convert characters from CP437 to UTF-8, revert line-endings, and omit EOF)
 * @returns {DataBuffer}
 */
function convertBASICFile(sPath, db, fNormalize)
{
    let i = 0, s = "", quote = false, comment = false, data = false, lineWarning = 0;

    const tokens = {
        0x11:   "0",
        0x12:   "1",
        0x13:   "2",
        0x14:   "3",
        0x15:   "4",
        0x16:   "5",
        0x17:   "6",
        0x18:   "7",
        0x19:   "8",
        0x1A:   "9",
        0x1B:   "10",
        0x81:   "END",
        0x82:   "FOR",
        0x83:   "NEXT",
        0x84:   "DATA",
        0x85:   "INPUT",
        0x86:   "DIM",
        0x87:   "READ",
        0x88:   "LET",
        0x89:   "GOTO",
        0x8A:   "RUN",
        0x8B:   "IF",
        0x8C:   "RESTORE",
        0x8D:   "GOSUB",
        0x8E:   "RETURN",
        0x8F:   "REM",
        0x90:   "STOP",
        0x91:   "PRINT",
        0x92:   "CLEAR",
        0x93:   "LIST",
        0x94:   "NEW",
        0x95:   "ON",
        0x96:   "WAIT",
        0x97:   "DEF",
        0x98:   "POKE",
        0x99:   "CONT",
        0x9C:   "OUT",
        0x9D:   "LPRINT",
        0x9E:   "LLIST",
        0xA0:   "WIDTH",
        0xA1:   "ELSE",
        0xA2:   "TRON",
        0xA3:   "TROFF",
        0xA4:   "SWAP",
        0xA5:   "ERASE",
        0xA6:   "EDIT",
        0xA7:   "ERROR",
        0xA8:   "RESUME",
        0xA9:   "DELETE",
        0xAA:   "AUTO",
        0xAB:   "RENUM",
        0xAC:   "DEFSTR",
        0xAD:   "DEFINT",
        0xAE:   "DEFSNG",
        0xAF:   "DEFDBL",
        0xB0:   "LINE",
        0xB1:   "WHILE",
        0xB2:   "WEND",
        0xB3:   "CALL",
        0xB7:   "WRITE",
        0xB8:   "OPTION",
        0xB9:   "RANDOMIZE",
        0xBA:   "OPEN",
        0xBB:   "CLOSE",
        0xBC:   "LOAD",
        0xBD:   "MERGE",
        0xBE:   "SAVE",
        0xBF:   "COLOR",
        0xC0:   "CLS",
        0xC1:   "MOTOR",
        0xC2:   "BSAVE",
        0xC3:   "BLOAD",
        0xC4:   "SOUND",
        0xC5:   "BEEP",
        0xC6:   "PSET",
        0xC7:   "PRESET",
        0xC8:   "SCREEN",
        0xC9:   "KEY",
        0xCA:   "LOCATE",
        0xCC:   "TO",
        0xCD:   "THEN",
        0xCE:   "TAB(",
        0xCF:   "STEP",
        0xD0:   "USR",
        0xD1:   "FN",
        0xD2:   "SPC(",
        0xD3:   "NOT",
        0xD4:   "ERL",
        0xD5:   "ERR",
        0xD6:   "STRING$",
        0xD7:   "USING",
        0xD8:   "INSTR",
        0xD9:   "'",
        0xDA:   "VARPTR",
        0xDB:   "CSRLIN",
        0xDC:   "POINT",
        0xDD:   "OFF",
        0xDE:   "INKEY$",
        0xE6:   ">",
        0xE7:   "=",
        0xE8:   "<",
        0xE9:   "+",
        0xEA:   "-",
        0xEB:   "*",
        0xEC:   "/",
        0xED:   "^",
        0xEE:   "AND",
        0xEF:   "OR",
        0xF0:   ">=",
        0xF1:   "EQV",
        0xF2:   "IMP",
        0xF3:   "MOD",
        0xF4:   "\\",
        0xFD81: "CVI",
        0xFD82: "CVS",
        0xFD83: "CVD",
        0xFD84: "MKI$",
        0xFD85: "MKS$",
        0xFD86: "MKD$",
        0xFD8B: "EXTERR",
        0xFE81: "FILES",
        0xFE82: "FIELD",
        0xFE83: "SYSTEM",
        0xFE84: "NAME",
        0xFE85: "LSET",
        0xFE86: "RSET",
        0xFE87: "KILL",
        0xFE88: "PUT",
        0xFE89: "GET",
        0xFE8A: "RESET",
        0xFE8B: "COMMON",
        0xFE8C: "CHAIN",
        0xFE8D: "DATE$",
        0xFE8E: "TIME$",
        0xFE8F: "PAINT",
        0xFE90: "COM",
        0xFE91: "CIRCLE",
        0xFE92: "DRAW",
        0xFE93: "PLAY",
        0xFE94: "TIMER",
        0xFE95: "ERDEV",
        0xFE96: "IOCTL",
        0xFE97: "CHDIR",
        0xFE98: "MKDIR",
        0xFE99: "RMDIR",
        0xFE9A: "SHELL",
        0xFE9B: "ENVIRON",
        0xFE9C: "VIEW",
        0xFE9D: "WINDOW",
        0xFE9E: "PMAP",
        0xFE9F: "PALETTE",
        0xFEA0: "LCOPY",
        0xFEA1: "CALLS",
        0xFEA4: "NOISE",
        0xFEA5: "PCOPY",
        0xFEA6: "TERM",
        0xFEA7: "LOCK",
        0xFEA8: "UNLOCK",
        0xFF81: "LEFT$",
        0xFF82: "RIGHT$",
        0xFF83: "MID$",
        0xFF84: "SGN",
        0xFF85: "INT",
        0xFF86: "ABS",
        0xFF87: "SQR",
        0xFF88: "RND",
        0xFF89: "SIN",
        0xFF8A: "LOG",
        0xFF8B: "EXP",
        0xFF8C: "COS",
        0xFF8D: "TAN",
        0xFF8E: "ATN",
        0xFF8F: "FRE",
        0xFF90: "INP",
        0xFF91: "POS",
        0xFF92: "LEN",
        0xFF93: "STR$",
        0xFF94: "VAL",
        0xFF95: "ASC",
        0xFF96: "CHR$",
        0xFF97: "PEEK",
        0xFF98: "SPACE$",
        0xFF99: "OCT$",
        0xFF9A: "HEX$",
        0xFF9B: "LPOS",
        0xFF9C: "CINT",
        0xFF9D: "CSNG",
        0xFF9E: "CDBL",
        0xFF9F: "FIX",
        0xFFA0: "PEN",
        0xFFA1: "STICK",
        0xFFA2: "STRIG",
        0xFFA3: "EOF",
        0xFFA4: "LOC",
        0xFFA5: "LOF"
    };

    let EOF = function() {
        return i >= db.length;
    };

    let readU8 = function() {
        return i < db.length? db.readUInt8(i++) : 0;
    };

    let peekU8 = function(v) {
        return !EOF() && db.readUInt8(i) == v;
    };

    let peekU16 = function(v1, v2) {
        return (i < db.length - 1) && (db.readUInt8(i) == v1) && (db.readUInt8(i+1) == v2);
    };

    let skip = function(off) {
        i += off;
    };

    let readU16 = function() {
        let v = (i < db.length - 1)? db.readUInt16LE(i) : 0;
        i += 2;
        return v;
    };

    let readS16 = function() {
        let v = (i < db.length - 1)? db.readInt16LE(i) : 0;
        i += 2;
        return v;
    };

    let readMBF32 = function() {
        let mbf = new Array(4);
        for (let i = 0; i < mbf.length; i++) {
            mbf[i] = readU8();
        }
        if (mbf[3] == 0) return 0.0;

        let buf = new ArrayBuffer(mbf.length);
        let view = new DataView(buf);
        let sign = (mbf[2] & 0x80);
        let exp = (mbf[3] - 2) & 0xff;

        view.setUint8(3, sign | (exp >> 1));
        view.setUint8(2, ((exp << 7) & 0x80) | (mbf[2] & 0x7f));
        view.setUint8(1, mbf[1]);
        view.setUint8(0, mbf[0]);

        return view.getFloat32(0, true);
    }

    let readMBF64 = function() {
        let mbf = new Array(8);
        for (let i = 0; i < mbf.length; i++) {
            mbf[i] = readU8();
        }
        if (mbf[7] == 0) return 0.0;

        let sign = (mbf[6] & 0x80);
        mbf[6] &= 0x7f;
        let exp = (mbf[7] - 129 + 1023) & 0xffff;
        for (let i = 0; i < 7; i++) {
            mbf[i] = ((mbf[i] >> 3) | ((mbf[i + 1] << 5) & 0xff));
        }
        mbf[7] = (sign | ((exp >> 4) & 0x7f));
        mbf[6] = ((mbf[6] & 0x0f) | ((exp & 0x0f) << 4));

        let buf = new ArrayBuffer(mbf.length);
        let view = new DataView(buf);
        mbf.forEach(function (b, i) {
            view.setUint8(i, b);
        });
        return view.getFloat64(0, true);
    }

    /**
     * unprotect(db)
     *
     * From: https://slions.net/threads/deciphering-gw-basic-basica-protected-programs.50/:
     *
     *  "The American Cryptogram Association (ACA) publishes a bimonthly periodical journal called The Cryptogram.
     *   In their Computer Supplement #19 of summer 1994, Paul C. Kocher published BASCRACK, a C program to decipher
     *   GW-BASIC protected files."
     *
     * This is a JavaScript port of BASCRACK.
     *
     * @param {DataBuffer} db
     * @returns {DataBuffer}
     */
    let unprotect = function(db) {
        const key1 = [
            0xA9, 0x84, 0x8D, 0xCD, 0x75, 0x83, 0x43, 0x63, 0x24, 0x83, 0x19, 0xF7, 0x9A
        ];
        const key2 = [
            0x1E, 0x1D, 0xC4, 0x77, 0x26, 0x97, 0xE0, 0x74, 0x59, 0x88, 0x7C
        ]
        if (db.readUInt8(0) == 0xFE) {                  // 0xFE: protected GW-BASIC signature byte
            let index = 0;
            let dbNew = new DataBuffer(db.length);
            let i = 0;
            dbNew.writeUInt8(0xFF, i++);                // 0xFF: unprotected GW-BASIC signature byte
            while (i < db.length) {
                let b = db.readUInt8(i);
                if (b != 0x1A || i < db.length - 1) {   // don't "decrypt" the final byte if it's 0x1A (EOF)
                    b -= 11 - (index % 11);
                    b ^= key1[index % 13];
                    b ^= key2[index % 11];
                    b += 13 - (index % 13);
                    index = (index+1) % (13*11);
                }
                dbNew.writeUInt8(b & 0xFF, i++);
            }
            db = dbNew;
        }
        return db;
    }

    let getToken = function(line) {
        let token = null;                               // null will signal end of tokens for the line
        let v = readU8();
        if (v) {
            /*
             * The original code failed to account for programs that include IBM PC drawing characters
             * inside strings or comments or DATA statements, and those characters can be (almost) any 8-bit
             * value, which is why we must track the "quote" and "comment" and "data" states of the text
             * stream and decode accordingly.
             *
             * I say "almost" because there are a few control characters (below 0x20) that you can't embed
             * inside strings.  But many can be.  For example, you can use the IBM PC's "Alt Num Keypad"
             * trick to enter decimal character 16 and a "►" will appear.
             *
             * For text that's not quoted or commented, we still have to handle 0x3A (colon) elsewhere,
             * because it's a weird one; see the 'default' case below.
             */
            if ((comment || quote || data && v != 0x3A) && v < 0xFF || v >= 0x20 && v <= 0x7E && v != 0x3A) {
                token = String.fromCharCode(v);
                if (fNormalize && v != 0x09) {          // normalize all characters except TAB
                    token = CharSet.fromCP437(token, true);
                }
                if (v == 0x22 && !comment) quote = !quote;
            }
            else {
                if (v >= 0xFD) {
                    v = (v << 8) | readU8();
                }
                switch (v) {
                case 0x0B:
                    token = "&O" + readU16().toString(8);
                    break;
                case 0x0C:
                    token = "&H" + readU16().toString(16).toUpperCase();
                    break;
                case 0x0E:
                    token = readU16().toString();
                    break;
                case 0x0F:
                    token = readU8().toString();
                    break;
                case 0x1C:
                    token = readS16().toString();
                    break;
                case 0x1D:
                    token = readMBF32().toPrecision(7).replace(/0+$/, "");
                    break;
                case 0x1F:
                    token = readMBF64().toPrecision(15).replace(/0+$/, "") + '#';
                    break;
                default:
                    if (v == 0x3A) {
                        if (peekU8(0xA1)) {
                            token = "ELSE";
                            skip(1);
                            break;
                        }
                        if (peekU16(0x8F, 0xD9)) {
                            token = "'";
                            comment = true;
                            skip(2);
                            break;
                        }
                        token = String.fromCharCode(v);
                        data = false;                   // unlike REM, other colon-separated statements CAN appear after a DATA statement
                        break;
                    }
                    if (v == 0xB1 && peekU8(0xE9)) {
                        token = "WHILE";
                        skip(1);
                        break;
                    }
                    token = tokens[v];
                    if (token == "REM") {
                        comment = true;
                    }
                    else if (token == "DATA") {
                        data = true;
                    }
                    break;
                }
                if (!token) {
                    if (v == 0x09) {                    // we'll pass TABs through
                        token = String.fromCharCode(v);
                    } else if (v == 0x0A) {
                        token = "";                     // and we'll ignore embedded LFs
                    } else {
                        /*
                         * I've seen DATA statements with embedded non-ASCII characters, so at this point,
                         * we pretty much have to encode anything else as raw text.  But first, we must un-read
                         * any extra byte we fetched above.
                         */
                        let u = v;
                        if (v >= 0xFD00) {
                            i--;                        // un-read the extra byte
                            v >>= 8;                    // and shift the value back to 8 bits
                        }
                        token = String.fromCharCode(v);
                        if (fNormalize) {
                            token = CharSet.fromCP437(token, true);
                        }
                        if (lineWarning != line) {
                            printf("warning: %s contained unusual bytes (eg, %#x on line %d)\n", sPath, u, line);
                            lineWarning = line;         // one such warning per line is enough...
                        }
                    }
                }
            }
        }
        return token;
    }

    db = unprotect(db);

    let b = readU8();
    if (b == 0xFF) {
        while (!EOF()) {
            /*
             * Every line in the file begins with two 16-bit values: the offset of the *next* line,
             * and the line number of the *current* line.  The offset can be used as a sanity check
             * (eg, for file integrity) but we're not going to bother; all we check for here is
             * an offset of ZERO, which effectively means end-of-program, and it's normally followed
             * by an EOF byte (0x1A) (and which we'll pass along, *unless* we're "normalizing" the text).
             */
            let off = readU16();
            if (!off) {
                if (peekU8(0x1A)) {
                    if (!fNormalize) s += String.fromCharCode(0x1A);
                } else if (!EOF()) {
                    printf("warning: %s contains non-EOF at offset %#x (%#x)\n", sPath, i, readU8());
                }
                break;
            }
            let t;
            let line = readU16();
            s += line + " ";        // BASIC defaults to one space between line number and first token
            while ((t = getToken(line)) !== null) {
                s += t;
            }
            s += (fNormalize? "\n" : "\r\n");
            quote = false;          // if you end a line with an open quote, BASIC automatically "closes" it
            comment = data = false; // ditto for comments and DATA statements
        }
        db = new DataBuffer(s);
    }
    else if (fNormalize) {
        db = normalizeForHost(db);
    }
    return db;
}

/**
 * extractFile(sDir, subDir, sPath, attr, date, db, argv, noExpand, files)
 *
 * @param {string} sDir
 * @param {string} subDir
 * @param {string} sPath
 * @param {number} attr
 * @param {Date} date
 * @param {Buffer} db
 * @param {Object} argv
 * @param {boolean} [noExpand]
 * @param {Array.<fileData>} [files]
 */
function extractFile(sDir, subDir, sPath, attr, date, db, argv, noExpand, files)
{
    /*
     * OS X / macOS loves to scribble bookkeeping data on any read-write diskettes or diskette images that
     * it mounts, so if we see any of those remnants (which we use to limit to "(attr & DiskInfo.ATTR.HIDDEN)"
     * but no longer assume they always will hidden), then we ignore them.
     *
     * This is why I make all my IMG files read-only and also write-protect physical diskettes before inserting
     * them into a drive.  Other operating systems pose similar threats.  For example, Windows 9x likes to modify
     * the 8-byte OEM signature field of a diskette's boot sector with unique volume-tracking identifiers.
     */
    if (sPath.endsWith("~1.TRA") || sPath.endsWith("TRASHE~1") || sPath.indexOf("FSEVEN~1") >= 0) {
        return true;
    }

    sPath = path.join(sDir, subDir, sPath);
    let sFile = sPath.substr(sDir != '.' && sDir.length? sDir.length + 1 : 0);

    let fSuccess = false;
    let dir = path.dirname(sPath);
    makeDir(getFullPath(dir), true, argv['overwrite']);
    if (attr & DiskInfo.ATTR.SUBDIR) {
        fSuccess = makeDir(getFullPath(sPath), true);
    } else if (!(attr & DiskInfo.ATTR.VOLUME)) {
        let fPrinted = false;
        let fQuiet = argv['quiet'];
        if (argv['collection']) {
            if (existsFile(sPath)) {
                if (!fPrinted && !fQuiet) printf("extracted: %s\n", sFile);
                return true;
            }
        }
        if (argv['expand'] && !noExpand) {
            let arcType = isArchiveFile(sFile);
            if (arcType) {
                if (!fQuiet) printf("expanding: %s\n", sFile);
                if (arcType == StreamZip.TYPE_ZIP && db.readUInt8(0) == 0x1A) {
                    /*
                     * How often does this happen?  I don't know, but look at CCTRAN.ZIP on PC-SIG DISK2631. #ZipAnomalies
                     */
                    arcType = StreamZip.TYPE_ARC;
                    printf("warning: overriding %s as type ARC (%d)\n", sFile, arcType);
                }
                if (arcType == StreamZip.TYPE_ZIP && db.readUInt32LE(0) == 0x08074B50) {
                    // db = db.slice(0, db.length - 4);
                    printf("warning: ZIP extended header signature detected (%#08x)\n", 0x08074B50);
                }
                let zip = new StreamZip({
                    file: sFile,
                    password: argv['password'],
                    buffer: db.buffer,
                    arcType: arcType,
                    storeEntries: true,
                    nameEncoding: "ascii",
                    printfDebug: printf,
                    holdErrors: true
                }).on('ready', () => {
                    let aFileData = getArchiveFiles(zip, argv['verbose']);
                    for (let file of aFileData) {
                        extractFile(sDir, sFile, file.path, file.attr, file.date, file.data, argv, false, file.files);
                    }
                    zip.close();
                }).on('error', (err) => {
                    printError(err, sFile);
                    /*
                     * Since this implies a failure to extract anything from the archive, we'll call ourselves
                     * back with noExpand set to true, so that we simply extract the archive without expanding it.
                     */
                    extractFile(sDir, subDir, sFile, attr, date, db, argv, true);
                });
                zip.open();
                /*
                 * If we 'expand' the contents of an archive, then we likely don't want to also save the
                 * archive itself, so we return now.  If you do want both, we'll have to add a new option.
                 */
                return true;
            }
        }
        if (!fQuiet) printf("extracting: %s\n", sFile);
        /*
         * Originally, "normalize" was just an import option (to fix line endings of known text files on
         * disks we created); however, I'm going to make it an export option as well, and not just to revert
         * line endings, but to also address the fact that there are a lot of old "tokenized" BASIC files out
         * in the world, and they are much easier to work with locally in their "de-tokenized" form.
         */
        if (argv['normalize']) {
            /*
             * BASIC files are dealt with separately, because there are 3 kinds: ASCII (for which we just
             * call normalizeForHost()), tokenized (which we convert to ASCII and automatically normalize in
             * the process), and protected (which we decrypt and then de-tokenize).
             */
            if (isBASICFile(sPath)) {
                /*
                 * In addition to "de-tokenizing", we're also setting convertBASICFile()'s normalize parameter
                 * to true, to convert characters from CP437 to UTF-8, revert line-endings, and omit EOF.  We're
                 * currently combining both features as part of the "normalize" process.
                 */
                db = convertBASICFile(sPath, db, true);
            }
            else if (isTextFile(sPath)) {
                db = normalizeForHost(db);
            }
        }
        fSuccess = writeFile(getFullPath(sPath), db, true, argv['overwrite'], !!(attr & DiskInfo.ATTR.READONLY), argv['quiet']);
    }
    if (fSuccess) {
        fs.utimesSync(getFullPath(sPath), date, date);
        if (files) {
            for (let file of files) {
                if (!extractFile(sDir, subDir, file.path, file.attr, file.date, file.data, argv, false, file.files)) {
                    fSuccess = false;
                    break;
                }
            }
        }
    }
    return fSuccess;
}

/**
 * mapDiskToServer(diskFile)
 *
 * @param {string} diskFile
 * @param {boolean} [fRemote] (true to return remote address)
 * @returns {string}
 */
function mapDiskToServer(diskFile, fRemote)
{
    if (useServer || !existsFile(getFullPath(diskFile)) || fRemote) {
        diskFile = diskFile.replace(/^\/disks\/(diskettes|gamedisks|miscdisks|harddisks|decdisks|pcsigdisks|pcsig[0-9a-z]*-disks|private)\//, "https://$1.pcjs.org/").replace(/^\/disks\/cdroms\/([^/]*)\//, "https://$1.pcjs.org/");
    }
    return diskFile;
}

/**
 * printFileDesc(diskFile, diskName, desc)
 *
 * @param {string} diskFile
 * @param {string} diskName
 * @param {Object} desc
 */
function printFileDesc(diskFile, diskName, desc)
{
    printf("%-32s  %-12s  %s  %s %7d  %s\n", desc[DiskInfo.FILEDESC.HASH] || "-".repeat(32), desc[DiskInfo.FILEDESC.NAME], desc[DiskInfo.FILEDESC.DATE], desc[DiskInfo.FILEDESC.ATTR], desc[DiskInfo.FILEDESC.SIZE] || 0, diskName + ':' + desc[DiskInfo.FILEDESC.PATH]);
}

/**
 * printManifest(diskFile, diskName, manifest)
 *
 * @param {string} diskFile
 * @param {string} diskName
 * @param {Array.<FILEDESC>} manifest
 */
function printManifest(diskFile, diskName, manifest)
{
    manifest.forEach(function printManifestFile(desc) {
        printFileDesc(diskFile, diskName, desc);
    });
}

/**
 * processDisk(di, diskFile, argv, diskette)
 *
 * @param {DiskInfo} di
 * @param {string} diskFile
 * @param {Array} argv
 * @param {Object} [diskette] (if present, then we were invoked by readCollection(), so any --output option should be ignored)
 */
function processDisk(di, diskFile, argv, diskette)
{
    di.setArgs(argv.slice(1).join(' '));

    /*
     * Any "--format=xxx" acts as a filter function; if the disk's format doesn't contain
     * the specified format, we skip the disk.
     */
    if (typeof argv['format'] == "string") {
        let sFormat = di.getFormat();
        if (sFormat.indexOf(argv['format']) < 0) {
            printf("warning: specified format (\"%s\") does not match disk format (\"%s\")\n", argv['format'], sFormat);
            return;
        }
    }

    if (!argv['quiet']) {
        printf("processing: %s (%d bytes, checksum %d, hash %s)\n", di.getName(), di.getSize(), di.getChecksum(), di.getHash());
    }

    let sFindName = argv['file'];
    if (typeof sFindName == "string") {
        let sFindText = argv['find'];
        if (typeof sFindText != "string") sFindText = undefined;
        /*
         * TODO: Implement support for finding text in findFile()....
         */
        let desc = di.findFile(sFindName, sFindText);
        if (desc) {
            printFileDesc(di.getName(), desc);
            if (argv['index']) {
                /*
                 * We cheat and search for matching hash values in the provided index; this is much faster than laboriously
                 * opening and searching all the other disk images, even when they DO contain pre-generated file tables.
                 */
                if (sFileIndex === undefined) {
                    sFileIndex = readFile(argv['index']);
                    if (!sFileIndex) sFileIndex = null;
                }
                let cMatches = 0;
                if (sFileIndex) {
                    let re = new RegExp("^" + desc[DiskInfo.FILEDESC.HASH] + ".*$", "gm"), match;
                    while ((match = re.exec(sFileIndex))) {
                        if (match[0].indexOf(diskFile) >= 0) continue;
                        if (!cMatches++) printf("see also:\n");
                        printf("%s\n", match[0]);
                    }
                }
                if (!cMatches) printf("no matches\n");
            }
        }
    }

    let chs = argv['dump'];
    if (chs) {
        if (typeof chs != "string") {
            printf("specify --dump=C:H:S[:N]\n");
        } else {
            let values = chs.split(':');
            let iCylinder = +values[0], iHead = +values[1], idSector = +values[2], nSectors = +values[3] || 1;
            while (nSectors-- > 0) {
                let sector = di.seek(iCylinder, iHead, idSector);
                if (!sector) {
                    printf("unable to find %d:%d:%d\n", iCylinder, iHead, idSector);
                    break;
                }
                let sLines = sprintf("CHS=%d:%d:%d\n", iCylinder, iHead, idSector);
                sLines += dumpSector(di, sector, 0);
                printf("%s\n", sLines);
                idSector++;
            }
        }
    }

    if (argv['list']) {
        let sLines = "";
        let iVolume = +argv['volume'];
        if (isNaN(iVolume)) iVolume = -1;
        if (argv['list'] == "unused") {
            let lba = -1;
            while ((lba = di.getUnusedSector(iVolume, lba)) >= 0) {
                let sector = di.getSector(lba);
                let offset = di.getUnusedSectorData(sector);
                sLines += sprintf("\nLBA=%d\n", lba);
                /*
                 * There are two partial sector usage cases: the current sector contains the last N bytes of a file,
                 * or the sector is COMPLETELY unused (ie, offset is zero).  When would a file have a completely unused
                 * sector?  When the disk's cluster size is 2 or more sectors.  If a file ends somewhere in the middle
                 * of a cluster, leaving 1 or more sectors in that cluster unused, we still "flag" all the sectors in
                 * the cluster as belonging to the file.
                 *
                 * This is why we don't differentiate those cases on the basis of whether there's an associated file,
                 * but simply on whether the offset is zero.
                 */
                if (offset) {
                    let iFile = sector[DiskInfo.SECTOR.FILE_INDEX];
                    device.assert(iFile != undefined);
                    let file = di.fileTable[iFile];
                    let cbPartial = file.size - sector[DiskInfo.SECTOR.FILE_OFFSET];
                    sLines += sprintf("last %d bytes of %s:\n", cbPartial, file.path);
                    sLines += dumpSector(di, sector, 0, offset);
                }
                sLines += sprintf("unused %d bytes:\n", di.cbSector - offset);
                sLines += dumpSector(di, sector, offset);
            }
            if (!sLines) sLines = "no unused data space on disk";
        } else {
            /*
             * Other --list options include: "metadata", "sorted"
             */
            sLines = di.getFileListing(iVolume, 0, argv['list']) || "\tno listing available\n";
        }
        printf("%s\n", sLines);
    }

    if (argv['extract']) {
        let extractDir = argv['extdir'];
        if (typeof extractDir != "string") {
            extractDir = "";
        } else {
            extractDir = extractDir.replace("%d", path.dirname(diskFile));
        }
        let manifest = di.getFileManifest(null, false);             // pass true for sorted manifest
        manifest.forEach(function extractDiskFile(desc) {
            /*
             * Parse each file descriptor in much the same way that buildFileTableFromJSON() does.  That function
             * doesn't get the file's CONTENTS, because it's working with the file descriptors that have been stored
             * in a JSON file (where CONTENTS would be redundant and a waste of space).  Here, we call getFileManifest(),
             * which calls getFileDesc(true), which returns a complete file descriptor that includes CONTENTS.
             */
            let sPath = desc[DiskInfo.FILEDESC.PATH];
            if (sPath[0] == path.sep) sPath = sPath.substr(1);      // PATH should ALWAYS start with a slash, but let's be safe
            let name = path.basename(sPath);
            let size = desc[DiskInfo.FILEDESC.SIZE] || 0;
            let attr = +desc[DiskInfo.FILEDESC.ATTR];
            /*
             * We call parseDate() requesting a *local* date from the timestamp, because that's exactly how we're going
             * to use it: as a local file modification time.  We used to deal exclusively in UTC dates, unpolluted
             * by timezone information, but here we don't really have a choice.  Trying to fix the date after the fact,
             * by adding Date.getTimezoneOffset(), doesn't always work either, probably due to Daylight Savings Time issues;
             * best not to go down that rabbit hole.
             */
            let date = device.parseDate(desc[DiskInfo.FILEDESC.DATE], true);
            let contents = desc[DiskInfo.FILEDESC.CONTENTS] || [];
            let db = new DataBuffer(contents);
            device.assert(size == db.length);
            let extractFolder = (typeof argv['extract'] != "string")? di.getName() : "";
            if (extractFolder || name == argv['extract']) {
                let fSuccess = false;
                if (argv['collection']) {
                    extractFolder = getFullPath(path.join(path.dirname(diskFile), "archive", extractFolder));
                    if (diskFile.indexOf("/private") == 0 && diskFile.indexOf("/disks") > 0) {
                        extractFolder = extractFolder.replace("/disks/archive", "/archive");
                    }
                }
                extractFile(path.join(extractDir, extractFolder), "", sPath, attr, date, db, argv);
            }
        });
    }

    if (argv['manifest']) {
        let manifest = di.getFileManifest(getHash, argv['sorted'], argv['metadata']);
        printManifest(diskFile, di.getName(), manifest);
    }

    /*
     * If --rewrite, then rewrite the JSON disk image.  --overwrite is implicit.
     */
    if (argv['rewrite']) {
        if (diskFile.endsWith(".json")) {
            writeDisk(diskFile, di, argv['legacy'], 0, true, argv['quiet'], undefined, argv['source']);
        }
    }

    /*
     * If --checkdisk, then let's load the corresponding archived disk image (.IMG) as well, convert it to JSON,
     * load the JSON as a disk image, save it as a temp .IMG, and verify that temp image and archived image are identical.
     *
     * You must ALSO specify --rebuild if you want the JSON disk image updated as well.
     */
    if (argv['checkdisk'] && diskette) {
        if (diskette.format) {
            let matchFormat = diskette.format.match(/PC([0-9]+)K/);
            if (matchFormat) {
                let diskSize = di.getSize();
                if (+matchFormat[1] * 1024 != diskSize) {
                    printf("warning: format '%s' does not match disk size (%d) for %s\n", diskette.format, diskSize, diskFile);
                }
            }
        }
        /*
         * If a JSON disk image was originally built from kryoflux data AND included special args (eg, for copy-protection),
         * then don't bother with the rebuild, because those disks can't be saved as IMG disk images.
         */
        if (diskFile.endsWith(".json") && !(diskette.kryoflux && diskette.args)) {
            if (typeof argv['checkdisk'] == "string" && diskFile.indexOf(argv['checkdisk']) < 0) return;
            createDisk(diskFile, diskette, argv, function(diTemp) {
                let sTempJSON = path.join(rootDir, "tmp", path.basename(diskFile).replace(/\.[a-z]+$/, "") + ".json");
                diTemp.setArgs(sprintf("%s --output %s%s", diskette.command, sTempJSON, diskette.args));
                writeDisk(sTempJSON, diTemp, argv['legacy'], 0, true, true, undefined, diskette.source);
                let warning = false;
                if (diskette.archive.endsWith(".img")) {
                    let json = diTemp.getJSON();
                    diTemp.buildDiskFromJSON(json);
                    let sTempIMG = sTempJSON.replace(".json",".img");
                    writeDisk(sTempIMG, diTemp, true, 0, true, true, undefined, diskette.source);
                    if (!compareDisks(sTempIMG, diskette.archive)) {
                        printf("warning: %s unsuccessfully rebuilt\n", diskette.archive);
                        warning = true;
                    } else {
                        fs.unlinkSync(sTempIMG);
                    }
                }
                if (!warning) {
                    if (argv['rebuild']) {
                        printf("rebuilding %s\n", diskFile);
                        fs.renameSync(sTempJSON, getFullPath(diskFile));
                    } else {
                        fs.unlinkSync(sTempJSON);
                    }
                }
            });
        }
    }

    /*
     * If --checkpage, then get the disk's listing and see if it's up-to-date in the website's index.md.
     *
     * Additionally, if the page doesn't have a machine, add one, tailored to the software's requirements as best we can.
     *
     * You must ALSO specify --rebuild if you want the index.md updated (or created) as well.
     */
    if (argv['checkpage'] && diskette && !diskette.hidden && !diskette.demos) {
        /*
         * We don't need/want any software pages checked/built for private diskette collections.
         *
         * The PCSIG08 software pages (originally at /software/pcx86/shareware/pcsig08/ and later moved
         * to /software/pcx86/sw/misc/pcsig08/) were hand-generated, so it would take some extra effort
         * to automatically rebuild those.  However, those pages no longer use their own set of diskette
         * images at pcsig8a-disks.pcjs.org and pcsig8b-disks.pcjs.org, and the pages themselves are now
         * deprecated in favor of the more complete set of pages at /software/pcx86/sw/misc/pcsig/, so the
         * "pcsig8" exception below is a bit moot now.
         */
        if (diskFile.indexOf("/private") >= 0 || diskFile.indexOf("/pcsig8") >= 0) return;

        let sListing = di.getFileListing(0, 4);
        if (!sListing) return;
        let sIndex = "", sIndexNew = "", sAction = "";
        let sHeading = "\n### Directory of " + diskette.name + "\n";
        let sIndexFile = path.join(path.dirname(diskFile.replace(/\/(disks\/|)(diskettes|gamedisks|miscdisks|harddisks|pcsigdisks|pcsig[0-9a-z-]*-disks|private)\//, "/software/")), "index.md");
        if (existsFile(sIndexFile)) {
            sIndex = sIndexNew = readFile(sIndexFile);
            sAction = "updated";
        } else {
            if (diskette.title) {
                let sTitle = diskette.title;
                if (sTitle.match(/[#:[\]{}]/)) {
                    sTitle = '"' + sTitle + '"';
                }
                let permalink = path.dirname(diskette.path.replace(/^\/(disks\/|)[^/]+/, "/software")) + path.sep;
                sIndexNew = "---\nlayout: page\ntitle: " + sTitle + "\npermalink: " + permalink + "\n---\n";
                sIndexNew += sHeading + sListing;
                sAction = "created";
            }
        }

        /*
         * Step 1: make sure there's a machine present to load/examine/test the software.
         */
        let sMachineEmbed = "";
        let matchFrontMatter = sIndexNew.match(/^---\n([\s\S]*?\n)---\n/);
        if (matchFrontMatter && diskette) {
            let sFrontMatter = matchFrontMatter[1];
            let matchMachines = sFrontMatter.match(/^machines: *\n([\s\S]*?\n)(\S|$)/m);
            if (matchMachines) {
                /*
                 * If this was a generated machine and --rebuild is set, then we'll regenerate it.
                 */
                if (matchMachines[1].indexOf("autoGen: true") >= 0 && matchMachines[1].indexOf(diskette.name) >= 0 && argv['rebuild']) {
                    sFrontMatter = sFrontMatter.replace(matchMachines[0], matchMachines[2]);
                    sIndexNew = sIndexNew.replace(/\n\{% include machine.html .*?%\}\n/, "");
                    matchMachines = null;
                }
            }
            if (!matchMachines) {
                /*
                 * To add a compatible machine, we look at a few aspects of the diskette itself:
                 *
                 *      if the diskette format > 360K or any file dates are >= 1986, then a PC AT ("5170") is preferred;
                 *      otherwise, if any file dates are >= 1984, a PC XT ("5160") is preferred;
                 *      otherwise, a PC ("5150") should suffice.
                 *
                 * However, a diskette's "version" definition can also include a "@hardware" configuration with "options"
                 * that supplement or override those initial preferences:
                 *
                 *      manufacturer, such as "ibm" or "compaq"
                 *      model, such as "5150" or "5160"
                 *      video preference, such as "mda" or "cga"
                 *      memory preference, such "256kb" or "640kb"
                 *      hardware preference, such as "com1" or "mouse"
                 *      operating system (aka boot disk) preference, such as "PC DOS 2.00 (Disk 1)"
                 *
                 * Browse diskettes.json for more examples (look for "@hardware" properties).
                 *
                 * TODO: Finish support for all of the above preferences (eg, mouse support, serial and parallel ports, etc).
                 *
                 * TODO: Consider using the @hardware 'machine' property to allow a specific machine to be used; when that property
                 * is named 'url' instead, the /_includes/explorer/software.html template uses it to create a hardware_url link for the
                 * software, but we REALLY prefer having dedicated pages for each piece of software.
                 */
                let diskSize = di.getSize() / 1024;
                let dateNewest = di.getNewestDate(true);
                let yearNewest = dateNewest && dateNewest.getFullYear() || 1981;
                let hardware = diskette.hardware || {}, options = "";
                if (hardware) options = hardware.options || "";
                let aOptions = options.split(",");
                let findOption = function(aPossibleOptions) {
                    for (let i = 0; i < aPossibleOptions.length; i++) {
                        if (!aPossibleOptions[i]) continue;
                        for (let j = 0; j < aOptions.length; j++) {
                            if (aOptions[j].indexOf(aPossibleOptions[i]) >= 0) return aOptions[j];
                        }
                    }
                    return aPossibleOptions[0];
                };
                let findConfig = function(configPath) {
                    configPath = getFullPath(configPath);
                    let configPossible;
                    let aPossibleConfigs = glob.sync(configPath);
                    let optionMemory = findOption(["kb"]);
                    for (let i = 0; i < aPossibleConfigs.length; i++) {
                        let configFile = aPossibleConfigs[i];
                        if (configFile.indexOf("debugger") > 0 || configFile.indexOf("array") > 0) continue;
                        configPossible = configFile.substr(rootDir.length);
                        if (configFile.indexOf(optionMemory) >= 0) break;
                    }
                    return configPossible;
                };
                /*
                 * Now that we have all the raw inputs ("ingredients"), let's toss some defaults together.
                 */
                let sAutoGen = "    autoGen: true\n";
                let sAutoType = hardware.autoType;
                if (sAutoType == undefined) sAutoType = diskette.autoType;
                let manufacturer = findOption(["ibm","compaq"]);
                let sDefaultIBMModel = diskSize > 360 || yearNewest >= 1986? "5170" : (yearNewest >= 1984? "5160" : "5150");
                let sDefaultCOMPAQModel = diskSize > 360 || yearNewest >= 1986? "deskpro386" : "portable";
                let model = findOption({
                    "ibm": [sDefaultIBMModel, "5150","5160","5170"],
                    "compaq": [sDefaultCOMPAQModel, "portable","deskpro386"]
                }[manufacturer]);
                let video = findOption(["*","mda","cga","ega","vga","vdu"]);
                let configFile = hardware.config || findConfig("/machines/pcx86/" + manufacturer + '/' + model + '/' + video + "/**/machine.xml");
                if (configFile == "none") configFile = "";
                if (configFile) {
                    let bootDisk = findOption(["", "DOS"]);
                    let demoDisk = diskette.name;
                    let sDiskettes = "";
                    let diskMatch = diskFile.match(/\/pcsig\/([0-9])[0-9]+-/);
                    if (diskMatch) {
                        sDiskettes = "    diskettes: /machines/pcx86/diskettes.json,/disks/pcsigdisks/pcx86/diskettes.json\n";
                    }
                    if (diskette.bootable) {
                        bootDisk = demoDisk;
                        demoDisk = "";
                    } else {
                        if (sAutoType == undefined) sAutoType = "$date\\r$time\\rB:\\rDIR\\r";
                    }
                    let sMachineID = (model.length <= 4? manufacturer : "") + model;
                    let sMachine = "  - id: " + sMachineID + "\n    type: pcx86\n    config: " + configFile + "\n";
                    for (let prop in hardware) {
                        if (prop == "autoType" || prop == "config" || prop == "machine" || prop == "options" || prop == "url" || prop[0] == '@') continue;
                        let chQuote = "";
                        if (prop == "drives" || prop == "floppyDrives") {
                            chQuote = "'";
                            if (prop == "drives") bootDisk = "None";
                            sAutoType = "";
                        }
                        sMachine += "    " + prop + ": " + chQuote + hardware[prop] + chQuote + "\n";
                    }
                    if (bootDisk) bootDisk = "      A: \"" + bootDisk + "\"\n";
                    if (demoDisk) demoDisk = "      B: \"" + demoDisk + "\"\n";
                    let sAutoMount = "    autoMount:\n" + bootDisk + demoDisk;
                    if (sAutoType) sAutoType = "    autoType: " + sAutoType + "\n";
                    sFrontMatter += "machines:\n" + sMachine + sDiskettes + sAutoGen + sAutoMount + (sAutoType || "");
                    sIndexNew = sIndexNew.replace(matchFrontMatter[1], sFrontMatter);
                    sMachineEmbed = "\n{% include machine.html id=\"" + sMachineID + "\" %}\n";
                }
            }
        }

        /*
         * Step 2: Making sure there's an up-to-date directory listing.  The listing can include a picture of
         * the diskette, if any, and a link to the source of the diskette, if any, so append those to the listing now.
         *
         * Picture example:
         *
         *      ![MS C 1.03 Beta (Disk 1)]({{ site.software.miscdisks.server }}/pcx86/lang/microsoft/c/1.03/MSC103-BETA-DISK1.jpg)
         */
        let sDiskPic = diskette.path.replace(".json", ".jpg");
        if (!existsFile(sDiskPic)) {
            sDiskPic = diskette.path.replace(".json", ".png");
        }
        if (existsFile(sDiskPic)) {
            let sDiskServer = getDiskServer(sDiskPic);
            if (sDiskServer) {
                sListing += "\n![" + diskette.name + "]({{ site.software." + sDiskServer.replace("disks/", "") + ".server }}" + sDiskPic.slice(sDiskServer.length + 1) + ")\n";
            }
            /*
             * Let's rematch the page header and see if the page also needs a preview image.
             */
            matchFrontMatter = sIndexNew.match(/^(---\n[\s\S]*?\n---\n)/);
            if (matchFrontMatter) {
                let sFrontMatter = matchFrontMatter[1];
                let match = sFrontMatter.match(/\npreview:.*\n/);
                if (!match) {
                    match = sFrontMatter.match(/\npermalink:.*\n/);
                    if (match) {
                        let n = match.index + match[0].length;
                        sDiskPic = mapDiskToServer(sDiskPic, true);
                        sFrontMatter = sFrontMatter.slice(0, n) + "preview: " + sDiskPic + "\n" + sFrontMatter.slice(n);
                        sIndexNew = sFrontMatter + sIndexNew.slice(matchFrontMatter[0].length);
                    }
                }
            }
        }
        if (diskette.source && !diskette.source.indexOf("http")) {
            sListing += "\n[[Source](" + diskette.source + ")]\n";
        }

        let sMatch = "\n(##+)\\s+Directory of " + diskette.name.replace("(","\\(").replace(")","\\)").replace("*","\\*").replace("+","\\+") + " *\n([\\s\\S]*?)(\n[^!{[\\s]|$)";
        let matchDirectory = sIndexNew.match(new RegExp(sMatch));
        if (matchDirectory) {
            if (matchDirectory[1].length != 3) {
                printf("warning: directory heading level '%s' should really be '###'\n", matchDirectory[1]);
            }
            let matchInclude = matchDirectory[2].match(/\n\{%.*?%}\n/);
            /*
             * Work around JavaScript's handling of '$' in the replacement string ('$' is interpreted as a back-reference
             * indicator, with '$$' interpreted as '$', even when the search string is NOT a regular expression) by first
             * replacing every '$' with '$$' in sListing (the only portion where we're likely encounter '$' characters).
             *
             * Note that the work-around itself is subject to the interpretation of '$$' as '$', therefore it must use '$$$$'.
             */
            sIndexNew = sIndexNew.replace(matchDirectory[0], sHeading + (matchInclude? matchInclude[0] : "") + sListing.replace(/\$/g, "$$$$") + matchDirectory[3]);
        } else {
            /*
             * Look for the last "Directory of ..." entry and insert this directory listing after it (and if there's none, append it).
             */
            sListing = sHeading + sListing;
            let matchLast, match, re = /\n(##+)\\s+Directory of [^\n]*\n([\\s\\S]*?)\n(\\S|$)/g;
            while ((match = re.exec(sIndexNew))) {
                matchLast = match;
            }
            let index = sIndexNew.length, length = 0;
            if (matchLast) {
                index = matchLast.index;
                length = matchLast[0].length;
                if (matchLast[3]) length--;
            }
            sIndexNew = sIndexNew.substr(0, index + length) + sListing + sIndex.substr(index + length);
        }

        /*
         * Step 3: If a generated machine needs to be embedded, put it just ahead of the first directory listing (which
         * is why we waited until now); if there are any diskette 'info' summary lines, we want it just ahead of those, too.
         */
        let info = ""
        if (diskette.info) {
            let i;
            info += "\n## Information about \"" + diskette.info.diskTitle + "\"\n\n";
            for (i = 0; i < diskette.info.diskSummary.length; i++) {
                info += "    " + diskette.info.diskSummary[i] + "\n";
            }
        }

        /*
         * Along with any diskette info, see if there are any files in the decompressed archive folder that we might want
         * to include in the index, too.
         */
        let samples = "";
        let sampleSpec = path.join(path.dirname(getFullPath(diskette.path)), "archive", "**", "*.{ASM,BAS,DOC,TXT}");
        let sampleFiles = glob.sync(sampleSpec);
        for (let sampleFile of sampleFiles) {
            let sample = readFile(sampleFile);
            if (sample) {
                if (isText(sample)) {
                    let fileType = sampleFile.endsWith(".BAS")? "bas" : "";
                    if (sample[sample.length-1] != '\n') sample += '\n';
                    sample = "{% raw %}\n```" + fileType + "\n" + sample /* .replace(/([^\n]*\n)/g, '    $1\n') */ + "```\n{% endraw %}\n";
                    samples += "\n## " + path.basename(sampleFile) + "\n\n" + sample;
                } else {
                    printf("warning: ignoring non-text file '%s'\n", sampleFile);
                }
            }
        }

        /*
         * Clean out any old info and then add any new info.  It should be bracketed by 'info_begin'/'info_end' comments.
         */
        let sInsert = sMachineEmbed;
        let match = sIndexNew.match(/\n\{% comment %\}info_begin\{% endcomment %\}[\S\s]*\{% comment %\}info_end\{% endcomment %\}\n\n/);
        if (match) {
            sIndexNew = sIndexNew.slice(0, match.index) + sIndexNew.slice(match.index + match[0].length);
        } else {
            let i = sIndexNew.indexOf(info);            // look for (old) unbracketed info, too (probably don't need this anymore)
            if (i >= 0) {
                sIndexNew = sIndexNew.slice(0, i) + sIndexNew.slice(i + info.length);
            }
        }
        if (info) {
            sInsert += "\n{% comment %}info_begin{% endcomment %}\n" + info + "{% comment %}info_end{% endcomment %}\n\n";
        }

        /*
         * Clean out any old samples and then add any new samples.  They should be bracketed by 'samples_begin'/'samples_end' comments.
         */
        match = sIndexNew.match(/\{% comment %\}samples_begin\{% endcomment %\}[\S\s]*\{% comment %\}samples_end\{% endcomment %\}\n/);
        if (match) {
            sIndexNew = sIndexNew.slice(0, match.index) + sIndexNew.slice(match.index + match[0].length);
        }
        if (samples) {
            sInsert += "{% comment %}samples_begin{% endcomment %}\n" + samples + "\n{% comment %}samples_end{% endcomment %}\n";
        }

        if (sInsert) {
            matchDirectory = sIndexNew.match(/\n(##+)\s+Directory of /);
            if (matchDirectory) {
                /*
                 * WARNING: This is another place where we need to work around JavaScript's handling of '$' in the replacement string.
                 */
                sIndexNew = sIndexNew.replace(matchDirectory[0], sInsert.replace(/\$/g, "$$$$") + matchDirectory[0]);
            } else {
                sIndexNew += sInsert;
            }
        }

        /*
         * Step 4: Add a document gallery section if there are any documents associated with this software.
         */
        if (diskette.documents) {
            let sHeader = "\n<!-- Documentation -->\n";
            let sGallery = sHeader + "\n{% include gallery/documents.html width=\"200\" height=\"260\" %}\n";
            if (sIndexNew && sIndexNew.indexOf(sHeader) < 0) {
                sIndexNew += sGallery;
            }
        }

        if (!sIndexNew) {
            printf("\tmissing index for \"%s\": %s\n", diskette.title, sIndexFile);
        }
        else if (sIndexNew != sIndex) {
            if (argv['rebuild']) {
                if (writeFile(getFullPath(sIndexFile), sIndexNew, true, true)) {
                    printf("\t%s index for \"%s\": %s\n", sAction, diskette.title, sIndexFile);
                }
            } else {
                printf("\tindex for \"%s\" should be %s (%s); use --rebuild\n", diskette.title, sAction, sIndexFile);
            }
        }
    }

    /*
     * NOTE: When recreating an IMG file from a JSON file, if the JSON file preserved the original BPB
     * (which includes the original OEM signature), then you can use --legacy to tell writeDisk() to tell
     * getData() to restore those BPB bytes as well.  Otherwise, we leave the PCJS_OEM signature, if any, alone.
     */
    if (!diskette) {
        if (argv['boot']) {
            di.updateBootSector(readFile(argv['boot'], null));
        }
        let output = argv['output'];
        if (!output || typeof output == "boolean") {
            output = argv[1];
        }
        if (output) {
            if (typeof output == "string") output = [output];
            output.forEach((outputFile) => {
                let file = outputFile.replace("%d", path.dirname(diskFile));
                writeDisk(file, di, argv['legacy'], argv['indent']? 2 : 0, argv['overwrite'], argv['quiet'], argv['writable'], argv['source']);
            });
        }
    }
}

/**
 * addMetaData(di, sDir, sPath)
 *
 * @param {DiskInfo} di
 * @param {string} sDir
 * @param {string} sPath
 */
function addMetaData(di, sDir, sPath)
{
    let sArchiveDir = checkArchive(sPath, true);
    if (sArchiveDir) {
        let sArchiveFile = checkArchive(sArchiveDir);
        if (sArchiveFile) {
            let aArchiveData = [];
            let aArchiveFiles = glob.sync(path.join(sArchiveDir, "**"));
            for (let j = 0; j < aArchiveFiles.length; j++) {
                let sPath = aArchiveFiles[j];
                let sName = path.basename(sPath);
                let stats = fs.statSync(sPath);
                if (!stats.isDirectory()) {
                    let data = readFile(sPath, null);
                    if (!data) continue;
                    let file = {
                        hash: getHash(data),
                        path: path.join(sArchiveFile, sPath.slice(sArchiveDir.length)).slice(sDir.length - 1),
                        attr: DiskInfo.ATTR.METADATA,
                        date: stats.mtime,
                        size: data.length
                    };
                    aArchiveData.push(file);
                }
            }
            di.addMetaData(aArchiveData);
        }
    }
}

/**
 * readCollection(argv)
 *
 * If "--collection=[string]" then the set of disks is limited to those where pathname contains [string].
 *
 * @param {Array} argv
 */
function readCollection(argv)
{
    let family = "pcx86";
    let asServers = ["diskettes", "gamedisks", "miscdisks", "pcsigdisks", "private"];
    let cCollections = 0, cDisks = 0;
    let asCollections = [];
    asServers.forEach((server) => {
        asCollections = asCollections.concat(glob.sync(path.join(rootDir, "disks" + path.sep + server + path.sep + family + path.sep + (server == "pcsigdisks"? "diskettes-annotated.json" : "diskettes.json"))));
    });
    let messages;
    if (argv['quiet']) {
        messages = device.setMessages(Device.MESSAGE.WARN + Device.MESSAGE.ERROR, false);
    }
    let aDiskNames = {};        // we use this table of disk names to detect non-unique disk names
    asCollections.forEach(function readAllCollections(collectionFile) {
        collectionFile = collectionFile.substr(rootDir.length);
        if (argv['verbose']) printf("reading collection %s...\n", collectionFile);
        let library = readJSON(collectionFile);
        if (library) {
            let aDiskettes = [];
            JSONLib.parseDiskettes(aDiskettes, library, "/pcx86", "/diskettes");
            aDiskettes.forEach(function readAllDiskettes(diskette) {
                diskette.argc = 0;
                diskette.argv = [];
                if (!diskette.args) {
                    diskette.args = "";
                } else {
                    [diskette.argc, diskette.argv] = pcjslib.getArgs(diskette.args);
                    diskette.args = " " + diskette.args;
                }
                /*
                 * TODO: I don't think '@local' is being used anymore, so consider removing this support.  The last
                 * place I saw it used was in the PCSIG08 diskettes.json files, but weblib.getResource() knows how to map
                 * local folder names (eg, /pcsig8a-disks) to the corresponding server names now, as does this module,
                 * so there's probably no longer any need for this.
                 */
                if (library['@local']) {
                    diskette.path = diskette.path.replace(library['@server'], library['@local']);
                }
                let diskFile = diskette.path;
                if (typeof argv['collection'] == "string") {
                    if (argv['verbose']) printf("checking %s for '%s'...\n", diskFile, argv['collection']);
                    if (diskFile.indexOf(argv['collection']) < 0) return;
                }
                let sName = path.basename(diskFile);
                if (aDiskNames[sName]) {
                    if (argv['verbose']) printf("warning: %s disk name is not unique (see %s)\n", diskFile, aDiskNames[sName]);
                } else {
                    aDiskNames[sName] = diskFile;
                }
                let di = readDisk(diskFile);
                if (!di) {
                    di = createDisk(diskFile, diskette, argv);
                    if (di) {
                        writeDisk(diskFile, di, false, 0, undefined, undefined, undefined, diskette.source);
                    }
                }
                if (di) {
                    processDisk(di, diskFile, argv, diskette);
                    cDisks++;
                }
            });
        }
        cCollections++;
    });

    printf("%d config(s), %d disks(s) processed\n\n", cCollections, cDisks);
    if (messages) device.setMessages(messages, true);
}

/**
 * readDir(sDir, arcType, arcOffset, sLabel, sPassword, fNormalize, kbTarget, nMax, verbose, done, sectorIDs, sectorErrors, suppData)
 *
 * @param {string} sDir (directory name)
 * @param {number} [arcType] (1 if ARC file, 2 if ZIP file, otherwise 0)
 * @param {number} [arcOffset] (0 if none)
 * @param {string} [sLabel] (if not set with --label, then basename(sDir) will be used instead)
 * @param {string} [sPassword] (password; for encrypted ARC files only at this point)
 * @param {boolean} [fNormalize] (if true, known text files get their line-endings "fixed")
 * @param {number} [kbTarget] (target disk size, in Kb; zero or undefined if no target disk size)
 * @param {number} [nMax] (maximum number of files to read; default is 256)
 * @param {boolean} [verbose] (true for verbose output)
 * @param {function(DiskInfo)} [done] (optional function to call on completion)
 * @param {Array|string} [sectorIDs]
 * @param {Array|string} [sectorErrors]
 * @param {string} [suppData] (eg, supplementary disk data that can be found in such files as: /software/pcx86/app/microsoft/word/1.15/debugger/index.md)
 * @returns {DiskInfo|null}
 */
function readDir(sDir, arcType, arcOffset, sLabel, sPassword, fNormalize, kbTarget, nMax, verbose, done, sectorIDs, sectorErrors, suppData)
{
    let di;
    let diskName = path.basename(sDir);
    if (sDir.endsWith(path.sep)) {
        if (!sLabel) {
            sLabel = diskName.replace(/^.*-([^0-9][^-]+)$/, "$1");
        }
    } else if (!arcType) {
        diskName = path.basename(path.dirname(sDir));
        /*
         * When we're given a list of files, we don't pick a default label; use --label if you want one.
         */
    }
    sDir = getFullPath(sDir);
    let readDone = function(aFileData) {
        let db = new DataBuffer();
        let di = new DiskInfo(device);
        if (di.buildDiskFromFiles(db, diskName, aFileData, kbTarget, getHash, sectorIDs, sectorErrors, suppData)) {
            if (done) {
                done(di);
                return null;
            }
            /*
             * Walk aFileData and look for archives accompanied by folders containing their expanded contents.
             */
            for (let i = 0; i < aFileData.length; i++) {
                addMetaData(di, sDir, aFileData[i].path);
            }
        }
        return di;
    };
    try {
        nMaxInit = nMaxCount = nMax || nMaxDefault;
        if (arcType) {
            readArchiveFiles(sDir, arcType, arcOffset, sLabel, sPassword, verbose, readDone);
        } else {
            di = readDone(readDirFiles(sDir, sLabel, fNormalize, 0));
        }
    } catch(err) {
        printError(err);
    }
    return di;
}

/**
 * readDirFiles(sDir, sLabel, fNormalize, iLevel)
 *
 * @param {string} sDir (directory name)
 * @param {boolean|null} [sLabel] (optional volume label; this should NEVER be set when reading subdirectories)
 * @param {boolean} [fNormalize] (if true, known text files get their line-endings "fixed")
 * @param {number} [iLevel] (current directory level, primarily for diagnostic purposes only; zero if unspecified)
 * @returns {Array.<FileData>}
 */
function readDirFiles(sDir, sLabel, fNormalize = false, iLevel = 0)
{
    let aFileData = [];

    let asFiles;
    if (sDir.endsWith(path.sep)) {
        asFiles = fs.readdirSync(sDir);
        for (let i = 0; i < asFiles.length; i++) {
            asFiles[i] = path.join(sDir, asFiles[i]);
        }
    } else {
        asFiles = sDir.split(',');
        sDir = ".";
        for (let i = 0; i < asFiles.length; i++) {
            let sDirFile = path.dirname(asFiles[i]);
            if (sDirFile != ".") sDir = sDirFile;
            asFiles[i] = path.join(sDir, path.basename(asFiles[i]));
        }
    }

    /*
     * There are two special label strings you can pass on the command-line:
     *
     *      "--label none" (for no volume label at all)
     *      "--label default" (for our default volume label; currently "PCJS")
     *
     * Any other string following "--label" will be used as-is, and if no "--label" is specified
     * at all, we build a volume label from the basename of the directory.
     */
    if (sLabel == "none") {
        sLabel = "";
    } else if (sLabel == "default") {
        sLabel = DiskInfo.PCJS_LABEL;
    }

    /*
     * The label, if any, will always be first in the list; this shouldn't be a concern since
     * there is currently no support for building "bootable" disks from a set of files.
     */
    if (sLabel) {
        /*
         * I prefer a hard-coded date/time, because it avoids creating different disk images
         * time this utility is run.
         *
         * And remember, of all the Date() constructor parameters, month is the oddball;
         * it's interpreted as the actual month - 1, so 8 corresponds to September.  Brilliant.
         */
        let dateLabel = new Date(1989, 8, 27, 3, 0, 0);
        let file = {path: sDir, name: sLabel, attr: DiskInfo.ATTR.VOLUME, date: dateLabel, size: 0};
        aFileData.push(file);
    }

    let iFile;
    for (iFile = 0; iFile < asFiles.length && nMaxCount > 0; iFile++, nMaxCount--) {
        /*
         * fs.readdirSync() already excludes "." and ".." but there are also a variety of hidden
         * files on *nix systems that begin with a period, which in general we should ignore, too.
         *
         * TODO: Consider an override option that will allow hidden file(s) to be included as well.
         */
        let sPath = asFiles[iFile];
        let sName = path.basename(sPath);
        if (sName.charAt(0) == '.') continue;
        let sArchive = checkArchive(sPath, true);
        if (sArchive) {
            if (!existsFile(sArchive)) {
                // printf("unar -o %s -d \"%s\"\n", path.dirname(sArchive), sPath);
            }
        }
        let file = {path: sPath, name: sName, nameEncoding: "utf8"};
        let stats = fs.statSync(sPath);
        file.date = stats.mtime;
        if (stats.isDirectory()) {
            let sArchive = checkArchive(sPath, false);
            if (sArchive) {
                // printf("warning: skipping directory matching archive: %s\n", sArchive);
                continue;
            }
            file.attr = DiskInfo.ATTR.SUBDIR;
            file.size = -1;
            file.data = new DataBuffer();
            file.files = readDirFiles(sPath + path.sep, null, fNormalize, iLevel + 1);
        } else {
            let fText = fNormalize && isTextFile(sName);
            let data = readFile(sPath, fText? "utf8" : null);
            if (!data) continue;
            if (data.length != stats.size) {
                printf("file data length (%d) does not match file size (%d)\n", data.length, stats.size);
            }
            if (fText) {
                if (isText(data)) {
                    let dataNew = CharSet.toCP437(data).replace(/\n/g, "\r\n").replace(/\r+/g, "\r");
                    if (dataNew != data) printf("replaced line endings in %s (size changed from %d to %d bytes)\n", sName, data.length, dataNew.length);
                    data = dataNew;
                } else {
                    printf("non-ASCII data in %s (line endings unchanged)\n", sName);
                }
                data = new DataBuffer(data);
            }
            file.attr = DiskInfo.ATTR.ARCHIVE;
            file.size = data.length;
            file.data = data;
        }
        aFileData.push(file);
    }
    if (iFile < asFiles.length && nMaxCount <= 0) {
        printf("warning: %d file limit reached, use --maxfiles # to increase\n", nMaxInit);
    }
    return aFileData;
}

/**
 * getArchiveFiles(zip, verbose)
 *
 * @param {StreamZip} zip
 * @param {boolean} verbose
 * @returns {Array.<FileData>}
 */
function getArchiveFiles(zip, verbose)
{
    let aFileData = [];
    let aDirectories = [];
    if (verbose) {
        printf("reading: %s\n", zip.fileName);
        printf("Filename        Length   Method       Size  Ratio   Date       Time       CRC\n");
        printf("--------        ------   ------       ----  -----   ----       ----       ---\n");
    }
    let messages = "";
    let entries = Object.values(zip.entries());
    for (let entry of entries) {

        let file = {path: entry.name, name: path.basename(entry.name), nameEncoding: "cp437"};
        //
        // The 'time' field in StreamZip entries is a UTC time, which is unfortunate,
        // because file times stored in a ZIP file are *local* times.
        //
        // So I've updated StreamZip to include the file's local time as a Date object
        // ('date') in the entry object.  If it's not available (eg, we're using an older
        // version of StreamZip), then we'll fall back to our 'time' field work-around.
        //
        file.date = entry.date;
        if (!file.date) {
            let date = new Date(entry.time);
            file.date = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
        }
        if (entry.isDirectory) {
            file.attr = DiskInfo.ATTR.SUBDIR;
            file.size = -1;
            file.data = new DataBuffer();
            file.files = [];
            aDirectories.push(file);
        } else {
            let data;
            /*
             * HACK to skip decompression for all entries (--verbose=skip) or all entries except a named entry.
             */
            if (typeof verbose == "string" && (verbose == "skip" || verbose != entry.name)) {
                data = new DataBuffer(entry.size);
            }
            else {
                data = zip.entryDataSync(entry.name);
                data = new DataBuffer(data || 0);
            }
            file.attr = DiskInfo.ATTR.ARCHIVE;
            file.size = data.length;
            file.data = data;
        }
        if (entry.messages && entry.messages.length) {
            for (let message of entry.messages) {
                messages += message + "\n";
            }
        }
        let d, sDir = path.dirname(file.path) + path.sep;
        for (d = 0; d < aDirectories.length; d++) {
            let dir = aDirectories[d];
            if (dir.path == sDir) {
                dir.files.push(file);
                break;
            }
        }
        if (d == aDirectories.length) {
            aFileData.push(file);
        }
        if (verbose) {
            /*
             * Notes regarding ARC compression method "naming conventions":
             *
             * I've not yet seen any examples of Method5 or Method7 "in the wild", but I have seen Method6
             * (see PC-SIG DISK0568: 123EGA.ARC), which PKXARC.EXE called "crunched" (with a lower-case "c"),
             * distinct from Method8 which it called "Crunched" (with an upper-case "C").
             *
             * Technically, yes, methods 5-7 and method 8 were all called "crunching", but 5-7 performed LZW
             * compression (with unpacked (5), packed (6), and "new hash" (7) variants) while method 8 performed
             * "dynamic" LZW compression.
             *
             * To distinguish the methods better, I'm going call 5-7 "Crunch" and 8 "Crush", placing method 8
             * squarely between "Crunch" and "Squash".
             */
            let methodsARC = [
                "Store", "Pack", "Squeeze", "Crunch5", "Crunch", "Crunch7", "Crush", "Squash"
            ];
            let methodsZIP = [
                "Store", "Shrink", "Reduce1", "Reduce2", "Reduce3", "Reduce4", "Implode", undefined, "Deflate", "Deflate64", "Implode2"
            ];
            let filename = CharSet.fromCP437(file.name);
            if (filename.length > 14) {
                filename = "..." + filename.slice(filename.length - 11);
            }
            let filesize = file.size;
            if (filesize < 0) {
                filesize = 0;
                filename += "/";
            }
            let method = entry.method < 0? methodsARC[-entry.method - 2] : methodsZIP[entry.method];
            if (entry.encrypted) method += '*';
            let ratio = filesize > entry.compressedSize? Math.round(100 * (filesize - entry.compressedSize) / filesize) : 0;
            if (entry.errors) filesize = -1;
            if (!Device.DEBUG) {
                printf("%-14s %7d   %-9s %7d   %3d%%   %T   %0*x\n",
                    filename, filesize, method, entry.compressedSize, ratio, file.date, zip.arcType == StreamZip.TYPE_ARC? 4 : 8, entry.crc);
            } else {
                printf("%-14s %7d   %-9s %7d   %3d%%   %T   %0*x  %#08x\n",
                    filename, filesize, method, entry.compressedSize, ratio, file.date, zip.arcType == StreamZip.TYPE_ARC? 4 : 8, entry.crc, entry.offset);
            }
        }
    }
    if (messages) printf("%s", messages);
    return aFileData;
}

/**
 * getArchiveOffset(sArchive, arcType, sOffset)
 *
 * There were some ARC archives embedded in EXE files (eg, old self-extracting archives) produced by PKware, before they
 * started using ZIP archives.  Examples include:
 *
 *      PKX35A35.EXE
 *      PK361.EXE
 *      PKFIND11.EXE
 *
 * They can be detected by a 32-bit signature near the end of the file ("PK\xAA\x55" or 0x55aa4b50) followed by a 32-bit
 * archive size.  The beginning of the archive can be found by subtracting the archive size from the file size (ie, the file
 * size up to and including the 32-bit archive size), and then subtracting another 40 (0x28) bytes from that value.
 *
 * TODO: Determine what that final 40-byte offset represents.
 *
 * However, since this is an expensive operation, we perform this search ONLY if 1) the caller doesn't provide an explicit
 * offset, 2) the caller explicitly set the archive type to TYPE_ARC, and 3) the input file is an EXE file.
 *
 * There were self-extracting ARC archives produced by SEA (System Enhancement Associates) as well (eg, ARC602.EXE from 1989),
 * but those used a different format; this function does not yet support those files.
 *
 * Self-extracting ZIP archives don't need any help locating the archive offset, because the ZIP file format specifically
 * allows for prepended files (eg, EXE files).
 *
 * @param {string} sArchive
 * @param {number} arcType
 * @param {string} sOffset
 * @returns {number} (the specified --offset value, if any, else the offset of the embedded ARC archive, if any; -1 if none)
 */
function getArchiveOffset(sArchive, arcType, sOffset)
{
    let offset = 0;
    if (sOffset) {
        offset = +sOffset || 0;
    } else {
        if (arcType == StreamZip.TYPE_ARC && sArchive.toUpperCase().endsWith(".EXE")) {
            offset = -1
            let data = readFile(sArchive, null);
            if (data) {
                let sizeArc = -1, sizeFile;
                let max = 512;      // limit the search to the last 512 bytes of the file
                for (let o = data.length - 8; o >= 0 && max--; o--) {
                    if (data.readUInt32LE(o) == 0x55aa4b50) {
                        sizeArc = data.readUInt32LE(o + 4);
                        sizeFile = o + 8;
                        break;
                    }
                }
                if (sizeArc > 0 && sizeArc < sizeFile) {
                    offset = sizeFile - sizeArc - 40;
                }
            }
        }
    }
    return offset;
}

/**
 * readArchiveFiles(sArchive, arcType, arcOffset, sLabel, sPassword, verbose, done)
 *
 * @param {string} sArchive (ARC/ZIP filename)
 * @param {number} arcType (1 for ARC, 2 for ZIP)
 * @param {number} arcOffset (0 if none)
 * @param {string} sLabel (optional volume label)
 * @param {string} sPassword (optional password)
 * @param {boolean} verbose (true to display verbose output, false to display minimal output)
 * @param {function(Array.<FileData>)} done
 */
function readArchiveFiles(sArchive, arcType, arcOffset, sLabel, sPassword, verbose, done)
{
    let zip = new StreamZip({
        file: sArchive,
        password: sPassword,
        arcType: arcType,
        arcOffset: arcOffset,
        storeEntries: true,
        nameEncoding: "ascii",
        // printfDebug: printf,
        holdErrors: true
    });
    zip.on('ready', () => {
        let aFileData = getArchiveFiles(zip, verbose);
        zip.close();
        done(aFileData);
    });
    zip.on('error', (err) => {
        printError(err, sArchive);
    });
}

/**
 * readDisk(diskFile, forceBPB, sectorIDs, sectorErrors, suppData)
 *
 * @param {string} diskFile
 * @param {boolean} [forceBPB]
 * @param {Array|string} [sectorIDs]
 * @param {Array|string} [sectorErrors]
 * @param {string} [suppData] (eg, supplementary disk data that can be found in such files as: /software/pcx86/app/microsoft/word/1.15/debugger/index.md)
 * @returns {DiskInfo|null}
 */
function readDisk(diskFile, forceBPB, sectorIDs, sectorErrors, suppData)
{
    let db, di
    try {
        let diskName = path.basename(diskFile);
        di = new DiskInfo(device, diskName);
        if (diskName.endsWith(".json")) {
            db = readFile(diskFile, "utf8");
            if (!db) {
                di = null;
            } else {
                if (!di.buildDiskFromJSON(db)) di = null;
            }
        }
        else {
            /*
             * Passing null for the encoding parameter tells readFile() to return a buffer (which, in our case, is a DataBuffer).
             */
            db = readFile(diskFile, null);
            if (!db) {
                di = null;
            } else {
                if (diskName.endsWith(".psi")) {
                    if (!di.buildDiskFromPSI(db)) di = null;
                } else {
                    if (!di.buildDiskFromBuffer(db, forceBPB, getHash, sectorIDs, sectorErrors, suppData)) di = null;
                }
            }
        }
        if (di) {
            let sDir = getFullPath(diskFile.replace(/\.[a-z]+$/, path.sep));
            let aDiskFiles = glob.sync(path.join(sDir, "**"));
            for (let i = 0; i < aDiskFiles.length; i++) {
                addMetaData(di, sDir, aDiskFiles[i]);
            }
        }
    } catch(err) {
        printError(err);
        return null;
    }
    return di;
}

/**
 * readFile(sFile, encoding)
 *
 * @param {string} sFile
 * @param {string|null} [encoding]
 * @returns {DataBuffer|string|undefined}
 */
function readFile(sFile, encoding = "utf8")
{
    let data;
    if (sFile) {
        try {
            sFile = getFullPath(sFile);
            data = fs.readFileSync(sFile, encoding);
            if (!encoding) data = new DataBuffer(data);
        } catch(err) {
            printError(err);
        }
    }
    return data;
}

/**
 * readJSON(sFile)
 *
 * @param {string} sFile
 * @returns {Object|undefined}
 */
function readJSON(sFile)
{
    let data, json;
    try {
        data = readFile(sFile);
        json = JSON.parse(data);
    } catch(err) {
        printError(err);
    }
    return json;
}

/**
 * writeDisk(diskFile, di, fLegacy, indent, fOverwrite, fQuiet, fWritable, source)
 *
 * @param {string} diskFile
 * @param {DiskInfo} di
 * @param {boolean} [fLegacy]
 * @param {number} [indent]
 * @param {boolean} [fOverwrite]
 * @param {boolean} [fQuiet]
 * @param {boolean} [fWritable]
 * @param {string} [source]
 */
function writeDisk(diskFile, di, fLegacy = false, indent = 0, fOverwrite = false, fQuiet = false, fWritable = false, source = "")
{
    let diskName = path.basename(diskFile);
    try {
        let fExists = existsFile(diskFile);
        if (!fExists || fOverwrite) {
            let data;
            let diskFileLC = diskFile.toLowerCase();
            if (diskFileLC.endsWith(".json")) {
                data = di.getJSON(getHash, fLegacy, 0, source);
            } else {
                let db = new DataBuffer(di.getSize());
                if (di.getData(db, fLegacy)) data = db.buffer;
            }
            if (data) {
                if (!fQuiet) printf("writing %s...\n", diskFile);
                diskFile = getFullPath(diskFile);
                let sDir = path.dirname(diskFile);
                makeDir(sDir, true);
                if (fExists) fs.unlinkSync(diskFile);
                fs.writeFileSync(diskFile, data);
                if (diskFileLC.endsWith(".img") && !fWritable) fs.chmodSync(diskFile, 0o444);
            } else {
                printf("%s not written, no data\n", diskName);
            }
        } else {
            if (!fQuiet) printf("warning: %s exists, use --overwrite to replace\n", diskFile);
        }
    }
    catch(err) {
        printError(err);
    }
}

/**
 * writeFile(sFile, data, fCreateDir, fOverwrite, fReadOnly, fQuiet)
 *
 * @param {string} sFile
 * @param {DataBuffer|string} data
 * @param {boolean} [fCreateDir]
 * @param {boolean} [fOverwrite]
 * @param {boolean} [fReadOnly]
 * @param {boolean} [fQuiet]
 * @returns {boolean}
 */
function writeFile(sFile, data, fCreateDir, fOverwrite, fReadOnly, fQuiet)
{
    if (sFile) {
        try {
            if (data instanceof DataBuffer) {
                data = data.buffer;
            }
            if (fCreateDir) {
                let sDir = path.dirname(sFile);
                makeDir(sDir, true);
            }
            if (!existsFile(sFile) || fOverwrite) {
                fs.writeFileSync(sFile, data);
                if (fReadOnly) fs.chmodSync(sFile, 0o444);
                return true;
            }
            if (!fQuiet) printf("warning: %s exists, use --overwrite to replace\n", sFile);
        } catch(err) {
            printError(err);
        }
    }
    return false;
}

/**
 * processDiskAsync(input, argv)
 *
 * @param {string} input
 * @param {Array} argv
 */
async function processDiskAsync(input, argv)
{
    let di = await readDiskAsync(input, argv['forceBPB'], argv['sectorID'], argv['sectorError'], readFile(argv['suppData']));
    if (di) {
        processDisk(di, input, argv);
    }
}

/**
 * readDiskAsync(diskFile, forceBPB, sectorIDs, sectorErrors, suppData)
 *
 * @param {string} diskFile
 * @param {boolean} [forceBPB]
 * @param {Array|string} [sectorIDs]
 * @param {Array|string} [sectorErrors]
 * @param {string} [suppData] (eg, supplementary disk data that can be found in such files as: /software/pcx86/app/microsoft/word/1.15/debugger/index.md)
 */
async function readDiskAsync(diskFile, forceBPB, sectorIDs, sectorErrors, suppData)
{
    let db, di
    try {
        let diskName = path.basename(diskFile);
        di = new DiskInfo(device, diskName);
        if (diskName.endsWith(".json")) {
            diskFile = mapDiskToServer(diskFile);
            if (diskFile.startsWith("http")) {
                printf("fetching %s\n", diskFile);
                let response = await got(diskFile);
                db = response.body;
            } else {
                db = await readFileAsync(diskFile, "utf8");
            }
            if (!db) {
                di = null;
            } else {
                if (!di.buildDiskFromJSON(db)) di = null;
            }
        }
        else {
            /*
             * Passing null for the encoding parameter tells readFile() to return a buffer (which, in our case, is a DataBuffer).
             */
            db = await readFileAsync(diskFile, null);
            if (!db) {
                di = null;
            } else {
                if (diskName.endsWith(".psi")) {
                    if (!di.buildDiskFromPSI(db)) di = null;
                } else {
                    if (!di.buildDiskFromBuffer(db, forceBPB, getHash, sectorIDs, sectorErrors, suppData)) di = null;
                }
            }
        }
    } catch(err) {
        printError(err);
        return null;
    }
    return di;
}

/**
 * readFileAsync(sFile, encoding)
 *
 * @param {string} sFile
 * @param {string|null} [encoding]
 */
function readFileAsync(sFile, encoding = "utf8")
{
    sFile = getFullPath(sFile);
    return new Promise((resolve, reject) => {
        fs.readFile(sFile, encoding, (err, data) => {
            if (err) reject(err);
            resolve(data);
        });
    });
}

/**
 * processAll(all, argv)
 *
 * @param {string} all
 * @param {Array} argv
 */
function processAll(all, argv)
{
    if (all && typeof all == "string") {
        let max = +argv['max'] || 0;
        let asFiles = glob.sync(getFullPath(all));
        if (asFiles.length) {
            let outdir = argv['output'];                // if specified, --output is assumed to be a directory
            if (!outdir || typeof outdir == "boolean") {
                outdir = argv[1];
            }
            let type =  argv['type'] || "json";         // if specified, --type should be a known file extension
            if (type[0] != '.') type = '.' + type;
            let filter = argv['filter'];
            filter = (typeof filter == "string")? new RegExp(filter) : null;
            for (let sFile of asFiles) {
                if (filter && !filter.test(sFile)) continue;
                let args = [argv[0], sFile];
                if (outdir) {
                    args['output'] = path.join(outdir.replace("%d", path.dirname(sFile)), path.parse(sFile).name + type);
                }
                for (let arg of ['list', 'expand', 'extract', 'extdir', 'normalize', 'overwrite', 'quiet', 'verbose']) {
                    if (argv[arg] !== undefined) args[arg] = argv[arg];
                }
                processFile(args);
                if (!--max) break;
            }
        } else {
            printf("no files matched \"%s\"\n", all);
        }
        return true;
    }
    return false;
}

/**
 * processFile(argv)
 *
 * Formerly part of main(), but factored out so that it can also be called for a list of files ("--all").
 *
 * @param {Array} argv
 * @returns {boolean} true if something was processed, false if not
 */
function processFile(argv)
{
    let input;
    let fDir = false, fFiles = false, arcType = 0;

    let done = function(di)
    {
        if (di) {
            if (fFiles) {
                /*
                * When a disk is created from a list of files, the default name isn't very meaningful;
                * the basename of the output file isn't much more helpful, but it's better than nothing.
                *
                * This only affects the 'name' property in 'imageInfo', which is of limited interest anyway.
                */
                let name = argv['output'];
                if (!name || typeof name == "boolean") {
                    name = argv[1];
                }
                if (name) {
                    /*
                     * If name isn't a string, then it must be an array (because the user specified multiple
                     * outputs), which is allowed in case you want to create, for example, both IMG and JSON
                     * disk images with a single command.
                     */
                    if (typeof name != "string") name = name[0];
                    di.setName(path.basename(name));
                }
            }
            processDisk(di, input, argv);
            return true;
        }
        if (input) printf("warning: %s is not a supported disk image\n", input);
        return false;
    };

    /*
     * Checking each --dir, --files, etc, for a boolean value allows the user to specify a value
     * without an equal sign (ie, a small convenience).
     */
    input = argv['dir'];
    if (input) {
        fDir = true;                // if --dir, the directory should end with a trailing slash (but we'll make sure)
        if (typeof input == "boolean") {
            input = argv[1];
            if (input) {
                argv.splice(1, 1);
            } else {
                fDir = false;
            }
        }
        if (input && !input.endsWith(path.sep)) input += path.sep;
    } else {
        input = argv['files'];
        if (input) {                // if --files, the list of files should be separated with commas (and NO trailing slash)
            fDir = fFiles = true;
            if (typeof input == "boolean") {
                input = argv[1];
                if (input) {
                    argv.splice(1, 1);
                } else {
                    fDir = fFiles = false;
                }
            }
        } else {
            input = argv['arc'];
            if (input) {
                arcType = 1;
            } else {
                input = argv['zip'];
                if (input) {
                    arcType = 2;
                }
            }
            if (!input || typeof input == "boolean") {
                input = argv[1];
                if (input) {
                    argv.splice(1, 1);
                    if (!arcType) {
                        if (input.endsWith(path.sep)) {
                            fDir = true;
                        } else {
                            arcType = isArchiveFile(input);
                        }
                    }
                } else {
                    arcType = 0
                }
            }
        }
    }

    if (fDir || arcType) {
        let offset = getArchiveOffset(input, arcType, argv['offset']);
        if (offset < 0) {
            printf("error: %s is not a supported archive file\n", input);
            return true;
        }
        readDir(input, arcType, offset, argv['label'], argv['password'], argv['normalize'], getTargetValue(argv['target']), +argv['maxfiles'] || 0, argv['verbose'], done);
        return true;
    }

    if (input) {
        return done(readDisk(input, argv['forceBPB'], argv['sectorID'], argv['sectorError'], readFile(argv['suppData'])));
    }

    return false;
}

/**
 * main(argc, argv)
 *
 * Usage:
 *
 *      node diskimage.js [input disk image or directory] [output disk image] [options]
 *
 * You can use --disk and --dir to explicitly specify an input disk or directory, or you can implicitly
 * specify one as the first non-option argument (a directory is indicated by a trailing slash); similarly,
 * you can use --output to explicitly specify an output disk image, or you can implicitly specify one as
 * the second non-option argument.
 *
 * To add files to a disk in a specific order, use --files=[comma-separated list of files].  And if you
 * want a particular boot sector, use --boot=[sector image file].
 *
 * You can also use the contents of a ZIP archive as your input source with --zip=[zipfile]; to also display
 * a listing of the archive's contents, include --verbose.
 *
 * Use --all to process all files that match the "globbed" filespec (eg, "--all='/Volumes/PCSIG_13B/*.ZIP'");
 * when using --all, --output can be used to specify an output directory, and --type can be used to specify
 * the output file extension (default is "json").
 *
 * Use --collection to process all disk collections with the specified options, or --collection=[subset]
 * to process only disks whose path or name contains [subset]; any input/output disk/directory names are
 * ignored when using --collection.
 *
 * @param {number} argc
 * @param {Array} argv
 */
function main(argc, argv)
{
    let argv0 = argv[0].split(' ');
    let options = argv0.slice(1).join(' ');

    Device.DEBUG = !!argv['debug'];
    moduleDir = path.dirname(argv0[0]);
    rootDir = path.join(moduleDir, "../..");
    useServer = !!argv['server'];

    if (!argv['quiet']) {
        printf("DiskImage v%s\n%s\n%s\n", Device.VERSION, Device.COPYRIGHT, (options? sprintf("Options: %s", options) : ""));
    }

    if (Device.DEBUG) {
        device.setMessages(Device.MESSAGE.FILE, true);
    }

    device.setMessages(Device.MESSAGE.DISK + Device.MESSAGE.WARN + Device.MESSAGE.ERROR, true);

    if (argv['help']) {
        let optionsInput = {
            "--all=[filespec]":         "process all matching disk images",
            "--arc=[arcfile]\t":        "read all files in an ARC archive",
            "--boot=[bootfile]":        "replace boot sector with specified file",
            "--dir=[directory]":        "read all files in a directory",
            "--disk=[diskimage]":       "read disk image (.img or .json)",
            "--files=[filelist]":       "read all files in a comma-separated list",
            "--zip=[zipfile]\t":        "read all files in a ZIP archive"
        };
        let optionsOutput = {
            "--extdir=[directory]":     "write extracted files to directory",
            "--extract (-e)\t":         "extract all files in disks or archives",
            "--extract[=filename]":     "extract specified file in disks or archives",
            "--output=[diskimage]":     "write disk image (.img or .json)",
            "--target=[nK|nM]":         "set target disk size to nK or nM (eg, \"360K\", \"10M\")"
        };
        let optionsOther = {
            "--dump=[C:H:S:N]":         "dump N sectors starting at sector C:H:S",
            "--expand (-x)\t":          "expand all archives inside disk or archive",
            "--label=[label]\t":        "set volume label of output disk image",
            "--list (-l)\t":            "display directory listings of disk or archive",
            "--list=unused\t":          "display unused space in disk image (.json only)",
            "--normalize\t":            "convert line endings and character encoding of text files",
            "--password=[string]":      "use password for decompression (ARC files only)",
            "--quiet (-q)\t":           "minimum messages",
            "--verbose (-v)\t":         "maximum messages (eg, display archive contents)"
        };
        let optionGroups = {
            "Input options:":           optionsInput,
            "Output options:":          optionsOutput,
            "Other options:":           optionsOther
        }
        printf("\nUsage:\n\n\tnode diskimage.js [input diskimage] [output diskimage] [options]\n");
        for (let group in optionGroups) {
            printf("\n%s\n\n", group);
            for (let option in optionGroups[group]) {
                printf("\t%s\t%s\n", option, optionGroups[group][option]);
            }
        }
        printf("\nOptions --extdir and --output support \"%d\", which will be replaced with the input disk directory.\n");
        printf("Option values can be enclosed in single or double quotes (eg, if they contain whitespace or wildcards).\n");
        return;
    }

    if (argv['collection']) {
        readCollection(argv);
        return;
    }

    let input = argv['disk'];
    if (input) {
        /*
         * If you use --disk to specify a disk image, then I call the experimental async function.
         */
        if (typeof input == "boolean") {
            input = argv[1];
            if (input) argv.splice(1, 1);
        }
        if (input) {
            processDiskAsync(input, argv);
            return;
        }
    }

    if (processAll(argv['all'], argv) || processFile(argv)) {
        return;
    }

    printf("nothing to do\n");
}

main(...pcjslib.getArgs({
    '?': "help",
    'e': "extract",
    'l': "list",
    'q': "quiet",
    'v': "verbose",
    'x': "expand"
}));
