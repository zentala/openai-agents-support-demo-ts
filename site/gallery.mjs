/** Render the shared recording catalog using only H13's generated semantic sprite, with stable scenario deep links. */
import { Player } from "./player.mjs";
const $ = id => document.getElementById(id);
let vocabulary;
const icon = key => {
  if (!vocabulary.icons[key]) throw new Error(`UnknownIcon: ${key}`);
  return `<svg class="i" data-icon="${key}" aria-hidden="true" focusable="false"><use href="assets/icons.svg#${vocabulary.icons[key].symbol}"></use></svg>`;
};
async function json(file) {
  const response = await fetch(file);
  if (!response.ok) throw new Error(`GalleryLoadHTTP: ${file} (${response.status})`);
  return response.json();
}
function hydrateIcons() {
  document.querySelectorAll("span[data-icon]").forEach(span => { span.innerHTML = icon(span.dataset.icon); });
}
function scenarioButton(scenario, index, select) {
  const button = document.createElement("button"); button.type = "button"; button.className = "it";
  button.dataset.scenario = scenario.id;
  button.innerHTML = `<span class="num">${String(index + 1).padStart(2, "0")}</span><span class="label"></span><span class="k"></span>`;
  button.querySelector(".label").textContent = scenario.title;
  const badge = scenario.badges.includes("AI") ? "AI" : "rule";
  button.lastElementChild.classList.add(badge === "AI" ? "ai" : "rule");
  button.lastElementChild.innerHTML = `${icon(badge === "AI" ? "aiAssistant" : "automaticStep")}${badge}`;
  button.onclick = () => { history.pushState(null, "", `#${scenario.id}`); select(scenario); };
  return button;
}
async function main() {
  const [scenarios, icons] = await Promise.all([json("data/scenarios.json"), json("assets/icons.json")]);
  vocabulary = icons; hydrateIcons();
  const player = new Player(icon);
  const order = ["Human handoff", "Refunds & approvals", "Security & guardrails", "Data collection", "Guest mode", "Orders"];
  const ordered = order.flatMap(category => scenarios.filter(s => s.category === category));
  function select(scenario) {
    $("title").textContent = scenario.title; $("lead").textContent = scenario.lead; $("why").textContent = scenario.why;
    $("crumb").innerHTML = `${icon(scenario.icon)}<span></span>`;
    $("crumb").lastElementChild.textContent = `${scenario.category} · ${String(ordered.indexOf(scenario) + 1).padStart(2, "0")}`;
    $("meta").innerHTML = `<span>${icon("steps")}${scenario.steps.length} steps</span><span>${icon(scenario.badges.includes("AI") ? "aiAssistant" : "automaticStep")}${scenario.badges.includes("AI") ? "AI recording" : "Rule in code"}</span>`;
    const shows = document.createElement("span"); shows.innerHTML = icon("shows");
    shows.append(document.createTextNode(`Shows: ${scenario.shows.join(", ")}`)); $("meta").append(shows);
    document.querySelectorAll("[data-scenario]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.scenario === scenario.id)));
    $("error").hidden = true; player.load(scenario.steps);
    document.title = `${scenario.title} · Nordic Home scenarios`;
  }
  for (const category of order) {
    const entries = ordered.filter(s => s.category === category);
    if (!entries.length) continue;
    const group = document.createElement("section"); group.className = "group";
    const heading = document.createElement("h3"); heading.className = "gh";
    heading.innerHTML = `<span class="gi">${icon(entries[0].icon)}</span><span></span><span class="n">${entries.length}</span>`;
    heading.children[1].textContent = category; group.append(heading);
    entries.forEach(scenario => group.append(scenarioButton(scenario, ordered.indexOf(scenario), select)));
    $("scenarios").append(group);
  }
  const fromHash = () => scenarios.find(s => `#${s.id}` === location.hash);
  select(fromHash() ?? scenarios.find(s => s.id === "human-request") ?? ordered[0]);
  window.addEventListener("hashchange", () => { const scenario = fromHash(); if (scenario) select(scenario); });
  window.addEventListener("popstate", () => { const scenario = fromHash(); if (scenario) select(scenario); });
  $("loaded").hidden = false;
}
main().catch(error => { $("error").hidden = false; $("error").textContent = `${error.name}: ${error.message}`; $("lead").textContent = "The recordings could not be loaded. Reload to try again."; });
