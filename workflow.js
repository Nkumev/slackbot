import pkg, { WorkflowStep } from "@slack/bolt";
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

// workflow instance created.
const ws = new WorkflowStep("add_step", {
  edit: async ({ ack, step, configure }) => {},
  save: async ({ ack, step, update }) => {},
  execute: async ({ step, complete, fail }) => {},
});

app.step(ws);

try {
  await app.start(process.env.PORT1 || 4000);
  console.log(`App running on ${process.env.PORT1}`);
} catch (e) {
  console.error("App failed");
  console.error(e);
}



const launcher = new WorkflowStep("launcher", {
    edit: async ({ ack, step, configure }) => {
      await ack();
      console.log(step);
      const workId = step.workflow_id;
      const { title, workspace, channel, message } = step.inputs;
      const blocks = [
        {
          type: "input",
          block_id: "title_input",
          element: {
            type: "plain_text_input",
            action_id: "title",
            placeholder: {
              type: "plain_text",
              text: title ? title.value : "Title",
            },
          },
          label: {
            type: "plain_text",
            text: "Title",
          },
        },
        {
          type: "input",
          block_id: "workspace_input",
          element: {
            type: "plain_text_input",
            action_id: "workspace",
            placeholder: {
              type: "plain_text",
              text: workspace ? workspace.value : "Name of workspace",
            },
          },
          label: {
            type: "plain_text",
            text: "Workspace",
          },
        },
        {
          type: "input",
          block_id: "channel_input",
          element: {
            type: "plain_text_input",
            action_id: "channel_name",
            placeholder: {
              type: "plain_text",
              text: channel ? channel.value : "Select broadcast channel",
            },
          },
          label: {
            type: "plain_text",
            text: "Channel name",
          },
        },
        {
          type: "input",
          block_id: "message_input",
          element: {
            type: "plain_text_input",
            action_id: "message_input",
            placeholder: {
              type: "plain_text",
              text: message ? message.value : "Broadcast message",
            },
          },
          label: {
            type: "plain_text",
            text: "Broadcast message",
          },
        },
      ];
      await configure({ blocks });
    },
    save: async ({ ack, step, view, update }) => {
      await ack();
      console.log(step);
      const workId = step.workflow_id;
      const { values } = view.state;
      const title = values.title_input.title;
      const workspace = values.workspace_input.workspace;
      const channel = values.channel_input.channel_name;
      const message = values.message_input.message_input;
      const channelId = await findTeamChannel(channel.value, workspace.value);
      const inputs = {
        title: { value: title.value },
        workspace: { value: workspace.value },
        channel: { value: channel.value },
        message: { value: message.value },
      };
      // Save step configuration
      if (channelId) {
        flow[workId] = {
          channelId,
        };
        await update({ inputs });
      }
    },
    execute: async ({ step, complete, fail, client, body, context }) => {
      try {
        console.log(step);
        console.log(context);
        const { title, workspace, channel, message } = step.inputs;
        const channelId = await findTeamChannel(channel.value, workspace.value);
        if (!channelId) {
          console.error("Channel not found");
          await fail();
          return;
        }
        const formattedMessage = `*${title.value}*\n${message.value}`;
        await client.chat.postMessage({
          token: process.env.SLACK_BOT_TOKEN,
          channel: channelId,
          text: formattedMessage,
        });
        await complete();
      } catch (error) {
        console.error("Error executing step:", error);
        await fail();
      }
    },
  });

  const questioning = new WorkflowStep("ask_question", {
    edit: async ({ ack, step, configure }) => {
      await ack();
      console.log(step);
      const workId = step.workflow_id;
      const { question } = step.inputs;
      const blocks = [
        {
          type: "input",
          block_id: "question_input",
          element: {
            type: "plain_text_input",
            action_id: "question",
            placeholder: {
              type: "plain_text",
              text: question ? question.value : "Enter a qestion",
            },
          },
          label: {
            type: "plain_text",
            text: "Question",
          },
        },
      ];
      await configure({ blocks });
    },
    save: async ({ ack, step, view, update }) => {
      await ack();
      console.log(step);
      const { values } = view.state;
      const question = values.question_input.question;
      const inputs = {
        question: { value: question.value },
      };
      const workId = step.workflow_id;
      if (flow[workId]) {
        flow[workId][question.value] = question.value;
        await update({ inputs });
      }
    },
    execute: async ({ step, complete, fail, client, body, context }) => {
      const workId = step.workflow_id;
      const question = step.inputs.question.value;
      const users = await prisma.user.findMany();
      const calls = users.map(async (user) => {
        await app.client.chat.postMessage({
          channel: user.slackId,
          team: user.teamId,
          text: question,
        });
      });
      await Promise.all(calls);
      client.on("message", async (message) => {
        console.log(message);
        complete();
      });
    },
  });

  app.step(launcher);
  app.step(questioning);