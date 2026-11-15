import { createServer } from 'node:http'
import { randomBytes, createHmac, timingSafeEqual, createCipheriv, createDecipheriv, createHash } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

loadEnv()

const HOST = process.env.HOST || '127.0.0.1'
const PORT = Number(process.env.API_PORT || 8787)
const BASE_URL = process.env.APP_BASE_URL || `http://${HOST}:${PORT}`
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const STORE_PATH = resolve(process.env.TOKEN_STORE_PATH || './.private/provider-tokens.enc')
const CANVAS_BASE = (process.env.CANVAS_BASE_URL || 'https://friendsseminary.instructure.com').replace(/\/$/, '')
const SCHOOL_EMAIL_DOMAIN = process.env.SCHOOL_EMAIL_DOMAIN || 'friendsseminary.org'
const SCHOOL_EMAIL_ADDRESS = process.env.SCHOOL_EMAIL_ADDRESS || ''
const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token'
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1'
const COOKIE_NAME = 'jamesos_sid'
const MAX_BODY = 16_384
const COOKIE_SECRET = process.env.APP_SESSION_SECRET || ''
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || ''
const sessions = new Map()

if (HOST !== '127.0.0.1' && HOST !== '::1' && HOST !== 'localhost') {
  throw new Error('This starter server is single-user and must bind to localhost. Add real user authentication and a managed encrypted database before public deployment.')
}
secretReady()

function loadEnv() {
  try {
    const contents = readFileSync('.env', 'utf8')
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
      if (match && !(match[1] in process.env)) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
    }
  } catch { /* Environment variables can be supplied by the shell. */ }
}

function secretReady() {
  if (!COOKIE_SECRET || COOKIE_SECRET.length < 32) throw new Error('Set APP_SESSION_SECRET to a random value of at least 32 characters.')
  let key
  try { key = Buffer.from(ENCRYPTION_KEY, 'base64') } catch { key = Buffer.alloc(0) }
  if (key.length !== 32) throw new Error('Set TOKEN_ENCRYPTION_KEY to a base64-encoded 32-byte key.')
  return key
}

