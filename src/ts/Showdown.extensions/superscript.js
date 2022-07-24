/**
 * makeHtml ^superscript^
 */
(function (extension) {
  'use strict';
  // Boiler plate loader code
  if (typeof showdown !== 'undefined') {
    extension(showdown);
  } else if (typeof define === 'function' && define.amd) {
    define(['showdown'], extension);
  } else if (typeof exports === 'object') {
    module.exports = extension(require('showdown'));
  } else {
    throw Error('Could not find showdown library');
  }

}(function (showdown) {
  'use strict';
  
  /*********************************************************************
   * Parse markdown ^superscript^ to html.
   * @param {Event} evt evt: Recieved Event object
   * @return {Event} Event object with final output
   */
   function markdownSupToHtml(evt) {
    // This solution is not perfect, it eats opening/closing carets that aren't
    // completed within the same block. That needs to be addressed in a block
    // spanning manner which is not worth it given the extremely limited use case.
    evt.output = evt.input.replace(
      /(?<!\\)(?:\\{2})*\^((?:(?<!\\)(?:\\{2})*\\\^|[^^])+)(?<!\\)(?:\\{2})*\^/g,
      '<sup>$1</sup>');
    // Unquote any remaining carets
    evt.output = evt.output.replace(/\\\^/g, '^');
  }

  /*********************************************************************
   * Escape carets when converting HTML to markdown.
   * @param {Event} evt evt: Recieved Event object
   * @return {Event} Event object with final output
   */
  function escapeCarets(evt) {
    evt.output = evt.input.replace(/\^/g, '\\^');
    return evt;
  }

  /*********************************************************************
   * Parse html <sup> to markdown.
   * @param {Event} evt evt: Recieved Event object
   * @return {Event} Event object with final output
   */
  function htmlSupToMarkdown(evt) {
    if (evt.node.nodeName !== 'SUP') {
      evt.output = null;
      return evt;
    }
    let txt = '';
    // resolve children
    evt.node.childNodes.forEach(child => {
      txt += showdown.subParser('makeMarkdown.node')(child, evt.globals, true);
    });

    return `^${txt.trim()}^`
  }

  // Implement and register
  showdown.extension('superscript', function() {
    'use strict';
    return {
      type: 'listener',
      listeners: {
        "makehtml.spanGamut.onEnd": markdownSupToHtml,
        "makeMarkdown.txt.onEnd": escapeCarets,
        "makeMarkdown.node.unhandled": htmlSupToMarkdown
      }
    };
  });
}));