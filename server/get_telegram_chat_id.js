const token = '8738616524:AAGfG7f5CQ3HGQVplUVEL3tpPcu946loXXc';

async function main() {
  try {
    const url = `https://api.telegram.org/bot${token}/getUpdates`;
    console.log('Fetching updates from url:', url);
    const res = await fetch(url);
    const data = await res.json();
    console.log('Response status:', res.status);
    console.log('Data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error fetching updates:', err);
  }
}

main();
