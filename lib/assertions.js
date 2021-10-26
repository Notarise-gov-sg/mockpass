const base64 = require('base-64')
const crypto = require('crypto')
const fs = require('fs')
const { render } = require('mustache')
const moment = require('moment')
const jose = require('node-jose')
const path = require('path')

const readFrom = (p) => fs.readFileSync(path.resolve(__dirname, p), 'utf8')

const TEMPLATE = readFrom('../static/saml/unsigned-assertion.xml')
const corpPassTemplate = readFrom('../static/saml/corppass.xml')

const defaultAudience =
  process.env.SERVICE_PROVIDER_ENTITY_ID ||
  'http://sp.example.com/demo1/metadata.php'

const createRefreshToken = (uuid) => {
  const prefixSize = (`${uuid}`.length + 1) / 2
  const padding = Number.isInteger(prefixSize) ? '/' : '/f'

  return (
    uuid +
    padding +
    crypto.randomBytes(20 - Math.floor(prefixSize)).toString('hex')
  )
}

const hashToken = (token) => {
  const fullHash = crypto.createHash('sha256')
  fullHash.update(token, 'utf8')
  const fullDigest = fullHash.digest()
  const digestBuffer = fullDigest.slice(0, fullDigest.length / 2)
  if (Buffer.isEncoding('base64url')) {
    return digestBuffer.toString('base64url')
  } else {
    const fromBase64 = (base64) =>
      base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    return fromBase64(digestBuffer.toString('base64'))
  }
}

const myinfo = {
  v2: JSON.parse(readFrom('../static/myinfo/v2.json')),
  v3: JSON.parse(readFrom('../static/myinfo/v3.json')),
}

const saml = {
  singPass: [
    'S6809701J',
    'S8979373D',
    'S8116474F',
    'S8723211E',
    'S5062854Z',
    'T0066846F',
    'F9477325W',
    'S3000024B',
    'S6005040F',
    'S6005041D',
    'S6005042B',
    'S6005043J',
    'S6005044I',
    'S6005045G',
    'S6005046E',
    'S6005047C',
    'S6005064C',
    'S6005065A',
    'S6005066Z',
    'S6005037F',
    'S6005038D',
    'S6005039B',
    'G1612357P',
    'G1612358M',
    'F1612359P',
    'F1612360U',
    'F1612361R',
    'F1612362P',
    'F1612363M',
    'F1612364K',
    'F1612365W',
    'F1612366T',
    'F1612367Q',
    'F1612358R',
    'F1612354N',
    'F1612357U',
    ...Object.keys(myinfo.v2.personas),
  ],
  corpPass: [
    { nric: 'S8979373D', uen: '123456789A' },
    { nric: 'S8116474F', uen: '123456789A' },
    { nric: 'S8723211E', uen: '123456789A' },
    { nric: 'S5062854Z', uen: '123456789B' },
    { nric: 'T0066846F', uen: '123456789B' },
    { nric: 'F9477325W', uen: '123456789B' },
    { nric: 'S3000024B', uen: '123456789C' },
    { nric: 'S6005040F', uen: '123456789C' },
  ],
  create: {
    singPass: (
      nric,
      issuer,
      recipient,
      inResponseTo,
      audience = defaultAudience,
    ) =>
      render(TEMPLATE, {
        name: 'UserName',
        value: nric,
        issueInstant: moment.utc().format(),
        recipient,
        issuer,
        inResponseTo,
        audience,
      }),
    corpPass: (
      source,
      issuer,
      recipient,
      inResponseTo,
      audience = defaultAudience,
    ) =>
      render(TEMPLATE, {
        issueInstant: moment.utc().format(),
        name: source.uen,
        value: base64.encode(render(corpPassTemplate, source)),
        recipient,
        issuer,
        inResponseTo,
        audience,
      }),
  },
}

