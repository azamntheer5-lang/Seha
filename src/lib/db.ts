import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

/**
 * Resolve the SQLite database URL in a way that works EVERYWHERE:
 *
 *  - Local dev (bun/next dev): DATABASE_URL from .env, resolved via cwd.
 *  - Netlify Functions (AWS Lambda): the traced db/custom.db lands inside the
 *    function bundle; its absolute path differs per deploy, so we probe a
 *    small set of well-known locations relative to the runtime cwd.
 *  - Any absolute file: URL passed via env (e.g. Netlify UI override) wins
 *    immediately.
 */
function resolveDatabaseUrl(): string | undefined {
  const envUrl = process.env.DATABASE_URL

  // 1. Env override that is absolute (or non-SQLite) — trust it as-is.
  if (envUrl && !envUrl.startsWith('file:')) return envUrl
  if (envUrl?.startsWith('file:')) {
    const raw = envUrl.slice('file:'.length)
    if (path.isAbsolute(raw)) {
      try {
        if (fs.existsSync(raw)) return envUrl
      } catch {
        /* ignore and fall through to probing */
      }
    }
  }

  // 2. Probe candidate locations (serverless bundles keep the repo-relative
  //    layout under the function root; cwd at runtime = function root).
  const relativeFromEnv = envUrl?.startsWith('file:')
    ? envUrl.slice('file:'.length)
    : undefined

  const candidates: string[] = [
    'db/custom.db', // repo layout, cwd = project/function root
    '../db/custom.db', // cwd nested one level below the bundle root
    '../../db/custom.db', // deeper nesting used by some bundlers
    'prisma/../db/custom.db', // DATABASE_URL="file:../db/custom.db" semantics
  ]
  if (relativeFromEnv && !path.isAbsolute(relativeFromEnv)) {
    candidates.unshift(
      relativeFromEnv,
      path.join('prisma', relativeFromEnv), // relative to schema dir (build semantics)
    )
  }

  for (const candidate of candidates) {
    try {
      const abs = path.resolve(process.cwd(), candidate)
      if (fs.existsSync(abs)) return `file:${abs}`
    } catch {
      /* keep probing */
    }
  }

  // 3. Nothing found (e.g. build-time prerender with no DB needed) — let
  //    Prisma fall back to the raw env value; queries will surface a clear
  //    error if the DB is genuinely missing.
  return undefined
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createClient(): PrismaClient {
  const url = resolveDatabaseUrl()
  const options: ConstructorParameters<typeof PrismaClient>[0] = {
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
  }
  if (url) {
    options.datasources = { db: { url } }
  }
  return new PrismaClient(options)
}

export const db = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
