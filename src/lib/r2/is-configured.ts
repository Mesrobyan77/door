type R2Credentials = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicBaseUrl: string;
};

/** True when all required R2 env values are present for the real adapter. */
export function isR2Configured(
  input: Partial<R2Credentials>,
): input is R2Credentials {
  return Boolean(
    input.accountId &&
      input.accessKeyId &&
      input.secretAccessKey &&
      input.bucketName &&
      input.publicBaseUrl,
  );
}
