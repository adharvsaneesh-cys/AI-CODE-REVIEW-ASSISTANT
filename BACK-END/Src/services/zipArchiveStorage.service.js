const mongoose = require("mongoose");
const fs = require("fs");
const { Readable } = require("stream");

const BUCKET_NAME =
  "codeguardZipArchives";

function getBucket() {
  const database =
    mongoose.connection.db;

  if (!database) {
    throw new Error(
      "MongoDB connection is not ready for ZIP archive storage.",
    );
  }

  return new mongoose.mongo.GridFSBucket(
    database,
    {
      bucketName:
        BUCKET_NAME,
    },
  );
}

function sanitizeArchiveName(value) {
  const name =
    String(
      value ||
        "project.zip",
    )
      .replace(/[\\\/]/g, "_")
      .replace(/[\0\r\n]/g, "")
      .trim();

  if (!name) {
    return "project.zip";
  }

  return name
    .toLowerCase()
    .endsWith(".zip")
    ? name
    : `${name}.zip`;
}

function createUploadMetadata({
  scanId,
  projectId,
  ownerId,
}) {
  return {
    scanId:
      String(scanId),
    projectId:
      String(projectId),
    ownerId:
      String(ownerId),
    uploadedAt:
      new Date(),
  };
}

function uploadStreamToGridFS({
  source,
  fileName,
  contentLength,
  scanId,
  projectId,
  ownerId,
}) {
  const bucket =
    getBucket();

  const safeName =
    sanitizeArchiveName(
      fileName,
    );

  const uploadStream =
    bucket.openUploadStream(
      safeName,
      {
        contentType:
          "application/zip",
        metadata:
          createUploadMetadata({
            scanId,
            projectId,
            ownerId,
          }),
      },
    );

  return new Promise(
    (resolve, reject) => {
      let settled = false;

      const fail =
        (error) => {
          if (settled) {
            return;
          }

          settled = true;
          reject(error);
        };

      uploadStream.once(
        "error",
        fail,
      );

      uploadStream.once(
        "finish",
        () => {
          if (settled) {
            return;
          }

          settled = true;

          resolve({
            fileId:
              uploadStream.id,
            fileName:
              safeName,
            sizeBytes:
              typeof contentLength ===
              "number"
                ? contentLength
                : undefined,
          });
        },
      );

      source.once?.(
        "error",
        fail,
      );

      source.pipe(
        uploadStream,
      );
    },
  );
}

async function storeZipArchive({
  buffer,
  fileName,
  scanId,
  projectId,
  ownerId,
}) {
  if (
    !Buffer.isBuffer(
      buffer,
    ) ||
    buffer.length === 0
  ) {
    throw new Error(
      "A valid ZIP archive buffer is required.",
    );
  }

  return uploadStreamToGridFS({
    source:
      Readable.from(
        buffer,
      ),
    fileName,
    contentLength:
      buffer.length,
    scanId,
    projectId,
    ownerId,
  });
}

async function storeZipArchiveFromFile({
  filePath,
  fileName,
  scanId,
  projectId,
  ownerId,
}) {
  if (
    !filePath ||
    !fs.existsSync(
      filePath,
    )
  ) {
    throw new Error(
      "ZIP archive file was not found.",
    );
  }

  const stats =
    await fs.promises.stat(
      filePath,
    );

  if (
    !stats.isFile() ||
    stats.size === 0
  ) {
    throw new Error(
      "A valid ZIP archive file is required.",
    );
  }

  const source =
    fs.createReadStream(
      filePath,
    );

  return uploadStreamToGridFS({
    source,
    fileName,
    contentLength:
      stats.size,
    scanId,
    projectId,
    ownerId,
  });
}

async function getZipArchiveFile({
  fileId,
  ownerId,
  scanId,
}) {
  if (!fileId) {
    return null;
  }

  const bucket =
    getBucket();

  let objectId;

  try {
    objectId =
      typeof fileId ===
      "string"
        ? new mongoose.Types.ObjectId(
            fileId,
          )
        : fileId;
  } catch (error) {
    return null;
  }

  const files =
    await bucket
      .find({
        _id:
          objectId,
        "metadata.ownerId":
          String(ownerId),
        "metadata.scanId":
          String(scanId),
      })
      .limit(1)
      .toArray();

  return (
    files[0] ||
    null
  );
}

async function getZipArchiveBuffer({
  fileId,
  ownerId,
  scanId,
}) {
  const storedFile =
    await getZipArchiveFile({
      fileId,
      ownerId,
      scanId,
    });

  if (!storedFile) {
    return null;
  }

  const bucket =
    getBucket();

  const chunks = [];

  return new Promise(
    (resolve, reject) => {
      const stream =
        bucket.openDownloadStream(
          storedFile._id,
        );

      stream.on(
        "data",
        (chunk) => {
          chunks.push(
            chunk,
          );
        },
      );

      stream.once(
        "error",
        reject,
      );

      stream.once(
        "end",
        () => {
          resolve({
            buffer:
              Buffer.concat(
                chunks,
              ),
            file:
              storedFile,
          });
        },
      );
    },
  );
}

async function createZipArchiveReadStream({
  fileId,
  ownerId,
  scanId,
}) {
  const storedFile =
    await getZipArchiveFile({
      fileId,
      ownerId,
      scanId,
    });

  if (!storedFile) {
    return null;
  }

  return {
    file:
      storedFile,
    stream:
      getBucket().openDownloadStream(
        storedFile._id,
      ),
  };
}

async function deleteZipArchive({
  fileId,
}) {
  if (!fileId) {
    return false;
  }

  const bucket =
    getBucket();

  let objectId;

  try {
    objectId =
      typeof fileId ===
      "string"
        ? new mongoose.Types.ObjectId(
            fileId,
          )
        : fileId;
  } catch (error) {
    return false;
  }

  try {
    await bucket.delete(
      objectId,
    );

    return true;
  } catch (error) {
    if (
      error?.code ===
        "ENOENT" ||
      /file not found/i.test(
        String(
          error?.message ||
            "",
        ),
      )
    ) {
      return false;
    }

    throw error;
  }
}

module.exports = {
  storeZipArchive,
  storeZipArchiveFromFile,
  getZipArchiveFile,
  getZipArchiveBuffer,
  createZipArchiveReadStream,
  deleteZipArchive,
};