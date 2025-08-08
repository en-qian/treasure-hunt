import crypto from 'crypto';

export const convertToArray = <T>(input: T | T[]) => {
  return Array.isArray(input) ? input : [input];
};

export const generateId = (segmentLength: number, split?: boolean) => {
  const segments = 5;

  const remainder = segmentLength % 5;

  segmentLength =
    remainder <= 5 - remainder
      ? segmentLength - remainder
      : segmentLength + (5 - remainder);

  const CHARS =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const generateSegment = (length: number) =>
    new Array(length)
      .fill('')
      .map(() => CHARS[Math.floor(Math.random() * CHARS.length)])
      .join('');

  return new Array(segments)
    .fill('')
    .map(() => generateSegment(segmentLength / segments))
    .join(split ? '-' : '');
};

export const createHash =
  (hashMethod: 'sha256' | 'sha512') => (input: string) => {
    return crypto.createHash(hashMethod).update(input).digest('hex');
  };

export const compareHash = (hash: string, systemHash: string) => {
  if (hash.length !== systemHash.length) {
    return false;
  }

  const a = Buffer.from(hash, 'utf8');
  const b = Buffer.from(systemHash, 'utf8');

  return crypto.timingSafeEqual(a, b);
};

export const splitArray = <T>(arr: T[], chunkSize: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    result.push(arr.slice(i, i + chunkSize));
  }

  return result;
};

export const normalizeTimeString = (input: string) => {
  const times = /^(\d+):([0-5]\d):([0-5]\d)$/.exec(input) || [
    '00:00:00',
    '00',
    '00',
    '00',
  ];

  const [_, hours, minutes, seconds] = times;
  const totalSeconds =
    parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);

  const normalizedHours = Math.floor((totalSeconds / 3600) % 24)
    .toString()
    .padStart(2, '0');

  const normalizedMinutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');

  const normalizedSeconds = (totalSeconds % 60).toString().padStart(2, '0');

  return `${normalizedHours}:${normalizedMinutes}:${normalizedSeconds}`;
};
