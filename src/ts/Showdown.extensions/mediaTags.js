/**
 * Keep <audio> & <video> tags as is
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
    showdown.extension('mediaTags', function() {
      'use strict';
      return {
        type: 'listener',
        listeners: {
          "makeMarkdown.node.unhandled": (evt) => {
            if (!['AUDIO', 'VIDEO'].includes(evt.node.nodeName.toUpperCase())) {
              evt.output = null;
              return evt;
            }
            return evt.node.outerHTML.trim();
          }
        }
      };
    });
  }));