const rateLimit = require('express-rate-limit').rateLimit
const express = require('express')
const fs = require('fs')
const { render } = require('mustache')
const jose = require('node-jose')
const path = require('path')
const ExpiryMap = require('expiry-map')

const assertions = require('../assertions')
const samlArtifact = require('../saml-artifact')

const LOGIN_TEMPLATE = fs.readFileSync(
  path.resolve(__dirname, '../../static/html/login-page.html'),
  'utf8',
)
const NONCE_TIMEOUT = 5 * 60 * 1000
const nonceStore = new ExpiryMap(NONCE_TIMEOUT)

const idGenerator = {
  singPass: (rawId) =>
    assertions.myinfo.v3.personas[rawId] ? `${rawId} [MyInfo]` : rawId,
  corpPass: (rawId) => `${rawId.nric} / UEN: ${rawId.uen}`,
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

function config(app, { showLoginPage, idpConfig, serviceProvider }) {
  for (const idp of ['singPass', 'corpPass']) {
    app.get(`/${idp.toLowerCase()}/authorize`, (req, res) => {
      const redirectURI = req.query.redirect_uri
      const state = encodeURIComponent(req.query.state)
      if (showLoginPage) {
        const oidc = assertions.oidc[idp]
        const values = oidc.map((rawId, index) => {
          const code = encodeURIComponent(
            samlArtifact(idpConfig[idp].id, index),
          )
          if (req.query.nonce) {
            nonceStore.set(code, req.query.nonce)
          }
          const assertURL = `${redirectURI}?code=${code}&state=${state}`
          const id = idGenerator[idp](rawId)
          return { id, assertURL }
        })
        const response = render(LOGIN_TEMPLATE, { values })
        res.send(response)
      } else {
        const code = encodeURIComponent(samlArtifact(idpConfig[idp].id))
        if (req.query.nonce) {
          nonceStore.set(code, req.query.nonce)
        }
        const assertURL = `${redirectURI}?code=${code}&state=${state}`
        console.warn(
          `Redirecting login from ${req.query.client_id} to ${redirectURI}`,
        )
        res.redirect(assertURL)
      }
    })

    app.post(
      `/${idp.toLowerCase()}/token`,
      express.urlencoded({ extended: false }),
      apiLimiter,
      async (req, res) => {
        const { client_id: aud, grant_type: grant } = req.body
        let nonce, uuid

        if (grant === 'refresh_token') {
          const { refresh_token: refreshToken } = req.body
          console.warn(`Refreshing tokens with ${refreshToken}`)

          uuid = refreshToken.split('/')[0]
        } else {
          const { code: artifact } = req.body
          console.warn(
            `Received artifact ${artifact} from ${aud} and ${req.body.redirect_uri}`,
          )
          const artifactBuffer = Buffer.from(artifact, 'base64')
          uuid = artifactBuffer.readInt8(artifactBuffer.length - 1)
          nonce = nonceStore.get(encodeURIComponent(artifact))
        }

        // use env NRIC when SHOW_LOGIN_PAGE is false
        if (uuid === -1) {
          uuid =
            idp === 'singPass'
              ? assertions.oidc.singPass.indexOf(assertions.singPassNric)
              : assertions.oidc.corpPass.findIndex(
                  (c) => c.nric === assertions.corpPassNric,
                )
        }

        const { idTokenClaims, accessToken, refreshToken } =
          await assertions.oidc.create[idp](
            uuid,
            `${req.protocol}://${req.get('host')}`,
            aud,
            nonce,
          )

        const signingPem = fs.readFileSync(
          path.resolve(__dirname, '../../static/certs/spcp-key.pem'),
        )
        const signingKey = await jose.JWK.asKey(signingPem, 'pem')
        const signedIdToken = await jose.JWS.createSign(
          { format: 'compact' },
          signingKey,
        )
          .update(JSON.stringify(idTokenClaims))
          .final()

        const encryptionKey = await jose.JWK.asKey(serviceProvider.cert, 'pem')
        const idToken = await jose.JWE.createEncrypt(
          { format: 'compact', fields: { cty: 'JWT' } },
          encryptionKey,
        )
          .update(signedIdToken)
          .final()

        res.send({
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 24 * 60 * 60,
          scope: 'openid',
          token_type: 'bearer',
          id_token: idToken,
        })
      },
    )
  }
  return app
}

module.exports = config
