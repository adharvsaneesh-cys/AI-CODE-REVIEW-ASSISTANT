const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const MAX_ZIP_SIZE =
  1024 * 1024 * 1024;

const MAX_EXTRACTED_SIZE =
  5 * 1024 * 1024 * 1024;

const MAX_FILE_SIZE =
  5 * 1024 * 1024;

const MAX_FILE_LINES =
  25100;

const MAX_ARCHIVE_ENTRIES =
  20000;

const MAX_DIRECTORY_DEPTH =
  30;

const SUPPORTED_EXTENSIONS = {
  ".py": "python",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".java": "java",
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".hpp": "cpp",
  ".hh": "cpp",
  ".hxx": "cpp",
};

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  ".svn",
  ".hg",
  ".github",
  ".idea",
  ".vscode",
  "dist",
  "build",
  "out",
  "target",
  "coverage",
  ".next",
  ".nuxt",
  ".cache",
  "vendor",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  "venv",
  ".venv",
  "env",
  "bin",
  "obj",
]);

const NESTED_ARCHIVE_EXTENSIONS = new Set([
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz",
  ".tgz",
  ".bz2",
  ".xz",
]);

function normalizeArchivePath(entryName) {
  return String(entryName || "")
    .replace(/\\/g, "/")
    .replace(/^(\.\.\/)+/, "");
}

function hasUnsafePath(entryName) {
  const raw = String(entryName || "");

  if (!raw || raw.includes("\0")) {
    return true;
  }

  const normalized =
    raw.replace(/\\/g, "/");

  if (normalized.startsWith("/")) {
    return true;
  }

  if (/^[a-zA-Z]:/.test(normalized)) {
    return true;
  }

  const parts =
    normalized.split("/");

  return parts.some(
    (part) => part === "..",
  );
}

function getDirectoryDepth(entryName) {
  const normalized =
    normalizeArchivePath(entryName);

  const parts =
    normalized
      .split("/")
      .filter(Boolean);

  if (parts.length <= 1) {
    return 0;
  }

  return parts.length - 1;
}

function shouldIgnorePath(entryName) {
  const normalized =
    normalizeArchivePath(entryName);

  const parts =
    normalized
      .split("/")
      .filter(Boolean);

  return parts.some(
    (part) =>
      IGNORED_DIRECTORIES.has(
        part.toLowerCase(),
      ),
  );
}

function detectLanguage(fileName) {
  const extension =
    path
      .extname(
        String(fileName || ""),
      )
      .toLowerCase();

  return (
    SUPPORTED_EXTENSIONS[
      extension
    ] || null
  );
}

function isNestedArchive(fileName) {
  const extension =
    path
      .extname(
        String(fileName || ""),
      )
      .toLowerCase();

  return NESTED_ARCHIVE_EXTENSIONS.has(
    extension,
  );
}

function countLines(source = "") {
  const text =
    String(source || "");

  if (!text) {
    return 0;
  }

  const lines =
    text
      .replace(/\r\n/g, "\n")
      .split("\n");

  while (
    lines.length > 1 &&
    lines[lines.length - 1] === ""
  ) {
    lines.pop();
  }

  return lines.length;
}

function looksBinary(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    return true;
  }

  if (buffer.length === 0) {
    return false;
  }

  const sampleLength =
    Math.min(
      buffer.length,
      8192,
    );

  let suspicious = 0;

  for (
    let index = 0;
    index < sampleLength;
    index += 1
  ) {
    const byte =
      buffer[index];

    if (byte === 0) {
      return true;
    }

    const allowedControl =
      byte === 9 ||
      byte === 10 ||
      byte === 13;

    if (
      byte < 32 &&
      !allowedControl
    ) {
      suspicious += 1;
    }
  }

  return (
    suspicious /
      sampleLength >
    0.1
  );
}

function hasValidZipSignature(buffer) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length < 4
  ) {
    return false;
  }

  const first = buffer[0];
  const second = buffer[1];
  const third = buffer[2];
  const fourth = buffer[3];

  if (
    first !== 0x50 ||
    second !== 0x4b
  ) {
    return false;
  }

  return (
    (third === 0x03 &&
      fourth === 0x04) ||
    (third === 0x05 &&
      fourth === 0x06) ||
    (third === 0x07 &&
      fourth === 0x08)
  );
}

