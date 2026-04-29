// server/src/config.js
// Environment-driven config loader with validation. No hardcoded secrets.
// Fails fast in production when required variables are missing.

const REQUIRED_PROD = [
  'SESSION_SECRET',
  'JWT_SECRET'
];

const ENUMS = {
  STORAGE_PROVIDER: ['local', 'ibm_cos'],
  AI_PROVIDER:      ['mock', 'watsonx'],
  AUTH_PROVIDER:    ['local', 'oidc', 'ibm_iam'],
  LOG_LEVEL:        ['debug', 'info', 'warn', 'error']
};

function pickEnum(env, name, fallback) {
  const v = env[name];
  if (!v) return fallback;
  if (!ENUMS[name].includes(v)) {
    throw new Error(`config: ${name}="${v}" not in [${ENUMS[name].join(',')}]`);
  }
  return v;
}

function pickInt(env, name, fallback) {
  const v = env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) throw new Error(`config: ${name} must be an integer`);
  return n;
}

function pickList(env, name, fallback) {
  const v = env[name];
  if (!v) return fallback;
  return v.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

export function loadConfig(env = process.env) {
  const APP_ENV = env.APP_ENV || env.NODE_ENV || 'development';
  const isProd = APP_ENV === 'production';

  if (isProd) {
    const missing = REQUIRED_PROD.filter(k => !env[k]);
    if (missing.length) {
      throw new Error(`config: missing required production env vars: ${missing.join(', ')}`);
    }
  }

  const cfg = {
    appEnv:        APP_ENV,
    isProduction:  isProd,
    appBaseUrl:    env.APP_BASE_URL || 'http://localhost:8080',
    port:          pickInt(env, 'PORT', 8080),
    sessionSecret: env.SESSION_SECRET || (isProd ? null : 'dev-only-session-secret-change-me'),
    jwtSecret:     env.JWT_SECRET     || (isProd ? null : 'dev-only-jwt-secret-change-me'),
    logLevel:      pickEnum(env, 'LOG_LEVEL', isProd ? 'info' : 'debug'),

    storage: {
      provider: pickEnum(env, 'STORAGE_PROVIDER', 'local'),
      local:    { dir: env.LOCAL_STORAGE_DIR || './.data/uploads' },
      ibmCos:   {
        endpoint:          env.IBM_COS_ENDPOINT,
        bucket:            env.IBM_COS_BUCKET,
        instanceCrn:       env.IBM_COS_INSTANCE_CRN,
        apiKey:            env.IBM_COS_API_KEY,
        serviceInstanceId: env.IBM_COS_SERVICE_INSTANCE_ID
      }
    },

    ai: {
      provider: pickEnum(env, 'AI_PROVIDER', 'mock'),
      watsonx:  {
        apiKey:    env.WATSONX_API_KEY,
        url:       env.WATSONX_URL,
        projectId: env.WATSONX_PROJECT_ID,
        spaceId:   env.WATSONX_SPACE_ID,
        modelId:   env.WATSONX_MODEL_ID || 'ibm/granite-13b-chat-v2'
      }
    },

    governance: {
      enabled:      env.GOVERNANCE_ENABLED === 'true',
      projectId:    env.GOVERNANCE_PROJECT_ID || null,
      policySetId:  env.GOVERNANCE_POLICY_SET_ID || null
    },

    auth: {
      provider:     pickEnum(env, 'AUTH_PROVIDER', 'local'),
      issuerUrl:    env.AUTH_ISSUER_URL || null,
      clientId:     env.AUTH_CLIENT_ID || null,
      clientSecret: env.AUTH_CLIENT_SECRET || null
    },

    upload: {
      maxMb:        pickInt(env, 'MAX_UPLOAD_MB', 25),
      allowedTypes: pickList(env, 'ALLOWED_UPLOAD_TYPES', [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv'
      ])
    },

    ibm: {
      apiKey:           env.IBM_CLOUD_API_KEY || null,
      region:           env.IBM_CLOUD_REGION || null,
      resourceGroup:    env.IBM_RESOURCE_GROUP || null,
      codeEngineProj:   env.IBM_CODE_ENGINE_PROJECT || null,
      codeEngineApp:    env.IBM_CODE_ENGINE_APP_NAME || null
    }
  };

  // Provider sanity warnings (don't crash dev — warn).
  if (cfg.ai.provider === 'watsonx' && !cfg.ai.watsonx.apiKey) {
    if (isProd) throw new Error('config: AI_PROVIDER=watsonx but WATSONX_API_KEY missing');
    console.warn('[config] watsonx selected without WATSONX_API_KEY — falling back to mock at runtime');
  }
  if (cfg.storage.provider === 'ibm_cos' && !cfg.storage.ibmCos.bucket) {
    if (isProd) throw new Error('config: STORAGE_PROVIDER=ibm_cos but IBM_COS_BUCKET missing');
    console.warn('[config] ibm_cos selected without IBM_COS_BUCKET — falling back to local at runtime');
  }

  return cfg;
}
