// server/src/services/storage/ibmCos.js
// IBM Cloud Object Storage adapter (readiness scaffold).
//
// Requires `@ibm-cloud/cloud-sdk-core` + `ibm-cos-sdk` to be installed in
// production. We import dynamically so the local-dev path doesn't pull
// IBM SDKs into the install graph.
//
// Provider rules: server-generated keys, original filename as metadata,
// no document content logged, env-driven config only.

import { log } from '../../logger.js';

function randomKey(prefix = 'obj') {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return prefix + '_' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export async function createIbmCosStorage(cfg) {
  if (!cfg?.bucket || !cfg?.endpoint || !cfg?.apiKey || !cfg?.serviceInstanceId) {
    throw new Error('storage.ibmCos: missing required config (endpoint, bucket, apiKey, serviceInstanceId)');
  }

  let cos;
  try {
    const sdk = await import('ibm-cos-sdk');
    cos = new sdk.S3({
      endpoint:           cfg.endpoint,
      apiKeyId:           cfg.apiKey,
      serviceInstanceId:  cfg.serviceInstanceId,
      signatureVersion:   'iam'
    });
  } catch (err) {
    throw new Error('storage.ibmCos: ibm-cos-sdk not installed. Run `npm i ibm-cos-sdk` in server/.');
  }

  return {
    name: 'ibm_cos',

    async put({ buffer, contentType, originalFilename, tenantId }) {
      const key = randomKey('obj');
      try {
        await cos.putObject({
          Bucket:      cfg.bucket,
          Key:         key,
          Body:        buffer,
          ContentType: contentType || 'application/octet-stream',
          // Original filename stored as metadata only — never as the key.
          Metadata: {
            'original-filename': originalFilename || '',
            'tenant-id':         tenantId || ''
          }
        }).promise();
      } catch (err) {
        log.error('storage.ibmCos.put_failed', { code: err?.code, statusCode: err?.statusCode });
        throw new Error('storage: write failed');
      }
      return {
        provider:         'ibm_cos',
        key,
        size:             buffer.length,
        contentType:      contentType || 'application/octet-stream',
        originalFilename: originalFilename || null,
        tenantId:         tenantId || null,
        createdAt:        new Date().toISOString()
      };
    },

    async getStream(key) {
      return cos.getObject({ Bucket: cfg.bucket, Key: key }).createReadStream();
    },

    async getBuffer(key) {
      const r = await cos.getObject({ Bucket: cfg.bucket, Key: key }).promise();
      return r.Body;
    },

    async remove(key) {
      await cos.deleteObject({ Bucket: cfg.bucket, Key: key }).promise();
    }
  };
}
