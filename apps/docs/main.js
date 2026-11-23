/** Docs UX: copy buttons + active TOC highlight. */

document.querySelectorAll("pre").forEach((pre) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "copy-btn";
  btn.textContent = "Copy";
  btn.addEventListener("click", async () => {
    const text = pre.querySelector("code")?.textContent ?? pre.textContent;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "Copied";
      setTimeout(() => {
        btn.textContent = "Copy";
      }, 1400);
    } catch {
      btn.textContent = "Failed";
      setTimeout(() => {
        btn.textContent = "Copy";
      }, 1400);
    }
  });
  pre.appendChild(btn);
});

const tocLinks = [...document.querySelectorAll(".toc a[href^='#']")];
const sections = tocLinks
  .map((a) => document.querySelector(a.getAttribute("href")))
  .filter(Boolean);

const setActive = () => {
  let current = sections[0];
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= 120) current = section;
  }
  tocLinks.forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === `#${current.id}`);
  });
};

window.addEventListener("scroll", setActive, { passive: true });
setActive();
