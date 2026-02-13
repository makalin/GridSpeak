import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { requireAuth, getUserById } from './auth.js';
import { applyAuthRoutes } from './routes/auth.js';
import { applyServerRoutes } from './routes/servers.js';
import { applyMessageRoutes } from './routes/messages.js';
import { applyMemberRoutes } from './routes/members.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'gridspeak-app-secret-change-in-production';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 },
  })
);

// Populate req.user for session
app.use((req, res, next) => {
  if (req.session?.userId) {
    req.user = getUserById(req.session.userId);
  }
  next();
});

applyAuthRoutes(app);
applyServerRoutes(app, requireAuth);
applyMessageRoutes(app, requireAuth);
applyMemberRoutes(app, requireAuth);

app.listen(PORT, () => {
  console.log(`GridSpeak app backend listening on http://localhost:${PORT}`);
});
