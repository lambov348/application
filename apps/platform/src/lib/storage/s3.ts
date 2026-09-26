/**
 * Хранение в S3-совместимом хранилище (Hetzner Object Storage).
 *
 * Запросы подписываются вручную по схеме AWS Signature V4 — без клиентской
 * библиотеки. Причина: SDK тянет несколько десятков мегабайт зависимостей
 * ради четырёх операций, а подпись занимает сотню строк и не меняется.
 *
 * DSGVO: регион обязан быть в ЕС. Проверка стоит здесь, а не в документации:
 * ошибиться регионом при настройке слишком легко.
 */
import { createHash, createHmac } from "node:crypto";
import { env } from "@/lib/env";
import { assertSafeKey, type StorageDriver, type StoredFile } from "./index";

/** Регионы Hetzner Object Storage и прочие европейские. */
const EU_REGION_PATTERN = /^(fsn1|nbg1|hel1|eu-|europe-)/i;

const sha256 = (data: string | Buffer) =>
  createHash("sha256").update(data).digest("hex");

const hmac = (key: Buffer | string, data: string) =>
  createHmac("sha256", key).update(data).digest();

export function s3Driver(): StorageDriver {
  const endpoint = env.S3_ENDPOINT!;
  const region = env.S3_REGION!;
  const bucket = env.S3_BUCKET!;
  const accessKey = env.S3_ACCESS_KEY_ID!;
  const secretKey = env.S3_SECRET_ACCESS_KEY!;

  if (!EU_REGION_PATTERN.test(region)) {
    throw new Error(
      `Регион хранилища «${region}» не похож на европейский. ` +
        `Глава 3 ТЗ требует хранения данных в ЕС: fsn1, nbg1, hel1 у Hetzner.`,
    );
  }

  const host = new URL(endpoint).host;

  /** Подпись запроса по AWS Signature V4. */
  function sign(
    method: string,
    key: string,
    payload: Buffer,
    contentType?: string,
  ): Record<string, string> {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256(payload);

    const headers: Record<string, string> = {
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    };
    if (contentType) headers["content-type"] = contentType;

    const signedHeaders = Object.keys(headers).sort().join(";");
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map((h) => `${h}:${headers[h]}\n`)
      .join("");

    const canonicalRequest = [
      method,
      `/${bucket}/${key}`,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const scope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      scope,
      sha256(canonicalRequest),
    ].join("\n");

    const signingKey = hmac(
      hmac(hmac(hmac(`AWS4${secretKey}`, dateStamp), region), "s3"),
      "aws4_request",
    );
    const signature = createHmac("sha256", signingKey)
      .update(stringToSign)
      .digest("hex");

    return {
      ...headers,
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    };
  }

  const urlOf = (key: string) => `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;

  return {
    async put(key, data, contentType): Promise<StoredFile> {
      assertSafeKey(key);
      const response = await fetch(urlOf(key), {
        method: "PUT",
        headers: sign("PUT", key, data, contentType),
        body: new Uint8Array(data),
      });
      if (!response.ok) {
        throw new Error(
          `Не удалось сохранить файл в хранилище: ${response.status} ${await response.text()}`,
        );
      }
      return { key, size: data.byteLength, contentType };
    },

    async get(key) {
      assertSafeKey(key);
      const response = await fetch(urlOf(key), {
        method: "GET",
        headers: sign("GET", key, Buffer.alloc(0)),
      });
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`Не удалось прочитать файл: ${response.status}`);
      }
      return {
        data: Buffer.from(await response.arrayBuffer()),
        contentType:
          response.headers.get("content-type") ?? "application/octet-stream",
      };
    },

    async delete(key) {
      assertSafeKey(key);
      await fetch(urlOf(key), {
        method: "DELETE",
        headers: sign("DELETE", key, Buffer.alloc(0)),
      });
    },
  };
}
