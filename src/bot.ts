import { Client, GatewayIntentBits, Partials, Events, Message, CommandInteraction } from 'discord.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages, // Listen to normal messages
  ],
  partials: [Partials.Channel], // Needed for uncached messages in channels
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot is online! Logged in as ${c.user.tag}`);
});

// --- Listen to normal messages ---
client.on(Events.MessageCreate, async (message: Message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  const TARGET_CHANNELS = process.env.TARGET_CHANNELS?.split(',').map(id => id.trim());
  if (!TARGET_CHANNELS || TARGET_CHANNELS.length === 0) {
    console.error('❌ TARGET_CHANNELS is not defined in .env');
    return;
  }

  // Only process messages in target channels
  if (!TARGET_CHANNELS.includes(message.channel.id)) return;

  // Determine message content
  let messageContent = message.content;
  if (!messageContent || messageContent.trim() === '') {
    if (message.attachments.size > 0) {
      const urls = [...message.attachments.values()].map(a => a.url);
      messageContent = `[Attachment(s): ${urls.join(', ')}]`;
    } else {
      messageContent = '[No text content]';
    }
  }

  console.log(`📢 Message in target channel from ${message.author.tag}: ${messageContent}`);

  // Send to n8n webhook
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
  }
});

// --- Listen to slash commands ---
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return; // Only handle slash commands

  const TARGET_CHANNELS = process.env.TARGET_CHANNELS?.split(',').map(id => id.trim());
  if (!TARGET_CHANNELS || !interaction.channelId || !TARGET_CHANNELS.includes(interaction.channelId)) return;

  console.log(`💬 Slash command received: /${interaction.commandName} from ${interaction.user.tag}`);

  const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
  if (N8N_WEBHOOK_URL) {
    try {
      await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'slash_command',
          userId: interaction.user.id,
          command: interaction.commandName,
          options: interaction.options.data, // Arguments passed to the command
          channelId: interaction.channelId,
        }),
      });
      console.log('✅ Slash command sent to webhook');
    } catch (error) {
      console.error('❌ Error sending slash command to webhook:', error);
    }
  }
});

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('❌ DISCORD_BOT_TOKEN is not defined in .env file');
  process.exit(1);
}

client.login(token);
