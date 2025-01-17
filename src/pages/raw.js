'use strict'

const meta = require('./models/meta')

module.exports = async function rawPage (message) {
  const json = await meta.get(message)
  return JSON.stringify(json, null, 2)
}
