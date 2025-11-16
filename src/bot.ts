import { Client, GatewayIntentBits, Events, Partials, Message } from 'discord.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages, // Listen to messages in servers
  ],
  partials: [Partials.Channel], // Needed if messages are uncached
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot is online! Logged in as ${c.user.tag}`);
});

client.on(Events.MessageCreate, async (message: Message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // List of channels the bot should listen to (comma-separated IDs in .env)
  const TARGET_CHANNELS = process.env.TARGET_CHANNELS?.split(',').map(id => id.trim());
  if (!TARGET_CHANNELS || TARGET_CHANNELS.length === 0) {
    console.error('❌ TARGET_CHANNELS is not defined in .env');
    return;
  }

  // Only process messages in the target channels
  if (!TARGET_CHANNELS.includes(message.channel.id)) return;

  // Determine the message content
  let messageContent = message.content;

  // If no text, check for attachments
  if (!messageContent || messageContent.trim() === '') {
    if (message.attachments.size > 0) {
      const urls = [...message.attachments.values()].map(a => a.url);
      messageContent = `[Attachment(s): ${urls.join(', ')}]`;
    } else {
      messageContent = '[No text content]';
    }
  }

  console.log(`📢 Message in target channel from ${message.author.tag}: ${messageContent}`);

  // Send message to n8n webhook
  const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
  if (N8N_WEBHOOK_URL) {
    try {
      await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'channel_message',
          userId: message.author.id,
          message: messageContent,
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