const oidc = {
  singPass: [
    'S6809701J',
    'S8979373D',
    'S8116474F',
    'S8723211E',
    'S5062854Z',
    'T0066846F',
    'F9477325W',
    'S3000024B',
    'S6005040F',
    'S6005041D',
    'S6005042B',
    'S6005043J',
    'S6005044I',
    'S6005045G',
    'S6005046E',
    'S6005047C',
    'S6005064C',
    'S6005065A',
    'S6005066Z',
    'S6005037F',
    'S6005038D',
    'S6005039B',
    'G1612357P',
    'G1612358M',
    'F1612359P',
    'F1612360U',
    'F1612361R',
    'F1612362P',
    'F1612363M',
    'F1612364K',
    'F1612365W',
    'F1612366T',
    'F1612367Q',
    'F1612358R',
    'F1612354N',
    'F1612357U',
    'T1111111J',
    'S3001470G',
    'S0079439B',
    'S7000577H',
    'G0061653U',
    'A6005046W',
    'S0087346B',
    'S0064495A',
    'A6005047T',
    'S5458190D',
    'S9000260J',
    'S8252445B',
    'T1233284F',
    'S8000001G',
    'S0113911H',
    'A6005059D',
    'S0201488B',
    'A6005063D',
    'G0474086L',
    'S0121639B',
    'S8703396A',
    'S8230472Z',
    'S5359894C',
    'S8769303A',
    'G0646876X',
    'S7000102J',
    'S8001433C',
    'A6005054X',
    'F0308835U',
    'S6417197F',
    'S6005043J',
    'S8001518F',
    'S9000412C',
    'S8017890E',
    'S8458210G',
    'S7694038Z',
    'S8278813A',
    'S5175319D',
    'S0115525C',
    'S8162221C',
    'S9590367C',
    'G5658899Q',
    'G5642275M',
    'S1875083Z',
    'S4000020H',
    'S4407379Z',
    'S6005042B',
    'S6005039B',
    'S6824151J',
    'S6005042B',
    'S3100052A',
    ...Object.keys(myinfo.v3.personas),
  ],
  corpPass: [
    {
      nric: 'S8979373D',
      name: 'Name of S8979373D',
      isSingPassHolder: true,
      uen: '123456789A',
    },
    {
      nric: 'S8116474F',
      name: 'Name of S8116474F',
      isSingPassHolder: true,
      uen: '123456789A',
    },
    {
      nric: 'S8723211E',
      name: 'Name of S8723211E',
      isSingPassHolder: true,
      uen: '123456789A',
    },
    {
      nric: 'S5062854Z',
      name: 'Name of S5062854Z',
      isSingPassHolder: true,
      uen: '123456789B',
    },
    {
      nric: 'T0066846F',
      name: 'Name of T0066846F',
      isSingPassHolder: true,
      uen: '123456789B',
    },
    {
      nric: 'F9477325W',
      name: 'Name of F9477325W',
      isSingPassHolder: false,
      uen: '123456789B',
    },
    {
      nric: 'S3000024B',
      name: 'Name of S3000024B',
      isSingPassHolder: true,
      uen: '123456789C',
    },
    {
      nric: 'S6005040F',
      name: 'Name of S6005040F',
      isSingPassHolder: true,
      uen: '123456789C',
    },
  ],
  create: {
    singPass: (
      uuid,
      iss,
      aud,
      nonce,
      accessToken = crypto.randomBytes(15).toString('hex'),
    ) => {
      const nric = oidc.singPass[uuid]
      const sub = `s=${nric},u=${uuid}`

      const refreshToken = createRefreshToken(uuid)
      const accessTokenHash = hashToken(accessToken)
      const refreshTokenHash = hashToken(refreshToken)

      return {
        accessToken,
        refreshToken,
        idTokenClaims: {
          rt_hash: refreshTokenHash,
          at_hash: accessTokenHash,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
          iss,
          amr: ['pwd'],
          aud,
          sub,
          ...(nonce ? { nonce } : {}),
        },
      }
    },
    corpPass: async (uuid, iss, aud, nonce) => {
      const baseClaims = {
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        iss,
        aud,
      }

      const profile = oidc.corpPass[uuid]
      const sub = `s=${profile.nric},u=${uuid},c=SG`

      const accessTokenClaims = {
        ...baseClaims,
        authorization: {
          EntityInfo: {},
          AccessInfo: {},
          TPAccessInfo: {},
        },
      }

      const signingPem = fs.readFileSync(
        path.resolve(__dirname, '../static/certs/spcp-key.pem'),
      )
      const signingKey = await jose.JWK.asKey(signingPem, 'pem')
      const accessToken = await jose.JWS.createSign(
        { format: 'compact' },
        signingKey,
      )
        .update(JSON.stringify(accessTokenClaims))
        .final()

      const accessTokenHash = hashToken(accessToken)

      return {
        refreshToken: 'refresh',
        accessToken,
        idTokenClaims: {
          ...baseClaims,
          rt_hash: '',
          at_hash: accessTokenHash,
          amr: ['pwd'],
          sub,
          ...(nonce ? { nonce } : {}),
          userInfo: {
            CPAccType: 'User',
            CPUID_FullName: profile.name,
            ISSPHOLDER: profile.isSingPassHolder ? 'YES' : 'NO',
          },
        },
      }
    },
  },
}

const singPassNric = process.env.MOCKPASS_NRIC || saml.singPass[0]
const corpPassNric = process.env.MOCKPASS_NRIC || saml.corpPass[0].nric
const uen = process.env.MOCKPASS_UEN || saml.corpPass[0].uen

module.exports = {
  saml,
  oidc,
  myinfo,
  singPassNric,
  corpPassNric,
  uen,
}