function b64url(value) { return Buffer.from(value).toString('base64url') }
function random(size = 32) { return randomBytes(size).toString('base64url') }
function sign(value) { return createHmac('sha256', COOKIE_SECRET).update(value).digest('base64url') }
function sessionId(req, res) {
  const raw = req.headers.cookie?.split(';').map((x) => x.trim()).find((x) => x.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1)
  if (raw) {
    const [id, signature] = raw.split('.')
    if (id && signature) {
      const expected = Buffer.from(sign(id))
      const actual = Buffer.from(signature)
      if (actual.length === expected.length && timingSafeEqual(actual, expected)) return id
    }
  }
  const id = random(24)
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${id}.${sign(id)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`)
  return id
}

function send(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
  res.end(JSON.stringify(value))
}

function redirect(res, location) {
  res.writeHead(302, { Location: location, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' })
  res.end()
}

function safeReturnPath(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

async function readStore() {
  try {
    const packed = JSON.parse(await readFile(STORE_PATH, 'utf8'))
    const key = secretReady()
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(packed.iv, 'base64'))
    decipher.setAuthTag(Buffer.from(packed.tag, 'base64'))
    const plain = Buffer.concat([decipher.update(Buffer.from(packed.data, 'base64')), decipher.final()])
    return JSON.parse(plain.toString('utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return {}
    if (error.code === 'ERR_OSSL_BAD_DECRYPT' || error.name === 'SyntaxError') throw new Error('The encrypted provider-token file cannot be opened. Check TOKEN_ENCRYPTION_KEY and the private token store.')
    throw error
  }
}

async function writeStore(value) {
  const key = secretReady()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  await mkdir(dirname(STORE_PATH), { recursive: true, mode: 0o700 })
  const temporaryPath = `${STORE_PATH}.${random(8)}.tmp`
  await writeFile(temporaryPath, JSON.stringify({ iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') }), { mode: 0o600 })
  const { rename } = await import('node:fs/promises')
  await rename(temporaryPath, STORE_PATH)
}

function integrationConfig(provider) {
  if (provider === 'google') return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${BASE_URL}/api/oauth/google/callback`,
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
  }
  if (provider === 'gmail') return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${BASE_URL}/api/oauth/gmail/callback`,
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
  }
  if (provider === 'canvas') return {
    clientId: process.env.CANVAS_CLIENT_ID,
    clientSecret: process.env.CANVAS_CLIENT_SECRET,
    redirectUri: `${BASE_URL}/api/oauth/canvas/callback`,
    scope: [
      'url:GET|/api/v1/courses',
      'url:GET|/api/v1/courses/:course_id/assignments',
      'url:GET|/api/v1/users/:user_id/missing_submissions',
    ].join(' '),
  }
  return null
}

function providerStatus(tokens, provider) {
  const config = integrationConfig(provider)
  return { configured: Boolean(config?.clientId && config?.clientSecret), connected: Boolean(tokens[provider]?.refresh_token || tokens[provider]?.access_token), lastSynced: tokens[provider]?.lastSynced || null }
}

async function getOAuthTokens(provider, code, verifier) {
  const config = integrationConfig(provider)
  if (!config?.clientId || !config?.clientSecret) throw new Error(`${provider} OAuth is not configured on the server.`)
  const endpoint = provider === 'canvas' ? `${CANVAS_BASE}/login/oauth2/token` : GOOGLE_TOKEN
  const form = new URLSearchParams({ grant_type: 'authorization_code', client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, code })
  if (provider === 'google' && verifier) form.set('code_verifier', verifier)
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form })
  if (!response.ok) throw new Error(`${provider} authorization could not be completed (HTTP ${response.status}).`)
  return response.json()
}

async function accessToken(provider, tokens) {
  const entry = tokens[provider]
  if (!entry) throw new Error(`${provider} is not connected.`)
  if (entry.expires_at && entry.expires_at > Date.now() + 60_000 && entry.access_token) return entry.access_token
  if (!entry.refresh_token) return entry.access_token
  const config = integrationConfig(provider)
  const endpoint = provider === 'canvas' ? `${CANVAS_BASE}/login/oauth2/token` : GOOGLE_TOKEN
  const form = new URLSearchParams({ grant_type: 'refresh_token', client_id: config.clientId, client_secret: config.clientSecret, refresh_token: entry.refresh_token })
  if (provider === 'canvas') form.set('redirect_uri', config.redirectUri)
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form })
  if (!response.ok) throw new Error(`${provider} authorization expired. Reconnect this account.`)
  const fresh = await response.json()
  tokens[provider] = { ...entry, ...fresh, refresh_token: fresh.refresh_token || entry.refresh_token, expires_at: Date.now() + (fresh.expires_in || 3600) * 1000 }
  await writeStore(tokens)
  return fresh.access_token
}

async function apiGet(url, token) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Provider request failed (HTTP ${response.status}).`)
  return response.json()
}

