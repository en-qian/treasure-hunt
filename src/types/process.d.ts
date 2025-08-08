export declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: string;
      PORT: string;
      APPLICATION_ENV: 'production' | 'dev';
      SECRET_KEY: string;

      DB_USERNAME: string;
      DB_PASSWORD: string;
      DB_SERVER: string;
      DB_NAME: string;

      COOKIE_SECRET: string;
      COOKIE_SESSION_NAME: string;
      COOKIE_SAME_SITE: 'TRUE' | 'FALSE';
      COOKIE_SESSION_TTL: string;
    }
  }
}
