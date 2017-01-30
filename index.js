const aws = require('./aws')
const cloudflare = require('./cloudflare')
const k8s = require('./k8s')
const util = require('./util')
const vault = require('./vault')

module.exports = {
    aws,
    cloudflare,
    k8s,
    util,
    vault
}
