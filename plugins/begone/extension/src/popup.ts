import { getSelectors, setSelectors } from "./storage";

const form = document.querySelector(".popup__form") as HTMLFormElement;
const input = document.querySelector(".popup__input") as HTMLInputElement;
const error = document.querySelector(".popup__error") as HTMLParagraphElement;
const list = document.querySelector(".popup__list") as HTMLUListElement;
const empty = document.querySelector(".popup__empty") as HTMLParagraphElement;

let selectors: string[] = [];

const isValidSelector = (selector: string): boolean => {
  try {
    document.querySelector(selector);
    return true;
  } catch {
    return false;
  }
};

const showError = (message: string) => {
  error.textContent = message;
  error.hidden = false;
};

const clearError = () => {
  error.textContent = "";
  error.hidden = true;
};

const render = () => {
  list.replaceChildren(
    ...selectors.map((selector) => {
      const item = document.createElement("li");
      item.className = "popup__item";

      const code = document.createElement("code");
      code.className = "popup__selector";
      code.textContent = selector;

      const remove = document.createElement("button");
      remove.className = "popup__delete";
      remove.dataset.selector = selector;
      remove.textContent = "×";
      remove.title = "Remove";

      item.append(code, remove);
      return item;
    })
  );
  empty.hidden = selectors.length > 0;
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const selector = input.value.trim();
  if (!selector) return;
  if (selectors.includes(selector)) {
    showError("Selector already in the list.");
    return;
  }
  if (!isValidSelector(selector)) {
    showError("Invalid CSS selector.");
    return;
  }
  selectors = [...selectors, selector];
  await setSelectors(selectors);
  input.value = "";
  clearError();
  render();
});

list.addEventListener("click", async (event) => {
  const button = (event.target as HTMLElement).closest(".popup__delete");
  if (!(button instanceof HTMLElement)) return;
  selectors = selectors.filter((s) => s !== button.dataset.selector);
  await setSelectors(selectors);
  render();
});

getSelectors().then((stored) => {
  selectors = stored;
  render();
});
