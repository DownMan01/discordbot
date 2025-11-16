import { Client, GatewayIntentBits, Events, Partials, Message } from 'discord.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages, // Only need guild messages
  ],
  partials: [Partials.Channel], // Needed if messages are uncached
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot is online! Logged in as ${c.user.tag}`);
});

client.on(Events.MessageCreate, async (message: Message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Only listen to a specific channel
  const TARGET_CHANNEL_ID = process.env.TARGET_CHANNEL_ID; // Set this in your .env
  if (!TARGET_CHANNEL_ID) {
    console.error('❌ TARGET_CHANNEL_ID is not defined in .env');
    return;
  }

  if (message.channel.id !== TARGET_CHANNEL_ID) return;

  console.log(`📢 Message in target channel from ${message.author.tag}: ${message.content}`);

  const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
  if (N8N_WEBHOOK_URL) {
    try {
      await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'channel_message',
          userId: message.author.id,
          message: message.content,
          channelId: message.channel.id,
        }),
      });
      console.log('✅ Message sent to webhook');
    } catch (error) {
      console.error('❌ Error sending to webhook:', error);
    }
  } else {
    console.warn('❌ N8N_WEBHOOK_URL is not defined in environment.');
  }
});

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  console.error('❌ Error: DISCORD_BOT_TOKEN is not defined in .env file');
  process.exit(1);
}

client.login(token);
