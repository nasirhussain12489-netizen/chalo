import type { Request, Response } from 'express';
import { app } from '../server.ts';

export default function handler(req: Request, res: Response) {
  if (req.query?.path && typeof req.query.path === 'string') {
    const targetPath = req.query.path.startsWith('/')
      ? req.query.path
      : `/${req.query.path}`;
    delete req.query.path;
    req.url = targetPath;
  }
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/uploads') && !req.url.startsWith('/assets')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  return app(req, res);
}
