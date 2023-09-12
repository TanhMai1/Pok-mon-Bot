const { Client, IntentsBitField } = require('discord.js');
const axios = require('axios');
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});
const PREFIX = '!';
const DEFAULT_CAPTURE_CHANCE = 0.05; // Default capture rate when information is unavailable

client.on('ready', () => {
  console.log(`✅ ${client.user.tag} is online.`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) {
    return;
  }

  if (message.content === `${PREFIX}search`) {
    const { name, stats, spriteUrl, captureRate: currentCaptureRate } = await getRandomPokemonWithStatsAndSprite();
    
    // Determine capture rate display
    let captureRateDisplay = currentCaptureRate;
    if (currentCaptureRate === 'Unknown') {
      captureRateDisplay = DEFAULT_CAPTURE_CHANCE;
    }
    
    // Update the global captureRate variable
    captureRate = captureRateDisplay;

    // Check if captureRate is available
    if (captureRateDisplay !== 'Unknown') {
      const statLines = stats.map((stat) => `${stat.name}: ${stat.value}`).join('\n');
      
      // Send the sprite as an attachment
      message.reply({
        content: `You encountered a wild ${name}\nBase Stats:\n${statLines}\nCapture Rate: ${captureRateDisplay}`,
        files: [spriteUrl],
      });
    } else {
      message.reply(`You encountered a wild ${name}\nUnfortunately, we don't have information on the capture rate for this Pokémon.`);
    }
  }

  // Implement the capture system when the user types "!catch"
  if (message.content === `${PREFIX}catch`) {
    console.log(captureRate/1000);
    const success = Math.random() < (captureRate/1000); // Check if the capture attempt is successful
    
    if (success) {
      message.reply('Congratulations! You successfully caught the Pokémon!');
    } else {
      message.reply('Oh no! The Pokémon escaped your capture attempt.');
    }
  }
});

async function getRandomPokemonWithStatsAndSprite() {
  try {
    let randomPokemonId;
    
    // Keep generating a random Pokémon ID until one with a capture rate is found
    do {
      randomPokemonId = Math.floor(Math.random() * 898) + 1;
      
      // Fetch Pokémon data from the details endpoint and species endpoint concurrently
      const [detailsResponse, speciesResponse] = await Promise.all([
        axios.get(`https://pokeapi.co/api/v2/pokemon/${randomPokemonId}`),
        axios.get(`https://pokeapi.co/api/v2/pokemon-species/${randomPokemonId}`),
      ]);

      if (detailsResponse.status === 200 && speciesResponse.status === 200) {
        const pokemonDetails = detailsResponse.data;
        const pokemonSpecies = speciesResponse.data;

        const name = pokemonDetails.name;
        const stats = pokemonDetails.stats.map((stat) => ({
          name: stat.stat.name,
          value: stat.base_stat,
        }));
        const spriteUrl = pokemonDetails.sprites.front_default;
        const captureRate = pokemonSpecies.capture_rate || 'Unknown';

        return { name, stats, spriteUrl, captureRate };
      } else {
        console.error('Failed to fetch Pokémon data.');
        return { name: 'Unknown Pokémon', stats: [], spriteUrl: '', captureRate: 'Unknown' };
      }
    } while (captureRate === 'Unknown');
  } catch (error) {
    console.error('Error:', error);
    return { name: 'Unknown Pokémon', stats: [], spriteUrl: '', captureRate: 'Unknown' };
  }
}

client.login(process.env.TOKEN);
