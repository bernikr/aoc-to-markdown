// ==UserScript==
// @name         AoC to Markdown
// @updateURL    https://raw.githubusercontent.com/bernikr/aoc-to-markdown/main/aoc-to-markdown.user.js
// @version      1.0.1
// @description  Convert AoC page to Markdown and copy to the clipboard
// @author       bernikr
// @homepageURL  https://github.com/bernikr/aoc-to-markdown
// @include      /^https?:\/\/adventofcode.com\/\d+\/day\/\d+$/
// @grant        none
// @require      https://unpkg.com/turndown@7.1.1/dist/turndown.js#sha256=b7e8f59e7c80aa531f6feaea211e70594ba5dac88696161b4f907a00b5d58fa0
// @require      https://unpkg.com/turndown-plugin-gfm@1.0.2/dist/turndown-plugin-gfm.js#sha256=cf744cc1b7580f06d64ce236a4ff2630a53d389eccf2133a09d71ca443511912
// ==/UserScript==

const descriptionTitle = "Description";
const partOneHeadingTitle = "Part One";

function stripHyphens(str) {
  const regex = /^--- (.+) ---$/;
  return str.replace(regex, (_match, p1) => {
    return p1;
  });
}

function generateMarkdown(doc) {
  const turndownService = new TurndownService({
    headingStyle: "atx",
  });

  // Use GitHub-flavored Markdown since that seems to be pretty feature-filled
  // and generates files that render well on GitHub.
  turndownService.use(turndownPluginGfm.gfm);

  // Special handling for emphasized code blocks.
  //
  // ```html
  // <code><em>1234<em></code>
  // ```
  //
  // The default results in the underscores being rendered within the code
  // block. Since the entire code block should be emphasized a simple solution
  // is to just move the emphasis outside the block which appears to create the
  // correct result (on GitHub at least).
  turndownService.addRule("emphasizedCode", {
    filter: (node) =>
      node.nodeName == "CODE" &&
      node.childNodes.length == 1 &&
      node.firstChild.nodeName == "EM" &&
      node.firstChild.childNodes.length == 1 &&
      node.firstChild.firstChild.nodeType == Node.TEXT_NODE,
    replacement: (_content, node, options) =>
      `${options.emDelimiter}\`${node.innerText}\`${options.emDelimiter}`,
  });

  // Special handling for emphasized text within code blocks.
  //
  // ```html
  // <code>1 + 1 = <em>2</em></code>
  // ```
  //
  // The default rendering results in the underscores being rendered, as there
  // isn't a proper way to render emphasis within code blocks without resorting
  // to HTML again. In this case the best solution is to drop the emphasis
  // completely, rendering the content without any markup.
  //
  // Since the rules are applied in order this should only consider instances
  // where the previous code did not make a modification.
  turndownService.addRule("emphasisWithinCode", {
    filter: (node) =>
      node.nodeName == "EM" &&
      node.parentNode.nodeName == "CODE",
    replacement: (content) => content,
  });

  // Keep the spans which are used for alternate text in the puzzle description.
  turndownService.keep(["span"]);

  // Generate the document and append a newline.
  return turndownService.turndown(doc).concat("\n");
}

function expandHrefs(article) {
  const articleLinks = article.querySelectorAll("a");
  for (const link of articleLinks) {
    if (link.href) {
      // Reading the `href` seems to expand it, setting it back will make it
      // permanent.
      link.href = link.href
    }
  }
}

function capturePage() {
  const newDoc = document.createDocumentFragment();
  const titleElement = document.createElement("h1");
  newDoc.appendChild(titleElement);

  const link = document.createElement("a");
  const href = window.location.origin + window.location.pathname;
  link.href = href;
  link.innerText = href;
  newDoc.appendChild(link);

  const descriptionHeader = document.createElement("h2");
  descriptionHeader.innerText = descriptionTitle;
  newDoc.appendChild(descriptionHeader);

  const articleElements = document.querySelectorAll("article");
  const articleElementsLength = articleElements.length;
  for (let index = 0; index < articleElementsLength; ++index) {
    const article = articleElements[index].cloneNode(true);

    const headingElement = article.querySelector("h2");
    let heading = stripHyphens(headingElement.innerText);

    if (index === 0) {
      titleElement.innerText = heading;
      heading = partOneHeadingTitle;
    }

    const newHeadingElement = document.createElement("h3");
    newHeadingElement.innerText = heading;
    headingElement.replaceWith(newHeadingElement);

    expandHrefs(article);
    newDoc.appendChild(article);
  }

  return generateMarkdown(newDoc);
}

(function() {
    let button = document.createElement("input");
    button.type = "submit";
    button.value = "[copy markdown]";
    button.addEventListener("click", (e)=>{
        navigator.clipboard.writeText(capturePage());
        button.value = "[copied...]";
        setTimeout(()=>{
            button.value = "[copy markdown]";
        }, 1000);
    });
    let main = document.querySelector('main');
    main.insertBefore(button, main.firstChild);
})();
