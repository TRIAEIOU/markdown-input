import type {HtmlExtension} from 'micromark-util-types';

const htmlTag: HtmlExtension = {
  enter: {
    span() {
      this.tag('<del>')
    }
  },
  exit: {
    span() {
      this.tag('</del>')
    }
  }
}

export type {HtmlExtension};
export {htmlTag}