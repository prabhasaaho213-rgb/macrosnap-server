const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `You are a professional Indian nutritionist. Analyze this food photo and return ONLY valid JSON with these fields:
{
  "meal_name": "short meal name in English",
  "calories": total calories as integer,
  "protein_g": protein in grams as number,
  "carbs_g": carbohydrates in grams as number,
  "fats_g": fat in grams as number,
  "fiber_g": fiber in grams as number,
  "confidence": estimated accuracy between 0 and 1,
  "description": "brief description of what was detected, include portion estimates"
}
Use Indian food composition data. Return ONLY raw JSON. No markdown. No backticks.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: req.file.mimetype, data: req.file.buffer.toString('base64') } },
    ]);

    const text = result.response.text().trim();
    const cleaned = text.replace(/```json?/g, '').replace(/```/g, '').trim();
    const json = JSON.parse(cleaned.substring(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1));
    res.json(json);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`MacroSnap server on port ${port}`));
