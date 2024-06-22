import { CreateWebWorkerMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

const $ = (element) => document.querySelector(element);

const $form = $("form");
const $input = $("input");
const $template = $("#message-template");
const $messages = $("ul");
const $container = $("main");
const $button = $("button");
const $small = $("small");

let messages = [];

const SELECTED_MODEL = "Llama-3-8B-Instruct-q4f32_1-MLC-1k";

const engine = await CreateWebWorkerMLCEngine(
  new Worker(new URL("./worker.js", import.meta.url), {
    type: "module",
  }),
  SELECTED_MODEL,
  {
    initProgressCallback: (info) => {
      $small.textContent = info.text;

      if (info.progress === 1) {
        $button.removeAttribute("disabled");
        $input.removeAttribute("disabled");
      }
    },
  },
);

$form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const messageText = $input.value.trim();

  if (messageText === "") return;

  if (messageText !== "") {
    $input.value = "";
  }

  const userMessage = {
    role: "user",
    content: messageText,
  };

  messages.push(userMessage);

  addMessage(messageText, "user");

  $button.setAttribute("disabled", true);
  $input.setAttribute("disabled", true);

  const chunks = await engine.chat.completions.create({
    messages,
    stream: true,
  });

  let reply = "";

  const $botMessage = addMessage("", "bot");

  for await (const chunk of chunks) {
    const [choice] = chunk.choices;
    let content = choice?.delta?.content ?? "";
    reply += content;
    $botMessage.innerHTML = reply.replace(
      /```(.*?)```/gs,
      (math, p1) => `<pre><code>${p1.trim()}</code></pre>`,
    );
  }

  messages.push({
    role: "assistant",
    content: reply,
  });

  $button.removeAttribute("disabled");
  $input.removeAttribute("disabled");
  $messages.scrollTop = $messages.scrollHeight;
});

function addMessage(content, sender) {
  const cloneTemplate = $template.content.cloneNode(true);

  const $newMessage = cloneTemplate.querySelector(".message");

  const $div = $newMessage.querySelector("div");

  $div.innerHTML = content;

  $newMessage.classList.add(sender);

  $messages.appendChild($newMessage);

  $messages.scrollTop = $messages.scrollHeight;

  return $div;
}
