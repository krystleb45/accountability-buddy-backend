// redis-killer.mjs - Safe Redis elimination for production
console.log('🚨 PRODUCTION: Redis eliminated for stability');

const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  // Block ALL Redis-related modules
  if (id.includes('redis') ||
      id.includes('bull') ||
      id === 'ioredis' ||
      id === 'connect-redis' ||
      id === 'rate-limit-redis') {

    console.log('🚫 PRODUCTION: Blocked', id);

    // Return comprehensive mock
    return {
      createClient: () => ({
        on: () => {},
        connect: () => Promise.resolve(),
        set: () => Promise.resolve('OK'),
        get: () => Promise.resolve(null),
        del: () => Promise.resolve(1),
        quit: () => Promise.resolve(),
        sendCommand: () => Promise.resolve(''),
        sAdd: () => Promise.resolve(1),
        sRem: () => Promise.resolve(1),
        sMembers: () => Promise.resolve([]),
        incr: () => Promise.resolve(1),
        expire: () => Promise.resolve(1),
        keys: () => Promise.resolve([]),
        flushDb: () => Promise.resolve('OK')
      }),
      default: class MockRedis {
        constructor() { console.log('🚫 Mock Redis created'); }
        on() { return this; }
        connect() { return Promise.resolve(); }
        set() { return Promise.resolve('OK'); }
        get() { return Promise.resolve(null); }
        del() { return Promise.resolve(1); }
        quit() { return Promise.resolve(); }
        sendCommand() { return Promise.resolve(''); }
        setex() { return Promise.resolve('OK'); }
        keys() { return Promise.resolve([]); }
      },
      Redis: class MockIoRedis {
        constructor() { console.log('🚫 Mock ioredis created'); }
        on() { return this; }
        connect() { return Promise.resolve(); }
        set() { return Promise.resolve('OK'); }
        get() { return Promise.resolve(null); }
        setex() { return Promise.resolve('OK'); }
        keys() { return Promise.resolve([]); }
        del() { return Promise.resolve(1); }
      },
      Queue: class MockQueue {
        constructor() { console.log('🚫 Mock Bull Queue created'); }
        add() { return Promise.resolve({ id: 'mock' }); }
        process() { return this; }
        on() { return this; }
        close() { return Promise.resolve(); }
      }
    };
  }

  return originalRequire.apply(this, arguments);
};

// Ensure environment variables are set
process.env.DISABLE_REDIS = 'true';
process.env.REDIS_DISABLED = 'true';
process.env.SKIP_REDIS_INIT = 'true';

console.log('✅ PRODUCTION: Redis killer activated');
