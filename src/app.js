'use strict'

const Koa = require('koa')
const bcrypt = require('bcrypt')
const { ulid } = require('ulid')
const path = require('path')
const router = require('koa-router')()
const koaStatic = require('koa-static')
const mount = require('koa-mount')
const open = require('open')
const koaBody = require('koa-body')
const debug = require('debug')('oasis')
const ssbRef = require('ssb-ref')

const author = require('./pages/author')
const hashtag = require('./pages/hashtag')
const home = require('./pages/home')
const profile = require('./pages/profile')
const raw = require('./pages/raw')
const thread = require('./pages/thread')
const like = require('./pages/like')
const status = require('./pages/status')
const highlight = require('./pages/highlight')
const mentions = require('./pages/mentions')
const reply = require('./pages/reply')
const publishReply = require('./pages/publish-reply')
const image = require('./pages/image')

const COOKIE_NAME = 'private-oasis'

let authenticated = false
let session

module.exports = (config) => {
  const assets = new Koa()
  assets.use(koaStatic(path.join(__dirname, 'assets')))

  const app = new Koa()
  module.exports = app

  app.on('error', (e) => {
    // Output full error objects
    e.message = e.stack
    e.expose = true
    return null
  })

  app.use(mount('/assets', assets))

  router
    .post('/authenticate', koaBody(), async (ctx) => {
      const { password } = ctx.request.body
      if (!bcrypt.compare(`${process.env.OASIS_PWD}`, password)) {
        ctx.status = 401
        ctx.body = Unauthorized
        return
      }
      session = ulid()
      authenticated = true
      ctx.cookies.set(COOKIE_NAME, session)
      ctx.status = 200
    })
    .use((ctx, next) => {
      const cookie = ctx.cookies.get(COOKIE_NAME)
      if (!authenticated || cookie.length !== session.length) {
        ctx.redirect('/login')
        return
      }
      if (!timingSafeEqual(Buffer.from(cookie), Buffer.from(session))) {
        ctx.redirect('/login')
        return
      }
      return next()
    })
    .param('imageSize', (imageSize, ctx, next) => {
      const size = Number(imageSize)
      ctx.assert(typeof size === 'number' && size % 1 === 0 && size > 2 && size < 1e10, 'Invalid image size')
      return next()
    })
    .param('blobId', (blobId, ctx, next) => {
      ctx.assert(ssbRef.isBlob(blobId), 400, 'Invalid blob link')
      return next()
    })
    .param('message', (message, ctx, next) => {
      ctx.assert(ssbRef.isMsg(message), 400, 'Invalid message link')
      return next()
    })
    .param('feed', (message, ctx, next) => {
      ctx.assert(ssbRef.isFeedId(message), 400, 'Invalid feed link')
      return next()
    })
    .get('/', async (ctx) => {
      ctx.body = await home()
    })
    .get('/author/:feed', async (ctx) => {
      const { feed } = ctx.params
      ctx.body = await author(feed)
    })
    .get('/hashtag/:channel', async (ctx) => {
      const { channel } = ctx.params
      ctx.body = await hashtag(channel)
    })
    .get('/highlight/:style', (ctx) => {
      const { style } = ctx.params
      ctx.type = 'text/css'
      ctx.body = highlight(style)
    })
    .get('/profile/', async (ctx) => {
      ctx.body = await profile()
    })
    .get('/raw/:message', async (ctx) => {
      const { message } = ctx.params
      ctx.type = 'application/json'
      ctx.body = await raw(message)
    })
    .get('/image/:imageSize/:blobId', async (ctx) => {
      const { blobId, imageSize } = ctx.params
      ctx.type = 'image/png'
      ctx.body = await image({ blobId, imageSize: Number(imageSize) })
    })
    .get('/status/', async (ctx) => {
      ctx.body = await status()
    })
    .get('/mentions/', async (ctx) => {
      ctx.body = await mentions()
    })
    .get('/thread/:message', async (ctx) => {
      const { message } = ctx.params
      ctx.body = await thread(message)
    })
    .get('/reply/:message', async (ctx) => {
      const { message } = ctx.params
      ctx.body = await reply(message, false)
    })
    .post('/reply/:message', koaBody(), async (ctx) => {
      const { message } = ctx.params
      const text = String(ctx.request.body.text)
      ctx.body = await publishReply({ message, text })
      ctx.redirect('/')
    })
    .post('/like/:message', koaBody(), async (ctx) => {
      const { message } = ctx.params
      // TODO: convert all so `message` is full message and `messageKey` is key
      const messageKey = message

      const voteValue = Number(ctx.request.body.voteValue)

      const referer = new URL(ctx.request.header.referer)
      const encoded = {
        message: encodeURIComponent(message)
      }

      referer.hash = `centered-footer-${encoded.message}`
      ctx.body = await like({ messageKey, voteValue })
      ctx.redirect(referer)
    })

  app.use(router.routes())

  const { host } = config
  const { port } = config
  const uri = `http://${host}:${port}/`

  debug.enabled = true
  debug(`Listening on ${uri}`)

  app.listen({ host, port })

  if (config.open === true) {
    open(uri)
  }
}
