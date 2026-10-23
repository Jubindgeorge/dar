import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { MongoClient } from 'mongodb';
import { z } from 'zod';

const app = express();
const port = Number(process.env.PORT || 4000);
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(v => v.trim()), methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
app.use(express.json({ limit: '20kb' }));
app.use('/api/public/leads', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }));

const leadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(32).regex(/^[+0-9() .-]+$/),
  service: z.enum(['documents', 'visa', 'identity', 'renewals']),
  message: z.string().trim().max(1500).optional().default(''),
  locale: z.enum(['en', 'ar']).default('en'),
  source: z.literal('website').default('website')
});

let client: MongoClient | undefined;
let leads: ReturnType<MongoClient['db']> | undefined;

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'dar-al-shams-marketing-api' }));

app.post('/api/public/leads', async (req, res) => {
  const parsed = leadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Please check the enquiry details and try again.' });
  if (!leads) return res.status(503).json({ error: 'Enquiry service is not configured yet.' });

  try {
    const now = new Date();
    const doc = {
      ...parsed.data,
      status: 'new',
      createdAt: now,
      updatedAt: now,
      consentPurpose: 'respond-to-enquiry'
    };
    const result = await leads.collection('leads').insertOne(doc);
    return res.status(201).json({ id: result.insertedId.toString(), status: 'received' });
  } catch (error) {
    console.error('Lead persistence failed:', error instanceof Error ? error.message : 'unknown error');
    return res.status(500).json({ error: 'Unable to save enquiry right now.' });
  }
});

// Admin list/update routes are intentionally not exposed until an approved identity provider,
// role model, audit policy and secure deployment configuration are connected.
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

async function start() {
  const uri = process.env.MONGODB_URI;
  if (uri) {
    client = new MongoClient(uri);
    await client.connect();
    leads = client.db(process.env.MONGODB_DB || 'dar_al_shams_marketing');
    await leads.collection('leads').createIndex({ createdAt: -1 });
    await leads.collection('leads').createIndex({ status: 1, createdAt: -1 });
  } else {
    console.warn('MONGODB_URI missing: public enquiry submissions will return 503 until configured.');
  }
  app.listen(port, () => console.log('Marketing API listening on port ' + port));
}

start().catch(error => {
  console.error('API startup failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await client?.close();
  process.exit(0);
});