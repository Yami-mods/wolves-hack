import { IncomingForm } from 'formidable';
import fs from 'fs';
import OpenAI from 'openai';

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const form = new IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Form parse error' });

    try {
      if (fields.type === 'text') {
        const period = fields.value;
        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: `Predict Wingo result for period ${period}. Output either BIG or SMALL.` }],
        });
        const reply = response.choices[0].message.content.trim();
        return res.status(200).json({ prediction: reply });
      }

      if (fields.type === 'image' && files.file) {
        const fileData = fs.createReadStream(files.file[0].filepath);
        const vision = await openai.chat.completions.create({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analyze this Wingo chart and predict the next result (BIG or SMALL).' },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${fs.readFileSync(files.file[0].filepath, 'base64')}` } },
              ],
            },
          ],
        });

        const reply = vision.choices[0].message.content.trim();
        return res.status(200).json({ prediction: reply });
      }

      return res.status(400).json({ error: 'Invalid input' });
    } catch (e) {
      return res.status(500).json({ error: 'OpenAI error', details: e.message });
    }
  });
}
