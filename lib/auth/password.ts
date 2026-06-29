import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const keyLength = 64;
const scryptCost = 16384;
const scryptBlockSize = 8;
const scryptParallelization = 1;

export function assertValidPassword(password: string) {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  if (password.length > 128) {
    throw new Error("Password must be 128 characters or fewer");
  }
}

export async function hashPassword(password: string) {
  assertValidPassword(password);

  const salt = randomBytes(16).toString("base64url");
  const hash = await deriveKey(password, salt, keyLength, {
    N: scryptCost,
    r: scryptBlockSize,
    p: scryptParallelization,
    maxmem: 32 * 1024 * 1024,
  });

  return [
    "scrypt",
    scryptCost,
    scryptBlockSize,
    scryptParallelization,
    salt,
    hash.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) {
    return false;
  }

  const [algorithm, cost, blockSize, parallelization, salt, encodedHash] = storedHash.split("$");
  const parsedCost = Number(cost);
  const parsedBlockSize = Number(blockSize);
  const parsedParallelization = Number(parallelization);

  if (algorithm !== "scrypt" || !cost || !blockSize || !parallelization || !salt || !encodedHash) {
    return false;
  }

  if (
    !Number.isInteger(parsedCost) ||
    !Number.isInteger(parsedBlockSize) ||
    !Number.isInteger(parsedParallelization)
  ) {
    return false;
  }

  const expected = Buffer.from(encodedHash, "base64url");
  const actual = await deriveKey(password, salt, expected.length, {
    N: parsedCost,
    r: parsedBlockSize,
    p: parsedParallelization,
    maxmem: 32 * 1024 * 1024,
  });

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

type ScryptOptions = NonNullable<Parameters<typeof scryptCallback>[3]>;

function deriveKey(password: string, salt: string, length: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, length, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}
