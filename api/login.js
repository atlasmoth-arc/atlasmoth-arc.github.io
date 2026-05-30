// api/login.js
// Vercel serverless function — validates admin password, sets signed session cookie

import { serialize } from 'cookie';
import { createHmac } from 'crypto';

const PASSWORD = process.env.ADMIN_PASSWORD;
const SECRET   = process.env.COOKIE_SECRET || process.env.ADMIN_PASSWORD;
const MAX_AGE  = 60 * 60 * 24; // 24 hours

function sign(value) {
  return value + '.' + createHmac('sha256', SECRET).update(value).digest('base64url');
}

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;

  if (!PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD env var not set' });
  }

  if (password !== PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  const token  = sign('admin');
  const cookie = serialize('admin_session', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   MAX_AGE,
    path:     '/',
  });

  res.setHeader('Set-Cookie', cookie);
  return res.status(200).json({ ok: true });
}
