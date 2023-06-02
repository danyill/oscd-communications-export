import { msg } from '@lit/localize';
import { html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

/**
 * Format xml string in "pretty print" style and return as a string
 * @param xml - xml document as a string
 * @param tab - character to use as a tab
 * @returns string with pretty print formatting
 */
export function formatXml(xml: string, tab?: string): string {
  let formatted = '';
  let indent = '';

  // eslint-disable-next-line no-param-reassign
  if (!tab) tab = '\t';
  xml.split(/>\s*</).forEach(node => {
    if (node.match(/^\/\w/)) indent = indent.substring(tab!.length);
    formatted += `${indent}<${node}>\r\n`;
    if (node.match(/^<?\w[^>]*[^/]$/)) indent += tab;
  });
  return formatted.substring(1, formatted.length - 3);
}

function cloneAttributes(destElement: Element, sourceElement: Element) {
  let attr;
  const attributes = Array.prototype.slice.call(sourceElement.attributes);
  // eslint-disable-next-line no-cond-assign
  while ((attr = attributes.pop())) {
    destElement.setAttribute(attr.nodeName, attr.nodeValue);
  }
}

/**
 * Take an XMLDocument and pretty-print, format it, attach it to a document link and then download it.
 * @param doc - The XML document
 * @param document - The element to attach to within the DOM
 * @param filename - The filename to produce
 * @returns The blob object that is serialised
 */
export function saveXmlBlob(
  doc: XMLDocument,
  document: Document,
  filename: string
): void {
  const blob = new Blob(
    [formatXml(new XMLSerializer().serializeToString(doc))],
    {
      type: 'application/xml',
    }
  );

  const a = document.createElement('a');
  a.download = filename;
  a.href = URL.createObjectURL(blob);
  a.dataset.downloadurl = ['application/xml', a.download, a.href].join(':');
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
  }, 5000);
}

export default class ExportCommunication extends LitElement {
  /** The document being edited as provided to plugins by [[`OpenSCD`]]. */
  @property({ attribute: false })
  doc!: XMLDocument;

  @property({ attribute: false })
  docName!: string;

  // if an editor plugin
  render() {
    return html`<button @click=${() => this.run()}>
      Export Communications
    </button>`;
  }

  /** Entry point for this plug-in */
  async run(): Promise<void> {
    // create document
    const sclNamespace = 'http://www.iec.ch/61850/2003/SCL';
    const sclDoc = document.implementation.createDocument(
      sclNamespace,
      'SCL',
      null
    );
    const pi = sclDoc.createProcessingInstruction(
      'xml',
      'version="1.0" encoding="UTF-8"'
    );
    sclDoc.insertBefore(pi, sclDoc.firstChild);

    // ensure schema revision and namespace definitions are transferred
    cloneAttributes(sclDoc.documentElement, this.doc.documentElement);

    const communicationSection = this.doc.querySelector(
      ':root > Communication'
    );

    if (communicationSection) {
      const header = this.doc.querySelector(':root > Header')?.cloneNode(true);
      const communication = this.doc
        .querySelector(':root > Communication')
        ?.cloneNode(true);

      if (header) sclDoc.documentElement.appendChild(<Node>header);
      sclDoc.documentElement.appendChild(<Node>communication);

      // TODO: Is this not made available?
      if (!this.docName) this.docName = 'Unknown.scd';
      const ending = this.docName.slice(0, -4);
      let docName = `${this.docName}-Communication.scd`;
      // use filename extension if there seems to be one
      if (ending.slice(0, 1) === '.') {
        docName = `${this.docName.slice(0, -4)}-Communication${ending}`;
      }
      saveXmlBlob(sclDoc, document, docName);
    } else {
      // eslint-disable-next-line no-alert
      alert(`${msg('No communication section found to export')}`);
    }
  }
}
