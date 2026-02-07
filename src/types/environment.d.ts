declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT?: string;
      HOST?: string;
      LOG_LEVEL?: string;
      DATABASE_URL: string;
      REDIS_HOST?: string;
      REDIS_PORT?: string;
      REDIS_PASSWORD?: string;
      REDIS_DB?: string;
      AUTH_ENABLED?: string;
      JWT_SECRET?: string;
      JWT_ACCESS_TOKEN_EXPIRES_IN?: string;
      JWT_REFRESH_TOKEN_EXPIRES_IN?: string;
      CORS_ORIGIN?: string;
      RATE_LIMIT_MAX?: string;
      RATE_LIMIT_TIME_WINDOW?: string;
      CACHE_ENABLED?: string;
      CACHE_TTL?: string;
      SWAGGER_ENABLED?: string;
    }
  }
}

export {};
