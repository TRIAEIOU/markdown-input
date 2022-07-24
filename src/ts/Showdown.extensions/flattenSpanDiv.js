/**
 * Flatten <div> and <span>
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
  
    // Implement and register
    showdown.extension('flattenSpanDiv', function() {
      'use strict';
      return {
        type: 'listener',
        listeners: {
          "makeMarkdown.node.unhandled": (evt) => {
            if (['SPAN', 'DIV'].includes(evt.node.nodeName.toUpperCase())) {
              let txt = '';
              evt.node?.childNodes.forEach(nd => {
                txt += showdown.subParser('makeMarkdown.node')(nd, evt.globals, false)
              });
              return txt;
            }
            evt.output = null;
            return evt;
          }
        }
      };
    });
  }));