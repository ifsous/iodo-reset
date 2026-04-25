import 'dotenv/config';
import { streamText } from 'ai';

async function main() {
  const apiKey = process.env.AI_GATEWAY_API_KEY;

  if (!apiKey) {
    throw new Error('Missing AI_GATEWAY_API_KEY in .env.local');
  }

  const result = streamText({
    model: 'openai/gpt-5.4',
    prompt: 'Write one sentence about why streaming responses improves UX.',
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }

  process.stdout.write('\n\n');

  const usage = await result.usage;
  console.log('Token usage:', {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
