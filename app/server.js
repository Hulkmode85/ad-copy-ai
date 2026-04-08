const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname)));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post('/api/generate', async (req, res) => {
    try {
        const { platforms, productName, productDesc, audience, goal, tone, offer } = req.body;

        const platformList = platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');

        const prompt = `You are a world-class advertising copywriter who has written campaigns for top DTC brands. Generate 5 high-converting ad variations.

PRODUCT: ${productName}
DESCRIPTION: ${productDesc}
TARGET AUDIENCE: ${audience || 'General'}
CAMPAIGN GOAL: ${goal}
TONE: ${tone}
PLATFORMS: ${platformList}
${offer ? `SPECIAL OFFER: ${offer}` : ''}

Platform-specific rules:
- Facebook: Primary text (125 chars ideal, 255 max), headline (40 chars), description (30 chars)
- Google Ads: Headline (30 chars x3), description (90 chars x2)
- Instagram: Caption (125 chars before "more"), punchy and visual
- TikTok: Hook in first 3 seconds, casual/native feel, trending language

Return a JSON object:
{
  "ads": [
    {
      "platform": "platform name",
      "headline": "attention-grabbing headline",
      "body": "compelling ad copy that drives action",
      "cta": "specific call-to-action button text"
    }
  ],
  "abTestSuggestions": "Detailed A/B testing recommendations: which ads to test against each other, what variables to isolate (headline vs body vs CTA), expected performance differences, and how to iterate based on results."
}

Generate exactly 5 ads. If multiple platforms selected, distribute across them. Each ad should use a different angle/hook (pain point, benefit, social proof, urgency, curiosity). Make the copy specific, not generic.

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks.`;

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 3000,
            messages: [{ role: 'user', content: prompt }]
        });

        const text = message.content[0].text;
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { ads: [], abTestSuggestions: '' };
        }

        res.json(parsed);
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ error: 'Failed to generate ad copy. Please try again.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AdBlitz AI running on port ${PORT}`));