async function getCanvasPages(url, token) {
  const items = []
  let next = url
  while (next) {
    const parsed = new URL(next)
    if (parsed.origin !== new URL(CANVAS_BASE).origin) throw new Error('Canvas returned an unexpected pagination host.')
    const response = await fetch(next, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
    if (!response.ok) throw new Error(`Canvas request failed (HTTP ${response.status}).`)
    items.push(...await response.json())
    const link = response.headers.get('link') || ''
    next = link.split(',').map((part) => part.match(/<([^>]+)>;\s*rel="([^"]+)"/)).find((match) => match?.[2] === 'next')?.[1] || null
  }
  return items
}

async function googleData(tokens) {
  const token = await accessToken('google', tokens)
  const calendars = await apiGet('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250', token)
  const start = new Date().toISOString()
  const end = new Date(Date.now() + 90 * 86400_000).toISOString()
  const events = []
  for (const calendar of calendars.items || []) {
    let url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`)
    url.search = new URLSearchParams({ timeMin: start, timeMax: end, singleEvents: 'true', orderBy: 'startTime', maxResults: '250' }).toString()
    let data
    do {
      data = await apiGet(url, token)
      for (const event of data.items || []) events.push({ id: `google:${calendar.id}:${event.id}`, title: event.summary || 'Untitled event', start: event.start?.dateTime || event.start?.date, end: event.end?.dateTime || event.end?.date, location: event.location || '', calendar: calendar.summary || 'Google Calendar', source: 'google', status: 'fixed' })
      if (data.nextPageToken) url.searchParams.set('pageToken', data.nextPageToken)
      else url = null
    } while (url)
  }
  tokens.google.lastSynced = new Date().toISOString()
  await writeStore(tokens)
  return events
}

async function canvasData(tokens) {
  const token = await accessToken('canvas', tokens)
  const root = `${CANVAS_BASE}/api/v1`
  const [courses, missing] = await Promise.all([
    getCanvasPages(`${root}/courses?enrollment_state=active&per_page=100`, token),
    getCanvasPages(`${root}/users/self/missing_submissions?include[]=course&per_page=100`, token),
  ])
  const missingIds = new Set(missing.map((item) => `${item.course_id}:${item.id}`))
  const now = Date.now()
  const cutoff = now + 120 * 86400_000
  const tasks = []
  for (const course of courses.filter((item) => item.id && item.name)) {
    const assignments = await getCanvasPages(`${root}/courses/${encodeURIComponent(course.id)}/assignments?include[]=submission&per_page=100`, token)
    for (const assignment of assignments) {
      if (!assignment.published || !assignment.due_at) continue
      const due = new Date(assignment.due_at)
      const isMissing = missingIds.has(`${course.id}:${assignment.id}`) || assignment.submission?.missing === true
      const submitted = Boolean(assignment.submission?.submitted_at)
      if (!isMissing && (submitted || due.getTime() < now || due.getTime() > cutoff)) continue
      tasks.push({ id: `canvas:${course.id}:${assignment.id}`, title: assignment.name, course: course.name, due: assignment.due_at, url: assignment.html_url, status: isMissing ? 'missing' : submitted ? 'submitted' : 'upcoming', source: 'canvas', done: submitted && !isMissing })
    }
  }
  tokens.canvas.lastSynced = new Date().toISOString()
  await writeStore(tokens)
  return tasks
}

function getHeader(message, name) {
  return message.payload?.headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value || ''
}

async function gmailData(tokens) {
  const token = await accessToken('gmail', tokens)
  const query = `newer_than:30d from:(@${SCHOOL_EMAIL_DOMAIN}) -in:spam -in:trash -from:${SCHOOL_EMAIL_ADDRESS}`
  const listUrl = new URL(`${GMAIL_API}/users/me/messages`)
  listUrl.search = new URLSearchParams({ q: query, maxResults: '40' }).toString()
  const list = await apiGet(listUrl, token)
  const threadIds = [...new Set((list.messages || []).map((item) => item.threadId).filter(Boolean))].slice(0, 30)
  const messages = []
  for (const threadId of threadIds) {
    const threadUrl = new URL(`${GMAIL_API}/users/me/threads/${encodeURIComponent(threadId)}`)
    threadUrl.searchParams.set('format', 'metadata')
    for (const header of ['From', 'To', 'Subject', 'Date']) threadUrl.searchParams.append('metadataHeaders', header)
    const thread = await apiGet(threadUrl, token)
    const ordered = [...(thread.messages || [])].sort((a, b) => Number(a.internalDate || 0) - Number(b.internalDate || 0))
    const teacherMessages = ordered.filter((message) => !getHeader(message, 'From').toLowerCase().includes(SCHOOL_EMAIL_ADDRESS.toLowerCase()))
    const teacherMessage = teacherMessages.at(-1)
    const latest = ordered.at(-1)
    if (!teacherMessage || !latest) continue
    const from = getHeader(teacherMessage, 'From')
    const replied = Number(latest.internalDate || 0) > Number(teacherMessage.internalDate || 0) && getHeader(latest, 'From').toLowerCase().includes(SCHOOL_EMAIL_ADDRESS.toLowerCase())
    const snippet = teacherMessage.snippet || ''
    const asksForReply = /\?|please (reply|respond|confirm|let me know)|could you|can you|would you|let me know/i.test(snippet)
    messages.push({ id: threadId, subject: getHeader(teacherMessage, 'Subject') || '(No subject)', from, receivedAt: new Date(Number(teacherMessage.internalDate || Date.now())).toISOString(), snippet, status: replied ? 'replied' : asksForReply ? 'possible-reply' : 'review', url: `https://mail.google.com/mail/u/0/#all/${threadId}` })
  }
  messages.sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt))
  tokens.gmail.lastSynced = new Date().toISOString()
  await writeStore(tokens)
  return messages
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', BASE_URL)
  const sid = sessionId(req, res)
  const session = sessions.get(sid) || {}
  sessions.set(sid, session)
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true })
    if (req.method === 'GET' && url.pathname === '/api/integrations/status') {
      const tokens = await readStore()
      return send(res, 200, { googleCalendar: providerStatus(tokens, 'google'), gmail: providerStatus(tokens, 'gmail'), canvas: providerStatus(tokens, 'canvas'), mode: 'local-single-user' })
    }
    const startMatch = url.pathname.match(/^\/api\/integrations\/(google|gmail|canvas)\/connect$/)
    if (req.method === 'GET' && startMatch) {
      const provider = startMatch[1]
      const config = integrationConfig(provider)
      if (!config.clientId || !config.clientSecret || (provider === 'gmail' && !SCHOOL_EMAIL_ADDRESS)) return send(res, 503, { error: `${provider} OAuth settings are incomplete. Check the server environment.` })
      const state = random()
      const verifier = provider === 'google' ? random(48) : undefined
      session.pending = { provider, state, verifier, returnPath: safeReturnPath(url.searchParams.get('returnTo')) }
      const authorize = provider === 'canvas' ? new URL(`${CANVAS_BASE}/login/oauth2/auth`) : new URL(GOOGLE_AUTH)
      authorize.search = new URLSearchParams({ client_id: config.clientId, response_type: 'code', redirect_uri: config.redirectUri, scope: config.scope, state, ...(provider === 'google' ? { access_type: 'offline', prompt: 'consent', code_challenge: b64url(createHash('sha256').update(verifier).digest()), code_challenge_method: 'S256' } : {}) }).toString()
      return redirect(res, authorize.toString())
    }
    const callback = url.pathname.match(/^\/api\/oauth\/(google|gmail|canvas)\/callback$/)
    if (req.method === 'GET' && callback) {
      const provider = callback[1]
      const pending = session.pending
      delete session.pending
      if (!pending || pending.provider !== provider || pending.state !== url.searchParams.get('state')) return send(res, 400, { error: 'Authorization state check failed. Start the connection again.' })
      if (url.searchParams.get('error')) return redirect(res, `${FRONTEND_URL}${pending.returnPath}?integration_error=${encodeURIComponent(url.searchParams.get('error'))}`)
      const received = await getOAuthTokens(provider, url.searchParams.get('code'), pending.verifier)
      if (provider === 'gmail') {
        const profile = await apiGet(`${GMAIL_API}/users/me/profile`, received.access_token)
        if (profile.emailAddress?.toLowerCase() !== SCHOOL_EMAIL_ADDRESS.toLowerCase()) return send(res, 403, { error: `Connect the school account ${SCHOOL_EMAIL_ADDRESS} to use the teacher-message panel.` })
      }
      const tokens = await readStore()
      tokens[provider] = { ...received, expires_at: Date.now() + (received.expires_in || 3600) * 1000, connectedAt: new Date().toISOString() }
      await writeStore(tokens)
      return redirect(res, `${FRONTEND_URL}${pending.returnPath}?connected=${provider}`)
    }
    if (req.method === 'GET' && url.pathname === '/api/data') {
      const tokens = await readStore()
      const [events, tasks, messages] = await Promise.all([
        tokens.google ? googleData(tokens) : Promise.resolve([]),
        tokens.canvas ? canvasData(tokens) : Promise.resolve([]),
        tokens.gmail ? gmailData(tokens) : Promise.resolve([]),
      ])
      return send(res, 200, { events, tasks, messages, syncedAt: new Date().toISOString(), providers: { googleCalendar: providerStatus(tokens, 'google'), gmail: providerStatus(tokens, 'gmail'), canvas: providerStatus(tokens, 'canvas') } })
    }
    if (req.method === 'POST' && url.pathname === '/api/integrations/disconnect') {
      const origin = req.headers.origin
      const allowedOrigins = new Set([BASE_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'])
      if (origin && !allowedOrigins.has(origin)) return send(res, 403, { error: 'Request origin is not allowed.' })
      let body = ''
      for await (const chunk of req) { body += chunk; if (body.length > MAX_BODY) return send(res, 413, { error: 'Request is too large.' }) }
      const { provider } = JSON.parse(body || '{}')
      if (!['google', 'gmail', 'canvas'].includes(provider)) return send(res, 400, { error: 'Unknown provider.' })
      const tokens = await readStore()
      delete tokens[provider]
      await writeStore(tokens)
      return send(res, 200, { ok: true })
    }
    return send(res, 404, { error: 'Not found.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected integration error.'
    return send(res, 502, { error: message })
  }
})

server.listen(PORT, HOST, () => console.log(`JAMES OS integration server listening on ${HOST}:${PORT}`))
