import pkg from "@slack/bolt";
import dotenv from "dotenv";
import axios from "axios";

const { App } = pkg;

dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_BOT_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

app.command("/hello", async ({ command, ack, say }) => {
  await ack();
  await say(`Hello, <@${command.user_name}>`);
  console.log(`command fired`);
  const data = {
    userId: command.user_id,
    userName: command.user_name,
    message: `Hello, <@${command.user_name}>`,
  };
  try {
    await axios.post(`http://localhost:3200/api/saveData`, data);
    console.log(`data saved successfully`, data);
  } catch (e) {
    console.error(`Error saving data`, e);
  }
});

app.command("/say_name", async ({ command, ack, say }) => {
  await ack();
  const name = command.text;
  await say(`Your name is ${name}`);
  console.log(`hello ${name}`);
});

app.command("/add_numbers", async ({ command, ack, say }) => {
  await ack();
  const numbers = command.text.split(" ");
  const sum = numbers.reduce((curr, num) => parseInt(curr) + parseInt(num), 0);
  await say(`The sum is ${sum}`);
});
app.command("/random_quote", async ({ command, ack, say }) => {
  await ack();
  const response = await fetch("https://type.fit/api/quotes");
  const quotes = await response.json();
  const randomIndex = Math.floor(Math.random() * quotes.length);
  const randomQuote = quotes[randomIndex];
  await say(
    `A random quote by ${randomQuote.author.split(",")[0]} is : "${
      randomQuote.text
    }"`
  );
});

try {
  await app.start(process.env.PORT || 3000);
  console.log("App running");
} catch (e) {
  console.error("App failed");
  console.error(e);
}
