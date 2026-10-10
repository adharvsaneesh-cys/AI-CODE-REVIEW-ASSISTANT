const AdmZip = require("adm-zip");

const ZipProjectFile = require("../models/ZipProjectFile");

const {
  getZipArchiveBuffer,
} = require("./zipArchiveStorage.service");

function normalizeZipPath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .trim();
}

function isUnsafeZipPath(value) {
  const filePath =
    String(value || "");

  if (
    !filePath ||
    filePath.includes("\0") ||
    filePath.startsWith("/") ||
    filePath.startsWith("\\") ||
    /^[A-Za-z]:[\\/]/.test(
      filePath,
    )
  ) {
    return true;
  }

  return filePath
    .split(/[\\/]+/)
    .includes("..");
}

function createDownloadName(
  archiveName,
) {
  const original =
    String(
      archiveName ||
        "project.zip",
    )
      .replace(/[\\/]/g, "_")
      .replace(/[\0\r\n"]/g, "")
      .trim();

  const baseName =
    original
      .replace(
        /\.zip$/i,
        "",
      )
      .trim() ||
    "project";

  return `${baseName}-codeguard-secured.zip`;
}

async function buildSecuredZip({
  scan,
  ownerId,
}) {
  if (!scan) {
    throw new Error(
      "ZIP scan is required.",
    );
  }

  if (
    scan.sourceType !== "zip"
  ) {
    throw new Error(
      "Secured ZIP download is only available for ZIP project scans.",
    );
  }

  const archiveStorageId =
    scan.zipMetadata
      ?.archiveStorageId;

  if (!archiveStorageId) {
    const error =
      new Error(
        "The original ZIP archive is not stored for this scan. Upload and scan the project again before downloading a secured ZIP.",
      );

    error.statusCode = 409;

    throw error;
  }

  const storedArchive =
    await getZipArchiveBuffer({
      fileId:
        archiveStorageId,

      ownerId,

      scanId:
        scan._id,
    });

  if (
    !storedArchive ||
    !storedArchive.buffer
  ) {
    const error =
      new Error(
        "The original ZIP archive could not be found in secure storage.",
      );

    error.statusCode = 404;

    throw error;
  }

  const persistedFiles =
    await ZipProjectFile
      .find({
        scan:
          scan._id,

        owner:
          ownerId,
      })
      .select(
        "+currentCode path fileName language modified verified",
      );

  const sourceByPath =
    new Map();

  for (
    const file of
      persistedFiles
  ) {
    const filePath =
      normalizeZipPath(
        file.path,
      );

    if (
      !filePath ||
      isUnsafeZipPath(
        filePath,
      )
    ) {
      continue;
    }

    sourceByPath.set(
      filePath,
      String(
        file.currentCode ??
          "",
      ),
    );
  }

  const zip =
    new AdmZip(
      storedArchive.buffer,
    );

  const entries =
    zip.getEntries();

  const originalEntryPaths =
    new Set();

  let replacedFiles = 0;

  for (
    const entry of entries
  ) {
    if (
      !entry ||
      entry.isDirectory
    ) {
      continue;
    }

    const entryPath =
      normalizeZipPath(
        entry.entryName,
      );

    if (
      !entryPath ||
      isUnsafeZipPath(
        entryPath,
      )
    ) {
      continue;
    }

    originalEntryPaths.add(
      entryPath,
    );

    if (
      !sourceByPath.has(
        entryPath,
      )
    ) {
      continue;
    }

    const currentCode =
      sourceByPath.get(
        entryPath,
      );

    zip.updateFile(
      entry.entryName,
      Buffer.from(
        currentCode,
        "utf8",
      ),
    );

    replacedFiles += 1;
  }

  const missingSourceFiles =
    [];

  for (
    const filePath of
      sourceByPath.keys()
  ) {
    if (
      !originalEntryPaths.has(
        filePath,
      )
    ) {
      missingSourceFiles.push(
        filePath,
      );
    }
  }

  if (
    missingSourceFiles.length >
    0
  ) {
    const error =
      new Error(
        `Unable to build secured ZIP because ${missingSourceFiles.length} persisted source ${
          missingSourceFiles.length ===
          1
            ? "file is"
            : "files are"
        } missing from the original archive.`,
      );

    error.statusCode = 409;
    error.missingFiles =
      missingSourceFiles;

    throw error;
  }

  if (
    persistedFiles.length >
      0 &&
    replacedFiles === 0
  ) {
    const error =
      new Error(
        "No persisted source files matched the original ZIP archive.",
      );

    error.statusCode = 409;

    throw error;
  }

  const outputBuffer =
    zip.toBuffer();

  if (
    !Buffer.isBuffer(
      outputBuffer,
    ) ||
    outputBuffer.length === 0
  ) {
    throw new Error(
      "Failed to generate the secured ZIP archive.",
    );
  }

  return {
    buffer:
      outputBuffer,

    fileName:
      createDownloadName(
        scan.zipMetadata
          ?.archiveName ||
          scan.fileName,
      ),

    replacedFiles,

    totalPersistedFiles:
      persistedFiles.length,

    originalSizeBytes:
      storedArchive.buffer
        .length,

    outputSizeBytes:
      outputBuffer.length,
  };
}

module.exports = {
  buildSecuredZip,
};