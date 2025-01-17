'use strict'

const debug = require('debug')('oasis')
const flotilla = require('@fraction/flotilla')
const ssbClient = require('ssb-client')
const ssbConfig = require('ssb-config')

const server = flotilla()

const rawConnect = () => new Promise((resolve, reject) => {
  ssbClient((err, api) => {
    if (err) {
      reject(err)
    } else {
      resolve(api)
    }
  })
})

const db = {
  connect () {
    return handle
  },
  /**
   * @param {function} method
   */
  get (method, ...opts) {
    return new Promise((resolve, reject) => {
      method(...opts, (err, val) => {
        if (err) {
          reject(err)
        } else {
          resolve(val)
        }
      })
    })
  },
  read (method, ...args) {
    return new Promise((resolve, reject) => {
      resolve(method(...args))
    })
  }
}

debug.enabled = true

const handle = new Promise((resolve, reject) => {
  rawConnect().then((ssb) => {
    debug('Using pre-existing Scuttlebutt server instead of starting one')
    resolve(ssb)
  }).catch(() => {
    debug('Initial connection attempt failed')
    debug('Starting Scuttlebutt server')

    server(ssbConfig)

    const connectOrRetry = () => {
      rawConnect().then((ssb) => {
        debug('Retrying connection to own server')
        resolve(ssb)
      }).catch((e) => {
        debug(e)
        connectOrRetry()
      })
    }

    connectOrRetry()
  })
})

module.exports = db