async function validateZipFilePath(filePath) {
  if (!filePath) {
    throw new Error(
      "ZIP file path is required.",
    );
  }

  let stats;

  try {
    stats =
      await fs.promises.stat(
        filePath,
      );
  } catch (error) {
    throw new Error(
      "The uploaded ZIP file could not be found.",
    );
  }

  if (!stats.isFile()) {
    throw new Error(
      "The uploaded ZIP file is invalid.",
    );
  }

  if (stats.size === 0) {
    throw new Error(
      "The uploaded ZIP file is empty.",
    );
  }

  if (
    stats.size >
    MAX_ZIP_SIZE
  ) {
    throw new Error(
      "ZIP file exceeds the 1 GB upload limit.",
    );
  }

  const handle =
    await fs.promises.open(
      filePath,
      "r",
    );

  try {
    const signature =
      Buffer.alloc(4);

    await handle.read(
      signature,
      0,
      4,
      0,
    );

    if (
      !hasValidZipSignature(
        signature,
      )
    ) {
      throw new Error(
        "The uploaded file does not have a valid ZIP signature.",
      );
    }
  } finally {
    await handle.close();
  }

  return stats;
}

function inspectZipArchive({
  buffer,
  filePath,
  originalName = "project.zip",
}) {
  let archiveInput =
    buffer;

  if (
    !Buffer.isBuffer(
      archiveInput,
    ) &&
    filePath
  ) {
    archiveInput =
      filePath;
  }

  if (
    !Buffer.isBuffer(
      archiveInput,
    ) &&
    typeof archiveInput !==
      "string"
  ) {
    throw new Error(
      "A valid ZIP archive is required.",
    );
  }

  if (
    path
      .extname(
        String(
          originalName || "",
        ),
      )
      .toLowerCase() !==
    ".zip"
  ) {
    throw new Error(
      "Only .zip project archives are supported.",
    );
  }

  if (
    Buffer.isBuffer(
      archiveInput,
    )
  ) {
    if (
      archiveInput.length === 0
    ) {
      throw new Error(
        "The uploaded ZIP file is empty.",
      );
    }

    if (
      archiveInput.length >
      MAX_ZIP_SIZE
    ) {
      throw new Error(
        "ZIP file exceeds the 1 GB upload limit.",
      );
    }

    if (
      !hasValidZipSignature(
        archiveInput,
      )
    ) {
      throw new Error(
        "The uploaded file does not have a valid ZIP signature.",
      );
    }
  } else {
    if (
      !fs.existsSync(
        archiveInput,
      )
    ) {
      throw new Error(
        "The uploaded ZIP file could not be found.",
      );
    }

    const stats =
      fs.statSync(
        archiveInput,
      );

    if (
      !stats.isFile() ||
      stats.size === 0
    ) {
      throw new Error(
        "The uploaded ZIP file is empty.",
      );
    }

    if (
      stats.size >
      MAX_ZIP_SIZE
    ) {
      throw new Error(
        "ZIP file exceeds the 1 GB upload limit.",
      );
    }

    const signatureBuffer =
      Buffer.alloc(4);

    const descriptor =
      fs.openSync(
        archiveInput,
        "r",
      );

    try {
      fs.readSync(
        descriptor,
        signatureBuffer,
        0,
        4,
        0,
      );
    } finally {
      fs.closeSync(
        descriptor,
      );
    }

    if (
      !hasValidZipSignature(
        signatureBuffer,
      )
    ) {
      throw new Error(
        "The uploaded file does not have a valid ZIP signature.",
      );
    }
  }

  let archive;

  try {
    archive =
      new AdmZip(
        archiveInput,
      );
  } catch (error) {
    throw new Error(
      "The uploaded file is not a valid ZIP archive.",
    );
  }

  let entries;

  try {
    entries =
      archive.getEntries();
  } catch (error) {
    throw new Error(
      "Unable to read the ZIP archive.",
    );
  }

  if (!entries.length) {
    throw new Error(
      "The ZIP archive is empty.",
    );
  }

  if (
    entries.length >
    MAX_ARCHIVE_ENTRIES
  ) {
    throw new Error(
      `ZIP archive contains more than ${MAX_ARCHIVE_ENTRIES} entries.`,
    );
  }

  const files = [];
  const skippedFiles = [];

  let totalExtractedBytes = 0;
  let totalSourceBytes = 0;
  let totalLines = 0;

  for (
    const entry of entries
  ) {
    const rawPath =
      String(
        entry.entryName || "",
      );

    if (!rawPath) {
      continue;
    }

    if (
      hasUnsafePath(
        rawPath,
      )
    ) {
      throw new Error(
        `Unsafe ZIP path detected: ${rawPath}`,
      );
    }

    const relativePath =
      normalizeArchivePath(
        rawPath,
      );

    if (entry.isDirectory) {
      continue;
    }

    const directoryDepth =
      getDirectoryDepth(
        relativePath,
      );

    if (
      directoryDepth >
      MAX_DIRECTORY_DEPTH
    ) {
      skippedFiles.push({
        path: relativePath,
        reason:
          "directory-depth-exceeded",
      });

      continue;
    }

    if (
      shouldIgnorePath(
        relativePath,
      )
    ) {
      skippedFiles.push({
        path: relativePath,
        reason:
          "ignored-directory",
      });

      continue;
    }

    if (
      isNestedArchive(
        relativePath,
      )
    ) {
      skippedFiles.push({
        path: relativePath,
        reason:
          "nested-archive",
      });

      continue;
    }

    const language =
      detectLanguage(
        relativePath,
      );

    if (!language) {
      skippedFiles.push({
        path: relativePath,
        reason:
          "unsupported-file-type",
      });

      continue;
    }

    let data;

    try {
      data =
        entry.getData();
    } catch (error) {
      throw new Error(
        `Unable to read ZIP entry: ${relativePath}`,
      );
    }

    totalExtractedBytes +=
      data.length;

    if (
      totalExtractedBytes >
      MAX_EXTRACTED_SIZE
    ) {
      throw new Error(
        "ZIP archive expands beyond the 5 GB safety limit.",
      );
    }

    if (
      data.length >
      MAX_FILE_SIZE
    ) {
      skippedFiles.push({
        path: relativePath,
        reason:
          "file-too-large",
      });

      continue;
    }

    if (
      looksBinary(data)
    ) {
      skippedFiles.push({
        path: relativePath,
        reason:
          "binary-file",
      });

      continue;
    }

    const code =
      data.toString(
        "utf8",
      );

    if (!code.trim()) {
      skippedFiles.push({
        path: relativePath,
        reason:
          "empty-file",
      });

      continue;
    }

    const lineCount =
      countLines(code);

    if (
      lineCount >
      MAX_FILE_LINES
    ) {
      skippedFiles.push({
        path: relativePath,
        reason:
          "too-many-lines",
      });

      continue;
    }

    totalSourceBytes +=
      data.length;

    totalLines +=
      lineCount;

    files.push({
      path: relativePath,
      fileName:
        path.posix.basename(
          relativePath,
        ),
      language,
      code,
      lineCount,
      sizeBytes:
        data.length,
    });
  }

  if (!files.length) {
    throw new Error(
      "No supported source-code files were found in the ZIP archive.",
    );
  }

  const languageCounts =
    files.reduce(
      (
        counts,
        file,
      ) => {
        counts[
          file.language
        ] =
          (
            counts[
              file.language
            ] || 0
          ) + 1;

        return counts;
      },
      {},
    );

  return {
    archiveName:
      path.basename(
        String(
          originalName ||
            "project.zip",
        ),
      ),

    files,

    skippedFiles,

    metadata: {
      totalArchiveEntries:
        entries.length,

      supportedFiles:
        files.length,

      skippedFiles:
        skippedFiles.length,

      totalExtractedBytes,

      totalSourceBytes,

      totalLines,

      languages:
        Object.keys(
          languageCounts,
        ),

      languageCounts,
    },
  };
}

module.exports = {
  inspectZipArchive,
  validateZipFilePath,
  detectLanguage,
  SUPPORTED_EXTENSIONS,

  limits: {
    maxZipSize:
      MAX_ZIP_SIZE,

    maxExtractedSize:
      MAX_EXTRACTED_SIZE,

    maxFileSize:
      MAX_FILE_SIZE,

    maxFileLines:
      MAX_FILE_LINES,

    maxArchiveEntries:
      MAX_ARCHIVE_ENTRIES,

    maxDirectoryDepth:
      MAX_DIRECTORY_DEPTH,
  },
};