import { Client, GatewayIntentBits, Partials, Events, Message } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

// --- Initialize Discord client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Needed to read message content
  ],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot is online! Logged in as ${c.user.tag}`);
});

// --- Environment variables ---
const TARGET_CHANNELS = process.env.TARGET_CHANNELS?.split(',').map((id) => id.trim());
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

if (!TARGET_CHANNELS || TARGET_CHANNELS.length === 0) {
  console.error('❌ TARGET_CHANNELS is not defined in .env');
  process.exit(1);
}

if (!N8N_WEBHOOK_URL) {
  console.error('❌ N8N_WEBHOOK_URL is not defined in .env');
  process.exit(1);
}

// --- Helper to send data to webhook ---
async function sendToWebhook(payload: Record<string, any>) {
  try {
    await fetch(N8N_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log('✅ Sent to webhook:', payload);
  } catch (error) {
    console.error('❌ Error sending to webhook:', error);
  }
}

// --- Listen to normal messages ---
client.on(Events.MessageCreate, async (message: Message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  console.log('DEBUG: Received message', {
    author: message.author.tag,
    channelId: message.channel.id,
    content: message.content,
  });

  // Only process messages in target channels
  if (!TARGET_CHANNELS.includes(message.channel.id)) return;

  // Determine message content
  let messageContent = message.content?.trim() || '';

  // If empty, check attachments
  if (!messageContent) {
    if (message.attachments.size > 0) {
      messageContent = `[Attachment(s): ${[...message.attachments.values()].map(a => a.url).join(', ')}]`;
    } else {
      messageContent = '[No text content]';
    }
  }

  console.log(`📢 Message in target channel from ${message.author.tag}: ${messageContent}`);

  await sendToWebhook({
    type: 'channel_message',
    userId: message.author.id,
    message: messageContent,
    channelId: message.channel.id,
      messageId: message.id,
  });
});

// --- Listen to slash commands ---
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.channelId || !TARGET_CHANNELS.includes(interaction.channelId)) return;

  let commandContent = `/${interaction.commandName}`;
  if (interaction.options.data.length > 0) {
    const optionsString = interaction.options.data
      .map((opt) => `${opt.name}: ${opt.value ?? '[empty]'}`)
      .join(', ');
    commandContent += ` ${optionsString}`;
  }

  console.log(`💬 Slash command from ${interaction.user.tag}: ${commandContent}`);

  await sendToWebhook({
    type: 'slash_command',
    userId: interaction.user.id,
    message: commandContent,
    channelId: interaction.channelId,
     interactionId: interaction.id,
  });
});

// --- Login ---
const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('❌ DISCORD_BOT_TOKEN is not defined in .env file');
  process.exit(1);
}

client.login(token);
