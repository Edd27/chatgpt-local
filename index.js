import { CreateWebWorkerMLCEngine } from "https://esm.run/@mlc-ai/web-llm";
const isDesktop = window.matchMedia("(min-width: 1025px)").matches;
const $ = (element) => document.querySelector(element);
const synth = window.speechSynthesis;
const $body = $("body");
const $form = $("form");
const $input = $("input");
const $template = $("#message-template");
const $messages = $("ul");
const $button = $("button");
const $small = $("small");
const $voices = $("select");
const SELECTED_MODEL = "Llama-3-8B-Instruct-q4f32_1-MLC-1k";
if (isDesktop) {
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
  const voices = synth.getVoices();
  $voices.innerHTML += voices
    .filter((voice) => voice.name.includes("Spanish (Mexico)"))
    .map(
      (voice) =>
        `<option value="${voice.name}">${voice.name
          .split(" - ")[0]
          .replace(/(Microsoft)|(Online)|(\(Natural+\))/gim, "")}</option>`,
    )
    .join("");
  $voices.style.opacity = 100;
  $voices.removeAttribute("disabled");
  const messageContext = {
    role: "system",
    content: `Eres un asistente util, que puede responder cualquier pregunta de cualquier tema que el usuario te consulte.
  * Siempre debes contestar en español Mexico.
  * Para snippets de codigo, no debes especificar el lenguaje de programacion.`,
  };
  let messages = [messageContext];
  $form.addEventListener("submit", async (event) => {
    event.preventDefault();
    synth.cancel();
    $voices.setAttribute("disabled", true);
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
      const textWithCodeSnippet = reply.replace(
        /```(.*?)```/gs,
        (math, p1) => `<pre><code>${p1.trim()}</code></pre>`,
      );
      $botMessage.innerHTML = textWithCodeSnippet;
    }
    messages.push({
      role: "assistant",
      content: reply,
    });
    const utterance = new SpeechSynthesisUtterance(reply);
    const voice = voices.find((voice) => voice.name === $voices.value);
    utterance.voice = voice;
    utterance.pitch = 1.5;
    synth.speak(utterance);
    $button.removeAttribute("disabled");
    $input.removeAttribute("disabled");
    $voices.removeAttribute("disabled");
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
} else {
  $body.innerHTML = `<section class="warning">
  <svg xmlns="http://www.w3.org/2000/svg" width="20%" height="20%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart-crack"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="m12 13-1-1 2-2-3-3 2-2"/></svg>
  <h1>Hola!</h1>
  <p>Estás visitando el sitio web desde un dispositivo móvil.</p>
  <p>Por ahora este chat no esta soportado en dispositivos móviles, para poder acceder al chat, hazlo desde una computadora.</p>
  </section>`;
}
