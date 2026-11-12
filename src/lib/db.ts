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
 *
 * CRITICAL — serverless filesystems are READ-ONLY: the bundled db file can be
 * read but SQLite must also WRITE (journal/WAL files, INSERTs, UPDATEs).
 * When the resolved location is not writable (Netlify/AWS Lambda), the file is
 * copied ONCE per instance to the writable /tmp directory and that copy is
 * used instead — so issuing sick leaves from the portal works in production.
 * Durable cross-instance durability is layered on top via Netlify Blobs
 * (see src/lib/seha/blob-store.ts).
 */

/** Where the writable per-instance copy lives on serverless runtimes. */
function tmpDbPath(): string {
  return path.join(fs.realpathSync?.('/tmp') ?? '/tmp', 'seha-custom.db')
}

/** True when SQLite can actually write to the file AND its directory. */
function isWritableDbFile(absPath: string): boolean {
  try {
    // SQLite needs to create `-journal` / `-wal` siblings → the DIRECTORY
    // must be writable + searchable (W_OK | X_OK).
    fs.accessSync(path.dirname(absPath), fs.constants.W_OK | fs.constants.X_OK)
    // The database file itself only needs read + write (NOT execute).
    fs.accessSync(absPath, fs.constants.R_OK | fs.constants.W_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Copy a read-only bundled database to /tmp (once per instance) and return
 * the file: URL of the writable copy. Safe to call repeatedly: the copy is
 * only made when the /tmp target does not exist yet.
 */
function makeWritableCopy(absPath: string): string {
  const tmp = tmpDbPath()
  try {
    if (!fs.existsSync(tmp)) {
      fs.copyFileSync(absPath, tmp)
      console.log(`[db] read-only bundle detected — copied ${absPath} → ${tmp}`)
    }
    return `file:${tmp}`
  } catch (error) {
    console.error('[db] failed to create writable copy in /tmp:', error)
    // Last resort: try the original path; the write error will surface clearly.
    return `file:${absPath}`
  }
}

function resolveDatabaseUrl(): string | undefined {
  const envUrl = process.env.DATABASE_URL

  // 1. Env override that is absolute (or non-SQLite) — trust it as-is.
  if (envUrl && !envUrl.startsWith('file:')) return envUrl
  if (envUrl?.startsWith('file:')) {
    const raw = envUrl.slice('file:'.length)
    if (path.isAbsolute(raw)) {
      try {
        if (fs.existsSync(raw)) {
          return isWritableDbFile(raw) ? envUrl : makeWritableCopy(raw)
        }
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
      path.join('prisma', relativeFromEnv) // relative to schema dir (build semantics)
    )
  }

  for (const candidate of candidates) {
    try {
      const abs = path.resolve(process.cwd(), candidate)
      if (fs.existsSync(abs)) {
        return isWritableDbFile(abs) ? `file:${abs}` : makeWritableCopy(abs)
      }
    } catch {
      /* keep probing */
    }
  }

  // 3. Nothing found (e.g. build-time prerender with no DB needed) — let
  // Prisma fall back to the raw env value; queries will surface a clear
  // error if the DB is genuinely missing.
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
