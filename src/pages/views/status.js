'use strict'

const highlightJs = require('highlight.js')
const {
  h1,
  h2,
  h3,
  label,
  li,
  pre,
  progress,
  section,
  ul
} = require('hyperaxe')
const template = require('./components/template')

module.exports = ({ status }) => {
  const max = status.sync.since

  const progressElements = Object.entries(status.sync.plugins).map((e) => {
    const [key, val] = e
    const id = `progress-${key}`
    return [
      label({ for: id }, key),
      progress({ id, value: val, max }, val)
    ]
  })

  const localPeers = Object.keys(status.local || []).map((key) => li(key))

  const remotePeers = Object.keys(status.gossip || []).map((key) => li(key))

  const raw = JSON.stringify(status, null, 2)
  const rawHighlighted = highlightJs.highlight('json', raw).value

  return template(
    section({ class: 'message' },
      h1('Status'),
      h2('Indexes'),
      progressElements,
      h2('Peers'),
      h3('Local'),
      ul(localPeers),
      h3('Remote'),
      ul(remotePeers),
      h2('Raw'),
      pre({ innerHTML: rawHighlighted }))
  )
}
