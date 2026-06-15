const fs = require('fs');
const dotenv = require('dotenv');

// Load env
dotenv.config();

const apiKey = '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';
console.log('Using API Key:', apiKey.substring(0, 15) + '...');

const models = [
  'stepfun-ai/step-3.7-flash',
  'meta/llama-3.1-70b-instruct',
  'nvidia/llama-3.1-nemotron-51b-instruct',
  'meta/llama-3.1-8b-instruct',
  'meta/llama-3.1-405b-instruct',
  'mistralai/mistral-large-2-instruct'
];

async function testModel(model) {
  try {
    console.log(`Testing model: ${model}...`);
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'Say hello in one word.' }],
        temperature: 0.2,
        max_tokens: 10
      })
    });
    
    const data = await response.json();
    console.log(`Model ${model} status: ${response.status}`);
    if (response.ok) {
      console.log(`Response: ${data.choices?.[0]?.message?.content?.trim()}`);
      return true;
    } else {
      console.log(`Error: ${JSON.stringify(data.error || data)}`);
      return false;
    }
  } catch (err) {
    console.error(`Exception testing ${model}:`, err.message);
    return false;
  }
}

async function main() {
  for (const model of models) {
    await testModel(model);
    console.log('------------------------------------');
  }
}

main();
