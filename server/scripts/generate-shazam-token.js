/**
 * Apple Developer Token (JWT) 생성 - ShazamKit Catalog용
 *
 * 사용법:
 *   P8_PATH=경로/ AuthKey_XXXXX.p8 KEY_ID=FYPT92RXJR TEAM_ID=YQ84HYWRR7 node scripts/generate-shazam-token.js
 *
 * .p8 파일은 Git에 올리지 말고, melody_snap/app/secrets/ 등 gitignore된 폴더에 보관.
 */

const fs = require('fs');
const path = require('path');

const P8_PATH = process.env.P8_PATH || path.join(__dirname, '../../app/secrets/AuthKey_FYPT92RXJR.p8');
const KEY_ID = process.env.KEY_ID || 'FYPT92RXJR';
const TEAM_ID = process.env.TEAM_ID || 'YQ84HYWRR7';
const EXPIRE_SEC = Number(process.env.EXPIRE_SEC) || 15777000; // 6 months

function generateToken() {
  try {
    // jsonwebtoken 사용 (ES256 지원)
    const jwt = require('jsonwebtoken');
    const p8Path = path.isAbsolute(P8_PATH) ? P8_PATH : path.resolve(__dirname, P8_PATH);
    if (!fs.existsSync(p8Path)) {
      console.error('❌ .p8 파일을 찾을 수 없습니다:', p8Path);
      console.error('   P8_PATH 환경 변수로 경로를 지정하세요.');
      process.exit(1);
    }
    const privateKey = fs.readFileSync(p8Path, 'utf8');
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      {
        iss: TEAM_ID,
        iat: now,
        exp: now + EXPIRE_SEC,
      },
      privateKey,
      {
        algorithm: 'ES256',
        header: {
          alg: 'ES256',
          kid: KEY_ID,
        },
      }
    );
    console.log('✅ ShazamKit Developer Token (JWT):');
    console.log(token);
    return token;
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND' && e.message.includes('jsonwebtoken')) {
      console.error('❌ jsonwebtoken 패키지가 필요합니다. server 폴더에서 실행:');
      console.error('   npm install jsonwebtoken');
      process.exit(1);
    }
    throw e;
  }
}

generateToken();
