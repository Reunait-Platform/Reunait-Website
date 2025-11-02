import Redis from 'ioredis'
import { config } from '../config/config.js'

// Reuse the same env-driven configuration as rateLimiter
const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  username: config.redis.username,
  password: config.redis.password,
})

// Connection lifecycle logs (parity with previous rateLimiter client)
redis.on('connect', () => {
  console.log('Successfully connected to Redis Cloud')
})

redis.on('ready', () => {
  console.log('Redis client is ready to use')
})

redis.on('error', (err) => {
  // Log succinctly; controllers fall back gracefully on errors
  console.error('Redis connection error:', err?.message || err)
  console.error('Redis connection details:', {
    host: config.redis.host,
    port: config.redis.port,
    username: config.redis.username,
  })
})

export default redis


