/** A finite recorded-step player. Timers have one owner; every control keeps exactly one playback glyph visible. */
export class Player {
  constructor(icon) {
    this.icon = icon; this.index = 0; this.speed = 1; this.playing = false; this.timer = null;
    this.$ = id => document.getElementById(id);
    // Recompute the focus ring after the hidden player appears, viewport changes or a column resizes.
    this.focusObserver = new ResizeObserver(() => this.focus());
    this.focusObserver.observe(this.$("stage"));
    this.$("prev").onclick = () => this.jump(this.index - 1);
    this.$("next").onclick = () => this.jump(this.index + 1);
    this.$("play").onclick = () => this.toggle();
    this.$("plain").onclick = () => {
      const plain = this.$("plain").getAttribute("aria-pressed") !== "true";
      this.$("plain").setAttribute("aria-pressed", String(plain));
      this.$("stage").classList.toggle("plain", plain);
    };
    this.bindSpeed();
    document.addEventListener("keydown", event => {
      if (!this.steps || event.target.closest("input, select, textarea") || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault(); this.jump(this.index + (event.key === "ArrowLeft" ? -1 : 1));
      } else if (event.code === "Space" && (event.target === document.body || event.target === this.$("player"))) {
        event.preventDefault(); this.toggle();
      }
    });
    document.addEventListener("visibilitychange", () => { if (document.hidden) this.stop(); });
    this.$("frame").onerror = () => {
      this.stop(); const error = this.$("error"); error.hidden = false;
      error.textContent = `FrameLoadError: ${this.steps[this.index].frame}`;
    };
  }
  bindSpeed() {
    const buttons = [...this.$("speed").querySelectorAll('[role="radio"]')];
    const choose = button => {
      this.speed = Number(button.dataset.speed);
      buttons.forEach(radio => { radio.setAttribute("aria-checked", String(radio === button)); radio.tabIndex = radio === button ? 0 : -1; });
      if (this.playing) this.schedule();
    };
    buttons.forEach(button => { button.onclick = () => choose(button); });
    this.$("speed").onkeydown = event => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      const current = buttons.indexOf(document.activeElement);
      const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (current + direction + buttons.length) % buttons.length;
      choose(buttons[next]); buttons[next].focus();
    };
  }
  load(steps) {
    this.stop(); this.steps = steps; this.index = 0;
    this.$("steps").replaceChildren(); this.$("track").replaceChildren();
    steps.forEach((step, index) => {
      const button = document.createElement("button"); button.type = "button";
      button.innerHTML = `<span class="si">${this.icon(step.icon)}</span><span></span>`;
      button.lastElementChild.textContent = step.caption;
      button.onclick = () => this.jump(index);
      const li = document.createElement("li"); li.append(button); this.$("steps").append(li);
      const segment = document.createElement("button"); segment.className = "seg"; segment.type = "button";
      segment.setAttribute("aria-label", `Step ${index + 1}: ${step.caption}`);
      segment.onclick = () => this.jump(index); this.$("track").append(segment);
    });
    this.show();
  }
  show() {
    const step = this.steps[this.index];
    this.$("frame").src = step.frame; this.$("frame").alt = `Full recorded app screen: ${step.caption}`;
    this.$("cap").innerHTML = `${this.icon(step.icon)}<span></span>`;
    this.$("cap").lastElementChild.textContent = `${this.index + 1}/${this.steps.length} · ${step.caption}`;
    this.focus();
    [...this.$("steps").children].forEach((li, n) => li.firstChild.setAttribute("aria-current", String(n === this.index)));
    [...this.$("track").children].forEach((button, n) => { button.classList.toggle("done", n < this.index); button.setAttribute("aria-current", String(n === this.index)); });
    this.$("prev").disabled = this.index === 0; this.$("next").disabled = this.index === this.steps.length - 1;
    this.updateIcon();
  }
  focus() {
    if (!this.steps) return;
    const stage = this.$("stage").getBoundingClientRect();
    if (!stage.width || !stage.height) return;
    const step = this.steps[this.index], f = step.focus, padding = 6;
    Object.assign(this.$("spotlight").style, {
      left: `${stage.width * f.x / step.width - padding}px`, top: `${stage.height * f.y / step.height - padding}px`,
      width: `${stage.width * f.width / step.width + padding * 2}px`, height: `${stage.height * f.height / step.height + padding * 2}px`,
    });
  }
  updateIcon() {
    const glyph = this.playing ? "pause" : this.steps && this.index === this.steps.length - 1 ? "replay" : "play";
    this.$("play").querySelectorAll("[data-play-icon]").forEach(node => { node.hidden = node.dataset.playIcon !== glyph; });
    const label = glyph[0].toUpperCase() + glyph.slice(1);
    this.$("play").setAttribute("aria-label", label); this.$("play").title = label;
    this.$("play").dataset.state = glyph;
  }
  stop() { clearTimeout(this.timer); this.timer = null; this.playing = false; this.updateIcon(); }
  jump(index) { if (!this.steps) return; this.stop(); this.index = Math.max(0, Math.min(index, this.steps.length - 1)); this.show(); }
  toggle() {
    if (!this.steps) return;
    if (this.playing) return this.stop();
    if (this.index === this.steps.length - 1) { this.index = 0; this.show(); }
    this.playing = true; this.updateIcon(); this.schedule();
  }
  schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.index === this.steps.length - 1) return this.stop();
      this.index++; this.show(); this.schedule();
    }, this.steps[this.index].holdMs / this.speed);
  }
}
